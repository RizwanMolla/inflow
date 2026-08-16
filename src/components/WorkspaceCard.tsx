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
  Loader2,
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
    <div className="group relative rounded-xl bg-[#1e1e20]/80 backdrop-blur-2xl border border-white/10 hover:border-white/20 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-lg text-neutral-200 font-sans">
      {/* Top Accent Indicator */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${accent.gradient.replace('from-', 'from-').replace('/20', '')}`} />

      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="flex items-center space-x-2">
              <div
                className={`p-1.5 rounded-md border border-white/10 ${accent.bgGlow} transition-transform group-hover:scale-105 duration-200`}
              >
                {renderWorkspaceIcon(workspace.icon, 'w-4 h-4')}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white group-hover:text-red-400 transition-colors">
                  {workspace.name}
                </h3>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {workspace.actions.length} {workspace.actions.length === 1 ? 'action' : 'actions'}
                  </span>
                  {workspace.launchCount !== undefined && workspace.launchCount > 0 && (
                    <>
                      <span className="text-neutral-500 text-[9px]">•</span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {workspace.launchCount} runs
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Card Action Buttons */}
            <div className="flex items-center space-x-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => onDuplicate(workspace)}
                title="Duplicate Workspace"
                className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onEdit(workspace)}
                title="Edit Workspace"
                className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(workspace.id)}
                title="Delete Workspace"
                className="p-1 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Description */}
          {workspace.description && (
            <p className="text-[11px] text-neutral-400 line-clamp-2 leading-normal mb-2.5">
              {workspace.description}
            </p>
          )}

          {/* Action Type Summary Badges */}
          <div className="flex flex-wrap gap-1 mb-2.5">
            {actionCounts.url && (
              <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[9px] font-mono flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>{actionCounts.url} Web</span>
              </span>
            )}
            {actionCounts.folder && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-mono flex items-center space-x-1">
                <Folder className="w-3 h-3" />
                <span>{actionCounts.folder} Folder</span>
              </span>
            )}
            {actionCounts.file && (
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-mono flex items-center space-x-1">
                <FileText className="w-3 h-3" />
                <span>{actionCounts.file} File</span>
              </span>
            )}
            {actionCounts.app && (
              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] font-mono flex items-center space-x-1">
                <Terminal className="w-3 h-3" />
                <span>{actionCounts.app} App</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Pipeline Accordion */}
        {workspace.actions.length > 0 && (
          <div className="border-t border-white/[0.06] pt-2 mt-1">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-[10px] text-neutral-400 hover:text-neutral-200 py-0.5 transition-colors font-mono"
            >
              <span>{isExpanded ? 'Hide Pipeline' : 'View Action Pipeline'}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {isExpanded && (
              <div className="mt-1.5 space-y-1 max-h-32 overflow-y-auto pr-0.5 custom-scrollbar">
                {workspace.actions.map((action, idx) => {
                  const meta = getActionTypeMeta(action.type);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={action.id}
                      className="p-1.5 bg-black/40 border border-white/5 rounded-md flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="text-[9px] font-mono text-neutral-500">{idx + 1}.</span>
                        <Icon className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="text-neutral-300 truncate font-mono text-[10px]">{action.label}</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 truncate max-w-[110px] font-mono">
                        {action.target}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Launch Button */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => onLaunch(workspace)}
            disabled={isLaunching}
            className={`w-full py-1.5 px-2.5 rounded-md font-medium text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] shadow-sm ${
              isLaunching
                ? 'bg-white/5 text-neutral-500 cursor-not-allowed border border-white/5'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {isLaunching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Workspace</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};