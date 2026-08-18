import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeckConfig, ConnectionConfig, ConnectionState, ServerStatus } from '../types/deck';

const HOST_STORAGE_KEY = 'inflow_mobile_host_v1';
const DECK_CACHE_KEY = 'inflow_mobile_deck_cache_v1';

export type DeckUpdateListener = (config: DeckConfig) => void;
export type ActiveStateListener = (activeWorkspaceId: string | null) => void;
export type ConnectionStateListener = (state: ConnectionState) => void;

export class ConnectionService {
  private static ws: WebSocket | null = null;
  private static config: ConnectionConfig = { host: '127.0.0.1', port: 8080, autoConnect: true };
  private static connectionState: ConnectionState = 'disconnected';
  private static reconnectTimer: any = null;
  private static pingInterval: any = null;

  private static deckListeners: Set<DeckUpdateListener> = new Set();
  private static activeStateListeners: Set<ActiveStateListener> = new Set();
  private static connectionStateListeners: Set<ConnectionStateListener> = new Set();

  /**
   * Load saved connection settings from AsyncStorage
   */
  static async loadConfig(): Promise<ConnectionConfig> {
    try {
      const stored = await AsyncStorage.getItem(HOST_STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load host config from storage:', e);
    }
    return this.config;
  }

  /**
   * Save connection settings to AsyncStorage
   */
  static async saveConfig(config: ConnectionConfig): Promise<void> {
    this.config = config;
    try {
      await AsyncStorage.setItem(HOST_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save host config to storage:', e);
    }
  }

  /**
   * Parse URI or QR payload (e.g. inflow://192.168.1.10:8080 or JSON)
   */
  static parsePairingPayload(payload: string): { host: string; port: number } | null {
    try {
      // 1. Check if payload is custom scheme: inflow://192.168.1.10:8080
      if (payload.startsWith('inflow://')) {
        const clean = payload.replace('inflow://', '').trim();
        const parts = clean.split(':');
        const host = parts[0];
        const port = parts[1] ? parseInt(parts[1], 10) : 8080;
        return { host, port };
      }

      // 2. Check if payload is http://192.168.1.10:8080
      if (payload.startsWith('http://') || payload.startsWith('https://')) {
        const url = new URL(payload);
        return {
          host: url.hostname,
          port: url.port ? parseInt(url.port, 10) : 8080,
        };
      }

      // 3. Check if payload is JSON: { "host": "...", "port": 8080 }
      const parsed = JSON.parse(payload);
      if (parsed && (parsed.host || parsed.ip)) {
        return {
          host: parsed.host || parsed.ip,
          port: parsed.port ? parseInt(parsed.port, 10) : 8080,
        };
      }
    } catch (e) {
      console.warn('Failed to parse pairing QR payload:', e);
    }
    return null;
  }

  /**
   * Connect to the desktop InFlow Axum server (WebSocket + REST sync)
   */
  static connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setConnectionState('connecting');
    const wsUrl = `ws://${this.config.host}:${this.config.port}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[InFlow Mobile] Connected to PC at ${this.config.host}:${this.config.port}`);
        this.setConnectionState('connected');
        this.fetchDeckConfigRest(); // Initial fetch via REST to guarantee latest layout
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'DECK_CONFIG_UPDATE') {
            if (msg.payload && msg.payload.pages) {
              this.notifyDeckUpdate(msg.payload);
              this.cacheDeckConfig(msg.payload);
            }
          } else if (msg.type === 'CLIENT_CONNECTED') {
            if (msg.payload?.deckConfig && msg.payload.deckConfig.pages) {
              this.notifyDeckUpdate(msg.payload.deckConfig);
              this.cacheDeckConfig(msg.payload.deckConfig);
            }
            if (msg.payload?.activeWorkspaceId !== undefined) {
              this.notifyActiveState(msg.payload.activeWorkspaceId);
            }
          } else if (msg.type === 'ACTIVE_WORKSPACE_CHANGE') {
            const activeId = msg.payload?.activeWorkspaceId || null;
            this.notifyActiveState(activeId);
          }
        } catch (err) {
          console.error('[InFlow Mobile] Error parsing WebSocket message:', err);
        }
      };

      this.ws.onerror = () => {
        // Suppress verbose native event dumps; just update state
        if (this.connectionState !== 'error') {
          this.setConnectionState('error');
        }
      };

      this.ws.onclose = () => {
        this.setConnectionState('disconnected');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };
    } catch {
      this.setConnectionState('error');
      this.scheduleReconnect();
    }
  }

  static disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('disconnected');
  }

  private static scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.connectionState !== 'connected') {
        console.log('[InFlow Mobile] Auto-reconnecting...');
        this.connect();
      }
    }, 4000);
  }

  private static startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 10000);
  }

  private static stopHeartbeat(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  /**
   * Trigger launch on PC via WebSocket with HTTP REST fallback
   */
  static async triggerLaunch(workspaceId: string, actionId?: string): Promise<{ success: boolean; error?: string }> {
    // 1. If WebSocket is active, send over WS
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'TRIGGER_LAUNCH',
          payload: { workspaceId, actionId },
        })
      );
      return { success: true };
    }

    // 2. Fallback to HTTP REST endpoint
    try {
      const res = await fetch(`http://${this.config.host}:${this.config.port}/api/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          action_id: actionId,
        }),
      });

      if (res.ok) {
        return { success: true };
      } else {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || `HTTP error ${res.status}` };
      }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reach PC server' };
    }
  }

  /**
   * Fetch Deck Config from PC REST API
   */
  static async fetchDeckConfigRest(): Promise<DeckConfig | null> {
    try {
      const res = await fetch(`http://${this.config.host}:${this.config.port}/api/deck`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.pages) {
          this.notifyDeckUpdate(data);
          this.cacheDeckConfig(data);
          return data;
        }
      }
    } catch (e) {
      console.warn('[InFlow Mobile] Failed to fetch deck via REST:', e);
    }
    return this.getCachedDeckConfig();
  }

  /**
   * Check connection status via REST ping
   */
  static async testConnection(host: string, port: number): Promise<{ success: boolean; status?: ServerStatus; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`http://${host}:${port}/api/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const status = await res.json();
        return { success: true, status };
      }
      return { success: false, error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Connection timed out' };
    }
  }

  // --- Local Cache ---
  private static async cacheDeckConfig(config: DeckConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(DECK_CACHE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to cache deck config:', e);
    }
  }

  static async getCachedDeckConfig(): Promise<DeckConfig | null> {
    try {
      const stored = await AsyncStorage.getItem(DECK_CACHE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to get cached deck config:', e);
    }
    return null;
  }

  // --- Event Listeners ---
  static onDeckUpdate(listener: DeckUpdateListener): () => void {
    this.deckListeners.add(listener);
    return () => this.deckListeners.delete(listener);
  }

  static onActiveStateChange(listener: ActiveStateListener): () => void {
    this.activeStateListeners.add(listener);
    return () => this.activeStateListeners.delete(listener);
  }

  static onConnectionStateChange(listener: ConnectionStateListener): () => void {
    this.connectionStateListeners.add(listener);
    return () => this.connectionStateListeners.delete(listener);
  }

  private static notifyDeckUpdate(config: DeckConfig) {
    this.deckListeners.forEach((fn) => fn(config));
  }

  private static notifyActiveState(activeId: string | null) {
    this.activeStateListeners.forEach((fn) => fn(activeId));
  }

  private static setConnectionState(state: ConnectionState) {
    this.connectionState = state;
    this.connectionStateListeners.forEach((fn) => fn(state));
  }

  static getConnectionState(): ConnectionState {
    return this.connectionState;
  }
}
