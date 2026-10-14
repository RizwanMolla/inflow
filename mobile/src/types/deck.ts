// Mirrors src/types/workspace.ts in the desktop app; keep the two in sync.
export type ActionType = 'url' | 'folder' | 'file' | 'app' | 'command' | 'hotkey' | 'text' | 'media' | 'delay';
export type AccentColor = 'blue' | 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan' | 'slate';
export type GridDimension = '2x3' | '2x4' | '3x4' | '3x5' | '3x6';

/**
 * workspace / quick_action / custom — run on the PC when pressed
 * folder                            — opens the nested page in targetId
 * back                              — returns to the parent page
 */
export type DeckItemType = 'workspace' | 'quick_action' | 'custom' | 'folder' | 'back' | 'empty';

export interface DeckAction {
  id: string;
  type: ActionType;
  label: string;
  target: string;
}

export interface DeckSlot {
  id: string;
  type: DeckItemType;
  targetId?: string;
  targetWorkspaceId?: string;
  action?: DeckAction;
  label: string;
  icon: string;
  accentColor?: AccentColor;
}

export interface DeckPage {
  id: string;
  title: string;
  slots: DeckSlot[];
  /** Set for folder pages, which are only reachable through a folder key. */
  parentId?: string;
}

export interface DeckConfig {
  version: number;
  gridDimension: GridDimension;
  activePageId: string;
  pages: DeckPage[];
  updatedAt: string;
}

export interface ServerStatus {
  server_version?: string;
  connected_clients?: number;
  auth_required?: boolean;
  authorized?: boolean;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  autoConnect: boolean;
  /** Pairing token from the desktop QR code; required by InFlow desktop 2.x. */
  token?: string;
}

/** `unpaired` means the PC is reachable but rejected our pairing token. */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'unpaired';

export interface LaunchResult {
  slotId?: string | null;
  workspaceId?: string | null;
  success: boolean;
  message?: string | null;
}
