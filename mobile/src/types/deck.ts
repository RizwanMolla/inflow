export type ActionType = 'url' | 'folder' | 'file' | 'app';
export type AccentColor = 'blue' | 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';
export type GridDimension = '2x3' | '2x4' | '3x4' | '3x5' | '3x6';
export type DeckItemType = 'workspace' | 'quick_action' | 'empty';

export interface DeckSlot {
  id: string;
  type: DeckItemType;
  targetId?: string;
  targetWorkspaceId?: string;
  label: string;
  icon: string;
  accentColor?: AccentColor;
}

export interface DeckPage {
  id: string;
  title: string;
  slots: DeckSlot[];
}

export interface DeckConfig {
  version: number;
  gridDimension: GridDimension;
  activePageId: string;
  pages: DeckPage[];
  updatedAt: string;
}

export interface ServerStatus {
  ip: string;
  port: number;
  connectedClients: number;
  activeWorkspaceId: string | null;
  serverVersion: string;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  autoConnect: boolean;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
