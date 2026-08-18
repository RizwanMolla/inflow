export type ActionType = 'url' | 'folder' | 'file' | 'app';

export interface WorkspaceAction {
  id: string;
  type: ActionType;
  label: string;      // e.g., "Open LeetCode"
  target: string;     // e.g., "https://leetcode.com" or "D:\Career\DSA"
}

export type AccentColor = 'blue' | 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';

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
export type GridDimension = '2x3' | '3x4'; // 2 rows x 3 cols (6 slots) or 3 rows x 4 cols (12 slots)
export type DeckItemType = 'workspace' | 'quick_action' | 'empty';

export interface DeckSlot {
  id: string;                // e.g. "slot-p0-0"
  type: DeckItemType;
  targetId?: string;         // workspace.id or action.id
  targetWorkspaceId?: string;// parent workspace ID if type === 'quick_action'
  label: string;             // Custom button label
  icon: string;              // Icon key or emoji
  accentColor?: AccentColor; // Custom button accent color
}

export interface DeckPage {
  id: string;                // "workspaces" | "quick_actions" or custom
  title: string;             // "Workspaces" | "Quick Actions"
  slots: DeckSlot[];
}

export interface DeckConfig {
  version: number;
  gridDimension: GridDimension;
  activePageId: string;
  pages: DeckPage[];
  updatedAt: string;
}

// --- WebSocket & Server Event Payloads ---
export type WebSocketMessageType =
  | 'DECK_CONFIG_UPDATE'
  | 'ACTIVE_WORKSPACE_CHANGE'
  | 'TRIGGER_LAUNCH'
  | 'CLIENT_CONNECTED'
  | 'PING'
  | 'PONG';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
}

export interface ServerStatus {
  ip: string;
  port: number;
  connectedClients: number;
  activeWorkspaceId: string | null;
  serverVersion: string;
}
