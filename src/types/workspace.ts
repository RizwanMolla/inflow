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
