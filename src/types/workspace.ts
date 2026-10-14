/**
 * url/folder/file/app  — opened through the OS shell
 * command              — shell command spawned in the background
 * hotkey/text/media    — simulated keyboard input on the PC
 * delay                — pause between steps of a multi-action
 */
export type ActionType =
  | 'url'
  | 'folder'
  | 'file'
  | 'app'
  | 'command'
  | 'hotkey'
  | 'text'
  | 'media'
  | 'delay';

export type MediaKey =
  | 'play_pause'
  | 'next_track'
  | 'prev_track'
  | 'stop'
  | 'volume_up'
  | 'volume_down'
  | 'mute';

export interface WorkspaceAction {
  id: string;
  type: ActionType;
  label: string;      // e.g., "Open LeetCode"
  target: string;     // URL, path, command, "Ctrl+Shift+M", text snippet, MediaKey, or delay in ms
}

export type AccentColor =
  | 'blue'
  | 'indigo'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'slate';

export interface Workspace {
  id: string;
  name: string;       // e.g., "DSA Prep"
  icon: string;       // Lucide icon key or emoji
  description: string;
  actions: WorkspaceAction[];
  accentColor?: AccentColor;
  lastLaunchedAt?: string;
  launchCount?: number;
}

export type ActionStatus = 'idle' | 'pending' | 'running' | 'success' | 'error';

export interface ActionExecutionProgress {
  actionId: string;
  label: string;
  type: ActionType;
  target: string;
  status: ActionStatus;
  error?: string;
  timestamp?: number;
}

export interface LaunchReport {
  workspaceId: string;
  workspaceName: string;
  startTime: number;
  endTime?: number;
  totalActions: number;
  succeededActions: number;
  failedActions: number;
  progressList: ActionExecutionProgress[];
  isComplete: boolean;
}

// --- Mobile Deck Configuration Types ---
export type GridDimension = '2x3' | '2x4' | '3x4' | '3x5' | '3x6'; // Supported stream deck grid matrix shapes

/**
 * workspace     — runs every step of a workspace (multi-action)
 * quick_action  — runs one step of a workspace
 * custom        — runs its own inline action (hotkey, media key, URL…)
 * folder        — opens the nested page referenced by targetId
 * back          — reserved first key of a folder page; returns to the parent
 */
export type DeckItemType = 'workspace' | 'quick_action' | 'custom' | 'folder' | 'back' | 'empty';

export interface DeckSlot {
  id: string;                // e.g. "slot-p0-0"
  type: DeckItemType;
  targetId?: string;         // workspace.id, action.id or folder page id
  targetWorkspaceId?: string;// parent workspace ID if type === 'quick_action'
  action?: WorkspaceAction;  // inline action if type === 'custom'
  label: string;             // Custom button label
  icon: string;              // Icon key or emoji
  accentColor?: AccentColor; // Custom button accent color
}

export interface DeckPage {
  id: string;                // "workspaces" | "quick_actions" or custom
  title: string;             // "Workspaces" | "Quick Actions"
  slots: DeckSlot[];
  parentId?: string;         // set for folder pages; they are reached through a folder key
}

export interface DeckConfig {
  version: number;
  gridDimension: GridDimension;
  activePageId: string;
  pages: DeckPage[];
  updatedAt: string;
}

export interface ServerStatus {
  online: boolean;
  ip: string;
  port: number;
  connectedClients: number;
  activeWorkspaceId: string | null;
  serverVersion: string;
  error?: string | null;
}

export type TriggerSource = 'phone' | 'desktop' | 'tray' | 'palette';

export interface ActivityEntry {
  id: string;
  label: string;
  icon: string;
  accentColor?: AccentColor;
  source: TriggerSource;
  success: boolean;
  message?: string;
  timestamp: number;
}
