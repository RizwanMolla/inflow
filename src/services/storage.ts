import type { Workspace } from '../types/workspace';
import { DEFAULT_WORKSPACES } from '../data/defaults';

const STORAGE_KEY = 'inflow_workspaces_v1';
const ONBOARDED_KEY = 'inflow_onboarded_v1';
const STORE_FILENAME = 'workspaces.json';

// Helper to check if running inside Tauri desktop app
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export class StorageService {
  private static cachedWorkspaces: Workspace[] | null = null;

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

  private static saveToLocalStorage(workspaces: Workspace[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch (err) {
      console.error('Failed to save workspaces to localStorage:', err);
    }
  }

  /**
   * Export all workspaces to downloadable JSON string
   */
  static exportToJson(workspaces: Workspace[]): string {
    return JSON.stringify(workspaces, null, 2);
  }

  /**
   * Import workspaces from JSON string validation
   */
  static importFromJson(jsonString: string): Workspace[] {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid format: Root must be an array of workspaces.');
    }
    for (const ws of parsed) {
      if (!ws.id || !ws.name || !Array.isArray(ws.actions)) {
        throw new Error(`Invalid workspace item: Missing id, name, or actions array.`);
      }
    }
    return parsed;
  }
}
