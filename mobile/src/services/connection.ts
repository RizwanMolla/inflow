import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DeckConfig,
  DeckSlot,
  ConnectionConfig,
  ConnectionState,
  LaunchResult,
  ServerStatus,
} from '../types/deck';

const HOST_STORAGE_KEY = 'inflow_mobile_host_v1';
const DECK_CACHE_KEY = 'inflow_mobile_deck_cache_v1';

const RECONNECT_MS = 4000;
// When the PC rejects our token there is no point retrying quickly; the user has to re-pair.
const UNPAIRED_RETRY_MS = 15000;
const TRIGGER_TIMEOUT_MS = 2500;

export type DeckUpdateListener = (config: DeckConfig) => void;
export type ActiveStateListener = (activeWorkspaceId: string | null) => void;
export type ConnectionStateListener = (state: ConnectionState) => void;
export type LaunchResultListener = (result: LaunchResult) => void;

/** Accepts "abcd-efgh", "ABCD EFGH" etc. and returns the 8-character token. */
export function normalizeToken(raw: string | undefined | null): string | undefined {
  const clean = (raw || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  return clean || undefined;
}

/** Turns low-level network errors into something a user can act on. */
export function describeNetworkError(e: any): string {
  const raw = String(e?.message || e || '');
  if (e?.name === 'AbortError') return 'Your PC did not respond. Check that InFlow is running and both devices share the same Wi-Fi.';
  if (/cleartext/i.test(raw)) return 'This app build blocks local connections. Install the latest InFlow Companion build.';
  if (/network request failed|failed to fetch|fetch failed|ECONNREFUSED|timed? ?out/i.test(raw)) {
    return 'Could not reach your PC. Check the address, that InFlow is running, and that Windows Firewall allows it on private networks.';
  }
  return raw || 'Could not reach your PC.';
}

export class ConnectionService {
  private static ws: WebSocket | null = null;
  private static config: ConnectionConfig = { host: '127.0.0.1', port: 8080, autoConnect: true };
  private static connectionState: ConnectionState = 'disconnected';
  private static reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private static pingInterval: ReturnType<typeof setInterval> | null = null;

  private static deckListeners: Set<DeckUpdateListener> = new Set();
  private static activeStateListeners: Set<ActiveStateListener> = new Set();
  private static connectionStateListeners: Set<ConnectionStateListener> = new Set();
  private static launchResultListeners: Set<LaunchResultListener> = new Set();

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

  private static baseUrl(host = this.config.host, port = this.config.port): string {
    return `http://${host}:${port}`;
  }

  private static authHeaders(token = this.config.token): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Parse a pairing QR payload. Supports the desktop's JSON payload
   * ({ host, port, token }) plus inflow://host:port?token=… and http:// URLs.
   */
  static parsePairingPayload(payload: string): { host: string; port: number; token?: string } | null {
    const text = payload.trim();
    try {
      // React Native's URL polyfill lacks hostname/searchParams, so parse by hand.
      const url = text.match(/^(?:inflow|https?):\/\/([^/:?#]+)(?::(\d+))?[^?#]*(?:\?([^#]*))?/i);
      if (url) {
        const tokenParam = (url[3] || '')
          .split('&')
          .map((pair) => pair.split('='))
          .find(([key]) => key === 'token')?.[1];
        return {
          host: url[1],
          port: url[2] ? parseInt(url[2], 10) : 8080,
          token: normalizeToken(tokenParam ? decodeURIComponent(tokenParam) : undefined),
        };
      }

      const parsed = JSON.parse(text);
      if (parsed && (parsed.host || parsed.ip)) {
        return {
          host: parsed.host || parsed.ip,
          port: parsed.port ? parseInt(parsed.port, 10) : 8080,
          token: normalizeToken(parsed.token),
        };
      }
    } catch (e) {
      console.warn('Failed to parse pairing QR payload:', e);
    }
    return null;
  }

  /**
   * Connect to the desktop InFlow server (WebSocket for live sync, REST as fallback)
   */
  static connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setConnectionState('connecting');
    const token = this.config.token ? `?token=${encodeURIComponent(this.config.token)}` : '';
    const wsUrl = `ws://${this.config.host}:${this.config.port}/ws${token}`;
    let opened = false;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        opened = true;
        this.setConnectionState('connected');
        this.fetchDeckConfigRest();
        this.startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'DECK_CONFIG_UPDATE':
              if (msg.payload?.pages) {
                this.notifyDeckUpdate(msg.payload);
                this.cacheDeckConfig(msg.payload);
              }
              break;
            case 'CLIENT_CONNECTED':
              if (msg.payload?.deckConfig?.pages) {
                this.notifyDeckUpdate(msg.payload.deckConfig);
                this.cacheDeckConfig(msg.payload.deckConfig);
              }
              if (msg.payload?.activeWorkspaceId !== undefined) {
                this.notifyActiveState(msg.payload.activeWorkspaceId);
              }
              break;
            case 'ACTIVE_WORKSPACE_CHANGE':
              this.notifyActiveState(msg.payload?.activeWorkspaceId || null);
              break;
            case 'LAUNCH_RESULT':
              this.launchResultListeners.forEach((fn) => fn(msg.payload));
              break;
            case 'PAIRING_REVOKED':
              // The PC issued a new pairing code; the server closes this socket right after.
              this.setConnectionState('unpaired');
              break;
          }
        } catch (err) {
          console.error('[InFlow Mobile] Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        if (this.connectionState !== 'error' && this.connectionState !== 'unpaired') {
          this.setConnectionState('error');
        }
      };

      ws.onclose = async () => {
        if (this.ws !== ws) return;
        this.ws = null;
        this.stopHeartbeat();
        // A socket that never opened may have been refused for a bad token; ask the status endpoint.
        const unpaired = this.connectionState === 'unpaired' || (!opened && (await this.isRejectingToken()));
        this.setConnectionState(unpaired ? 'unpaired' : 'disconnected');
        this.scheduleReconnect(unpaired ? UNPAIRED_RETRY_MS : RECONNECT_MS);
      };
    } catch {
      this.setConnectionState('error');
      this.scheduleReconnect(RECONNECT_MS);
    }
  }

  static disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
    }
    this.setConnectionState('disconnected');
  }

  private static async isRejectingToken(): Promise<boolean> {
    const res = await this.testConnection(this.config.host, this.config.port, this.config.token);
    return res.reachable && !res.authorized;
  }

  private static scheduleReconnect(delay: number): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.connectionState !== 'connected') this.connect();
    }, delay);
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
    this.pingInterval = null;
  }

  /**
   * Ask the PC to run a key. The PC looks the key up by slotId in its own deck,
   * so the phone never needs to know what the key actually does.
   */
  static async triggerKey(slot: DeckSlot, pageId: string): Promise<{ success: boolean; error?: string }> {
    const workspaceId = slot.type === 'quick_action' ? slot.targetWorkspaceId : slot.type === 'workspace' ? slot.targetId : undefined;
    const actionId = slot.type === 'quick_action' ? slot.targetId : undefined;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'TRIGGER_LAUNCH',
          payload: { slotId: slot.id, pageId, workspaceId, actionId },
        })
      );
      return { success: true };
    }

    // Bounded so a key on an offline PC fails fast instead of hanging until the OS gives up.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRIGGER_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl()}/api/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ slot_id: slot.id, page_id: pageId, workspace_id: workspaceId, action_id: actionId }),
        signal: controller.signal,
      });
      if (res.ok) return { success: true };
      if (res.status === 401) this.setConnectionState('unpaired');
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `HTTP error ${res.status}` };
    } catch (e: any) {
      return { success: false, error: describeNetworkError(e) };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fetch Deck Config from PC REST API
   */
  static async fetchDeckConfigRest(): Promise<DeckConfig | null> {
    try {
      const res = await fetch(`${this.baseUrl()}/api/deck`, { headers: this.authHeaders() });
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
   * Probe the PC. `reachable` means InFlow answered; `authorized` means the token is accepted.
   */
  static async testConnection(
    host: string,
    port: number,
    token?: string
  ): Promise<{ success: boolean; reachable: boolean; authorized: boolean; status?: ServerStatus; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(`${this.baseUrl(host, port)}/api/status`, {
        signal: controller.signal,
        headers: this.authHeaders(token),
      });
      if (!res.ok) return { success: false, reachable: true, authorized: false, error: `HTTP ${res.status}` };
      const status: ServerStatus = await res.json();
      // Desktop 1.x had no pairing; treat its servers as authorized.
      const authorized = status.auth_required ? !!status.authorized : true;
      return {
        success: authorized,
        reachable: true,
        authorized,
        status,
        error: authorized ? undefined : 'Pairing code was rejected. Scan the QR code again.',
      };
    } catch (e: any) {
      return { success: false, reachable: false, authorized: false, error: describeNetworkError(e) };
    } finally {
      clearTimeout(timeout);
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

  static onLaunchResult(listener: LaunchResultListener): () => void {
    this.launchResultListeners.add(listener);
    return () => this.launchResultListeners.delete(listener);
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
