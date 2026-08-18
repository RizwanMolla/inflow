import type { Workspace, DeckConfig, ServerStatus } from '../types/workspace';
import { DEFAULT_WORKSPACES } from '../data/defaults';
import { generateDefaultDeckConfig } from '../data/deckDefaults';

const STORAGE_KEY = 'inflow_workspaces_v1';
const DECK_STORAGE_KEY = 'inflow_deck_config_v1';
const ONBOARDED_KEY = 'inflow_onboarded_v1';
const STORE_FILENAME = 'workspaces.json';

// Helper to check if running inside Tauri desktop app
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export class StorageService {
  private static cachedWorkspaces: Workspace[] | null = null;
  private static cachedDeckConfig: DeckConfig | null = null;

  /**
   * Check if onboarding has been completed
   */
  static isOnboardingCompleted(): boolean {
    try {
      return localStorage.getItem(ONBOARDED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  static setOnboardingCompleted(completed = true): void {
    try {
      localStorage.setItem(ONBOARDED_KEY, completed ? 'true' : 'false');
    } catch (err) {
      console.warn('Failed to store onboarding flag:', err);
    }
  }

  /**
   * Load workspaces from Tauri store or localStorage fallback
   */
  static async loadWorkspaces(): Promise<Workspace[]> {
    if (this.cachedWorkspaces) {
      return this.cachedWorkspaces;
    }

    try {
      if (isTauriEnvironment()) {
        const { LazyStore } = await import('@tauri-apps/plugin-store');
        const store = new LazyStore(STORE_FILENAME);
        const data = await store.get<Workspace[]>('workspaces');
        if (data && Array.isArray(data)) {
          this.cachedWorkspaces = data;
          return data;
        } else {
          // Initialize store with defaults
          await store.set('workspaces', DEFAULT_WORKSPACES);
          await store.save();
          this.cachedWorkspaces = DEFAULT_WORKSPACES;
          return DEFAULT_WORKSPACES;
        }
      }
    } catch (err) {
      console.warn('Tauri store unavailable or errored, falling back to localStorage:', err);
    }

    // Web / LocalStorage fallback
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.cachedWorkspaces = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to parse localStorage workspaces:', err);
    }

    // Default initialization
    this.cachedWorkspaces = DEFAULT_WORKSPACES;
    this.saveToLocalStorage(DEFAULT_WORKSPACES);
    return DEFAULT_WORKSPACES;
  }

  /**
   * Persist workspaces synchronously to memory and asynchronously to disk/storage
   */
  static async saveWorkspaces(workspaces: Workspace[]): Promise<void> {
    this.cachedWorkspaces = workspaces;
    this.saveToLocalStorage(workspaces);

    try {
      if (isTauriEnvironment()) {
        const { LazyStore } = await import('@tauri-apps/plugin-store');
        const store = new LazyStore(STORE_FILENAME);
        await store.set('workspaces', workspaces);
        await store.save();
      }
    } catch (err) {
      console.warn('Failed to save to Tauri Store:', err);
    }
  }

  /**
   * Load Mobile Deck Configuration
   */
  static async loadDeckConfig(workspaces: Workspace[]): Promise<DeckConfig> {
    if (this.cachedDeckConfig) {
      return this.cachedDeckConfig;
    }

    try {
      if (isTauriEnvironment()) {
        const { LazyStore } = await import('@tauri-apps/plugin-store');
        const store = new LazyStore(STORE_FILENAME);
        const data = await store.get<DeckConfig>('deck_config');
        if (data && data.pages) {
          this.cachedDeckConfig = data;
          return data;
        }
      }
    } catch (err) {
      console.warn('Tauri store deck loading error:', err);
    }

    // LocalStorage fallback
    try {
      const stored = localStorage.getItem(DECK_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.pages) {
          this.cachedDeckConfig = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to parse localStorage deck config:', err);
    }

    const initial = generateDefaultDeckConfig(workspaces);
    this.cachedDeckConfig = initial;
    await this.saveDeckConfig(initial);
    return initial;
  }

  /**
   * Persist Mobile Deck Configuration & Push to Embedded Server
   */
  static async saveDeckConfig(config: DeckConfig): Promise<void> {
    this.cachedDeckConfig = config;
    try {
      localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save deck config to localStorage:', err);
    }

    try {
      if (isTauriEnvironment()) {
        const { LazyStore } = await import('@tauri-apps/plugin-store');
        const store = new LazyStore(STORE_FILENAME);
        await store.set('deck_config', config);
        await store.save();
      }
    } catch (err) {
      console.warn('Failed to save deck config to Tauri store:', err);
    }

    // Sync with embedded Rust server HTTP endpoint to trigger WebSocket live broadcast
    try {
      await fetch('http://127.0.0.1:8080/api/deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }).catch(() => {
        // Silently ignore if server is starting or running in web mode
      });
    } catch {
      // Ignore network sync errors
    }
  }

  /**
   * Fetch local server connection parameters (IP, Port)
   */
  static async getServerConnectionInfo(): Promise<{ ip: string; port: number; mdnsService: string }> {
    if (isTauriEnvironment()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<{ ip: string; port: number; mdnsService: string }>('get_server_connection_info');
        if (res && res.ip) return res;
      } catch (err) {
        console.warn('Failed to invoke get_server_connection_info:', err);
      }
    }

    // Web mode / fallback
    return {
      ip: window.location.hostname || '127.0.0.1',
      port: 8080,
      mdnsService: '_inflow._tcp.local.',
    };
  }

  /**
   * Fetch live server status and connected clients
   */
  static async getServerStatus(): Promise<ServerStatus | null> {
    try {
      const res = await fetch('http://127.0.0.1:8080/api/status', { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return {
          ip: data.ip || '127.0.0.1',
          port: data.port || 8080,
          connectedClients: data.connected_clients || 0,
          activeWorkspaceId: data.active_workspace_id || null,
          serverVersion: data.server_version || '1.0.0',
        };
      }
    } catch {
      // Server offline or running in browser simulator
    }
    return null;
  }

  private static saveToLocalStorage(workspaces: Workspace[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch (err) {
      console.error('Failed to save workspaces to localStorage:', err);
    }
  }

  /**
   * Export all workspaces and deck configs to downloadable JSON string
   */
  static exportToJson(workspaces: Workspace[], deckConfig?: DeckConfig): string {
    return JSON.stringify({ workspaces, deckConfig }, null, 2);
  }

  /**
   * Import workspaces from JSON string validation
   */
  static importFromJson(jsonString: string): { workspaces: Workspace[]; deckConfig?: DeckConfig } {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      // Legacy format (array of workspaces)
      return { workspaces: parsed };
    }
    if (parsed && Array.isArray(parsed.workspaces)) {
      return {
        workspaces: parsed.workspaces,
        deckConfig: parsed.deckConfig,
      };
    }
    throw new Error('Invalid format: Must contain workspaces list.');
  }
}
