import type { Workspace, DeckConfig } from '../types/workspace';
import { DEFAULT_WORKSPACES } from '../data/defaults';
import { generateDefaultDeckConfig } from '../data/deckDefaults';
import { Native, isTauriEnvironment } from './native';

export { isTauriEnvironment };

const STORAGE_KEY = 'inflow_workspaces_v1';
const DECK_STORAGE_KEY = 'inflow_deck_config_v1';
const ONBOARDED_KEY = 'inflow_onboarded_v1';
const STORE_FILENAME = 'workspaces.json';

async function getStore() {
  const { LazyStore } = await import('@tauri-apps/plugin-store');
  return new LazyStore(STORE_FILENAME);
}

export class StorageService {
  private static cachedWorkspaces: Workspace[] | null = null;
  private static cachedDeckConfig: DeckConfig | null = null;

  static isOnboardingCompleted(): boolean {
    try {
      return localStorage.getItem(ONBOARDED_KEY) === 'true';
    } catch {
      return false;
    }
  }

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
        const store = await getStore();
        const data = await store.get<Workspace[]>('workspaces');
        if (data && Array.isArray(data)) {
          this.cachedWorkspaces = data;
          return data;
        }
        await store.set('workspaces', DEFAULT_WORKSPACES);
        await store.save();
        this.cachedWorkspaces = DEFAULT_WORKSPACES;
        return DEFAULT_WORKSPACES;
      }
    } catch (err) {
      console.warn('Tauri store unavailable or errored, falling back to localStorage:', err);
    }

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
    Native.updateTray(workspaces);

    try {
      if (isTauriEnvironment()) {
        const store = await getStore();
        await store.set('workspaces', workspaces);
        await store.save();
      }
    } catch (err) {
      console.warn('Failed to save to Tauri Store:', err);
    }
  }

  /**
   * Load the deck layout and hand it to the embedded server, which starts empty on every launch.
   */
  static async loadDeckConfig(workspaces: Workspace[]): Promise<DeckConfig> {
    if (this.cachedDeckConfig) {
      return this.cachedDeckConfig;
    }

    let loaded: DeckConfig | null = null;
    try {
      if (isTauriEnvironment()) {
        const store = await getStore();
        const data = await store.get<DeckConfig>('deck_config');
        if (data && data.pages) loaded = data;
      }
    } catch (err) {
      console.warn('Tauri store deck loading error:', err);
    }

    if (!loaded) {
      try {
        const stored = localStorage.getItem(DECK_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.pages) loaded = parsed;
        }
      } catch (err) {
        console.error('Failed to parse localStorage deck config:', err);
      }
    }

    if (loaded) {
      this.cachedDeckConfig = loaded;
      Native.syncDeckConfig(loaded);
      return loaded;
    }

    const initial = generateDefaultDeckConfig(workspaces);
    await this.saveDeckConfig(initial);
    return initial;
  }

  /**
   * Persist the deck layout and push it live to every connected phone.
   */
  static async saveDeckConfig(config: DeckConfig): Promise<void> {
    this.cachedDeckConfig = config;
    try {
      localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save deck config to localStorage:', err);
    }

    Native.syncDeckConfig(config);

    try {
      if (isTauriEnvironment()) {
        const store = await getStore();
        await store.set('deck_config', config);
        await store.save();
      }
    } catch (err) {
      console.warn('Failed to save deck config to Tauri store:', err);
    }
  }

  private static saveToLocalStorage(workspaces: Workspace[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch (err) {
      console.error('Failed to save workspaces to localStorage:', err);
    }
  }

  static exportToJson(workspaces: Workspace[], deckConfig?: DeckConfig): string {
    return JSON.stringify({ app: 'inflow', version: 2, workspaces, deckConfig }, null, 2);
  }

  static importFromJson(jsonString: string): { workspaces: Workspace[]; deckConfig?: DeckConfig } {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      // Legacy format (array of workspaces)
      return { workspaces: parsed };
    }
    if (parsed && Array.isArray(parsed.workspaces)) {
      const deckConfig =
        parsed.deckConfig && Array.isArray(parsed.deckConfig.pages) ? parsed.deckConfig : undefined;
      return { workspaces: parsed.workspaces, deckConfig };
    }
    throw new Error('Invalid format: the file must contain a "workspaces" list.');
  }
}
