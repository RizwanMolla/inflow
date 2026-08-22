import React, { useState } from 'react';
import {
  Search,
  Globe,
  Folder,
  FileText,
  Terminal,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Play,
  GripVertical,
  Zap,
} from 'lucide-react';
import type { Workspace, WorkspaceAction } from '../types/workspace';
import { renderWorkspaceIcon } from '../utils/theme';

import { dragManager } from '../services/dragManager';

interface ActionPaletteProps {
  workspaces: Workspace[];
  onSelectWorkspaceToAssign: (workspace: Workspace) => void;
  onSelectActionToAssign: (action: WorkspaceAction, workspaceId: string) => void;
  onOpenNewWorkspaceModal: () => void;
  onEditWorkspace: (workspace: Workspace) => void;
  onLaunchWorkspace: (workspace: Workspace) => void;
}

export const ActionPalette: React.FC<ActionPaletteProps> = ({
  workspaces,
  onSelectWorkspaceToAssign,
  onSelectActionToAssign,
  onOpenNewWorkspaceModal,
  onEditWorkspace,
  onLaunchWorkspace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'workspaces' | 'actions'>('all');

  // Filter workspaces
  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Flatten and filter actions
  const allActions = workspaces.flatMap((w) =>
    w.actions.map((a) => ({
      ...a,
      workspaceId: w.id,
      workspaceName: w.name,
    }))
  );

  const filteredActions = allActions.filter(
    (a) =>
      a.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.workspaceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drag start & end helpers
  const handleDragStartWorkspace = (e: React.DragEvent, ws: Workspace) => {
    const payload = {
      type: 'workspace' as const,
      id: ws.id,
      title: ws.name,
    };
    dragManager.setDragItem(payload);
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragStartAction = (
    e: React.DragEvent,
    action: WorkspaceAction,
    workspaceId: string
  ) => {
    const payload = {
      type: 'action' as const,
      id: action.id,
      workspaceId,
      title: action.label,
    };
    dragManager.setDragItem(payload);
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragEnd = () => {
    dragManager.setDragItem(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#161618] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
      {/* Palette Header */}
      <div className="p-3.5 bg-[#1b1b1e] border-b border-white/[0.08] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white tracking-tight">Action Library</h3>
              <p className="text-[10px] text-neutral-400">Drag or click to assign to keys</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenNewWorkspaceModal}
            className="h-6 px-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-[11px] font-medium flex items-center space-x-1 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        {/* Search input in palette */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter library actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 h-7 bg-neutral-900 border border-white/10 rounded-md text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-white/15 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All ({filteredWorkspaces.length + filteredActions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('workspaces')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeCategory === 'workspaces'
                ? 'bg-white/15 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Workspaces ({filteredWorkspaces.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('actions')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeCategory === 'actions'
                ? 'bg-white/15 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Actions ({filteredActions.length})
          </button>
        </div>
      </div>

      {/* Library Scrollable Catalog */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Section 1: Workspaces Group */}
        {(activeCategory === 'all' || activeCategory === 'workspaces') && (
          <div>
            <button
              type="button"
              onClick={() => setIsWorkspacesOpen(!isWorkspacesOpen)}
              className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2 hover:text-neutral-200 transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                {isWorkspacesOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Workspaces ({filteredWorkspaces.length})</span>
              </div>
            </button>

            {isWorkspacesOpen && (
              <div className="space-y-1.5">
                {filteredWorkspaces.length === 0 ? (
                  <div className="p-3 text-center text-neutral-500 text-[11px] bg-black/20 rounded-lg border border-white/5">
                    No workspaces found
                  </div>
                ) : (
                  filteredWorkspaces.map((ws) => (
                    <div
                      key={ws.id}
                      draggable
                      onDragStart={(e) => handleDragStartWorkspace(e, ws)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectWorkspaceToAssign(ws)}
                      className="group flex items-center justify-between p-2 rounded-lg bg-[#1e1e22] hover:bg-[#26262b] border border-white/10 hover:border-red-500/40 cursor-grab active:cursor-grabbing transition-all shadow-sm select-none"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 flex-shrink-0" />
                        <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white flex-shrink-0">
                          {renderWorkspaceIcon(ws.icon || 'Zap', 'w-3.5 h-3.5')}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-medium text-white truncate leading-tight group-hover:text-red-400 transition-colors">
                            {ws.name}
                          </h4>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {ws.actions.length} action{ws.actions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchWorkspace(ws);
                          }}
                          title="Run Workspace"
                          className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditWorkspace(ws);
                          }}
                          title="Edit Workspace"
                          className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Section 2: Individual Actions Group */}
        {(activeCategory === 'all' || activeCategory === 'actions') && (
          <div>
            <button
              type="button"
              onClick={() => setIsActionsOpen(!isActionsOpen)}
              className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2 hover:text-neutral-200 transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                {isActionsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Individual Actions ({filteredActions.length})</span>
              </div>
            </button>

            {isActionsOpen && (
              <div className="space-y-1.5">
                {filteredActions.length === 0 ? (
                  <div className="p-3 text-center text-neutral-500 text-[11px] bg-black/20 rounded-lg border border-white/5">
                    No actions found
                  </div>
                ) : (
                  filteredActions.map((act) => {
                    const actionIcon =
                      act.type === 'url' ? (
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                      ) : act.type === 'app' ? (
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      ) : act.type === 'folder' ? (
                        <Folder className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      );

                    return (
                      <div
                        key={`${act.workspaceId}-${act.id}`}
                        draggable
                        onDragStart={(e) => handleDragStartAction(e, act, act.workspaceId)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectActionToAssign(act, act.workspaceId)}
                        className="group flex items-center justify-between p-2 rounded-lg bg-[#1e1e22] hover:bg-[#26262b] border border-white/10 hover:border-red-500/40 cursor-grab active:cursor-grabbing transition-all shadow-sm select-none"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 flex-shrink-0" />
                          <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                            {actionIcon}
                          </div>
                          <div className="truncate">
                            <h4 className="text-xs font-medium text-white truncate leading-tight group-hover:text-red-400 transition-colors">
                              {act.label}
                            </h4>
                            <span className="text-[10px] text-neutral-400 font-mono truncate block">
                              [{act.workspaceName}]
                            </span>
                          </div>
                        </div>

                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/5 group-hover:border-white/10 flex-shrink-0">
                          {act.type}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
