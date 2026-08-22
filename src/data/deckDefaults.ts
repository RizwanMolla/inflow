import type { DeckConfig, GridDimension, Workspace } from '../types/workspace';

export function generateDefaultDeckConfig(workspaces: Workspace[]): DeckConfig {
  const wsSlots = Array.from({ length: 18 }).map((_, i) => {
    const ws = workspaces[i];
    if (ws) {
      return {
        id: `slot-ws-${i}`,
        type: 'workspace' as const,
        targetId: ws.id,
        label: ws.name,
        icon: ws.icon || 'Zap',
        accentColor: ws.accentColor || 'indigo',
      };
    }
    return {
      id: `slot-ws-${i}`,
      type: 'empty' as const,
      label: 'Empty Slot',
      icon: 'Plus',
    };
  });

  // Extract first few actions from all workspaces for quick actions page
  const allActions = workspaces.flatMap((w) =>
    w.actions.map((a) => ({ ...a, workspaceId: w.id, workspaceName: w.name }))
  );

  const actionSlots = Array.from({ length: 18 }).map((_, i) => {
    const action = allActions[i];
    if (action) {
      return {
        id: `slot-act-${i}`,
        type: 'quick_action' as const,
        targetId: action.id,
        targetWorkspaceId: action.workspaceId,
        label: action.label,
        icon: action.type === 'url' ? 'Globe' : action.type === 'app' ? 'Terminal' : action.type === 'folder' ? 'Folder' : 'FileText',
        accentColor: 'blue' as const,
      };
    }
    return {
      id: `slot-act-${i}`,
      type: 'empty' as const,
      label: 'Empty Slot',
      icon: 'Plus',
    };
  });

  return {
    version: 1,
    gridDimension: '2x3' as GridDimension,
    activePageId: 'workspaces',
    pages: [
      {
        id: 'workspaces',
        title: 'Workspaces',
        slots: wsSlots,
      },
      {
        id: 'quick_actions',
        title: 'Quick Actions',
        slots: actionSlots,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}
