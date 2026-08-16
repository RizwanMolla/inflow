import React, { useState } from 'react';
import {
  Play,
  Settings,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Folder,
  FileText,
  Terminal,
  Globe,
} from 'lucide-react';
import type { Workspace, ActionType } from '../types/workspace';
import { getAccentConfig, renderWorkspaceIcon, getActionTypeMeta } from '../utils/theme';

interface WorkspaceCardProps {
  workspace: Workspace;
  onLaunch: (workspace: Workspace) => void;
  onEdit: (workspace: Workspace) => void;
  onDuplicate: (workspace: Workspace) => void;
  onDelete: (workspaceId: string) => void;
  isLaunching?: boolean;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  workspace,
  onLaunch,
  onEdit,
  onDuplicate,
  onDelete,
  isLaunching = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const accent = getAccentConfig(workspace.accentColor);

  // Group actions by type for quick summary tags
  const actionCounts = workspace.actions.reduce(
    (acc, act) => {
      acc[act.type] = (acc[act.type] || 0) + 1;
      return acc;
    },
    {} as Record<ActionType, number>
  );

  return (
    <div
      className={`relative group rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/90 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg shadow-black/40 hover:shadow-2xl`}
    >
      {/* Accent Gradient Glow on Top Header */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent.gradient.replace('from-', 'from-').replace('/20', '')}`} />

      <div className="p-5 flex-1 flex flex-col justify-between">
        {/* Top bar: Icon, Name, Options */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center space-x-3">
              <div
                className={`p-3 rounded-xl border border-white/5 ${accent.bgGlow} shadow-inner transition-transform group-hover:scale-105 duration-200`}
              >
                {renderWorkspaceIcon(workspace.icon, 'w-6 h-6')}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {workspace.name}
                </h3>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs text-slate-400 font-mono">
                    {workspace.actions.length} {workspace.actions.length === 1 ? 'action' : 'actions'}
                  </span>
                  {workspace.launchCount !== undefined && workspace.launchCount > 0 && (
                    <>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-xs text-slate-500 font-mono">
                        {workspace.launchCount} runs
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Card Menu */}
            <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onDuplicate(workspace)}
                title="Duplicate Workspace"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(workspace)}
                title="Edit Workspace"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(workspace.id)}
                title="Delete Workspace"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description */}
          {workspace.description && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
              {workspace.description}
            </p>
          )}

          {/* Action Type Badges Summary */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {actionCounts.url && (
              <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-md text-[11px] font-medium flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>{actionCounts.url} Web</span>
              </span>
            )}
            {actionCounts.folder && (
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-[11px] font-medium flex items-center space-x-1">
                <Folder className="w-3 h-3" />
                <span>{actionCounts.folder} Folder</span>
              </span>
            )}
            {actionCounts.file && (
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[11px] font-medium flex items-center space-x-1">
                <FileText className="w-3 h-3" />
                <span>{actionCounts.file} File</span>
              </span>
            )}
            {actionCounts.app && (
              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md text-[11px] font-medium flex items-center space-x-1">
                <Terminal className="w-3 h-3" />
                <span>{actionCounts.app} App</span>
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Action Preview */}
        {workspace.actions.length > 0 && (
          <div className="border-t border-slate-800/80 pt-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors"
            >
              <span>{isExpanded ? 'Hide Actions' : 'View Action Pipeline'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {workspace.actions.map((action, idx) => {
                  const meta = getActionTypeMeta(action.type);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={action.id}
                      className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-[10px] font-mono text-slate-500">{idx + 1}.</span>
                        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-200 truncate font-medium">{action.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate max-w-[140px] font-mono">
                        {action.target}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Big Launch Button */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={() => onLaunch(workspace)}
            disabled={isLaunching}
            className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 transition-all transform active:scale-98 shadow-md ${
              isLaunching
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : `${accent.button}`
            }`}
          >
            {isLaunching ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Launching Mode...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
