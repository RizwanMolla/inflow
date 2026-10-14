import type { DeckConfig, ServerStatus, TriggerSource, Workspace } from '../types/workspace';

/**
 * Thin wrappers around the Tauri commands exposed by src-tauri/src/lib.rs.
 * Every function is a safe no-op (or returns null) in the browser simulator.
 */

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return await tauriInvoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[InFlow] ${cmd} failed:`, err);
    throw err;
  }
}

async function invokeQuiet<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    return await invoke<T>(cmd, args);
  } catch {
    return null;
  }
}

export interface ConnectionInfo {
  ip: string;
  port: number;
  mdnsService: string;
  token: string;
}

export interface RemoteTrigger {
  workspaceId?: string | null;
  actionId?: string | null;
  slotId?: string | null;
  pageId?: string | null;
  source: TriggerSource;
}

export const Native = {
  getConnectionInfo: () => invokeQuiet<ConnectionInfo>('get_server_connection_info'),

  getServerStatus: () => invokeQuiet<ServerStatus>('get_server_status'),

  regeneratePairingToken: () => invokeQuiet<string>('regenerate_pairing_token'),

  syncDeckConfig: (config: DeckConfig) => invokeQuiet<void>('sync_deck_config', { config }),

  reportLaunchResult: (result: {
    slotId?: string | null;
    workspaceId?: string | null;
    success: boolean;
    message?: string;
  }) =>
    invokeQuiet<void>('report_launch_result', {
      slotId: result.slotId ?? null,
      workspaceId: result.workspaceId ?? null,
      success: result.success,
      message: result.message ?? null,
    }),

  updateTray: (workspaces: Workspace[]) =>
    invokeQuiet<void>('update_tray_workspaces', {
      workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
    }),

  /** Throws with the backend's error message so callers can surface it. */
  runNativeAction: (kind: 'hotkey' | 'text' | 'media' | 'command', payload: string) =>
    invoke<void>('run_native_action', { kind, payload }),

  /** Native yes/no dialog in the desktop app; window.confirm in the browser. */
  async confirm(message: string, title = 'InFlow', destructive = true): Promise<boolean> {
    if (isTauriEnvironment()) {
      try {
        const { ask } = await import('@tauri-apps/plugin-dialog');
        return await ask(message, { title, kind: destructive ? 'warning' : 'info' });
      } catch {
        // fall back to the webview dialog
      }
    }
    return window.confirm(message);
  },

  /** Subscribes to a backend event; resolves to an unsubscribe function. */
  async listen<T>(event: string, handler: (payload: T) => void): Promise<() => void> {
    if (!isTauriEnvironment()) return () => {};
    const { listen } = await import('@tauri-apps/api/event');
    return listen<T>(event, (e) => handler(e.payload));
  },
};
