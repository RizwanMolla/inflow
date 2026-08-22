import React from 'react';
import {
  Sliders,
  Trash2,
  Play,
  Layers,
  Zap,
  Type,
  Palette,
  LayoutGrid,
} from 'lucide-react';
import type {
  DeckSlot,
  Workspace,
  AccentColor,
} from '../types/workspace';
import { AVAILABLE_ICONS, ACCENT_COLORS, renderWorkspaceIcon } from '../utils/theme';

interface KeyInspectorProps {
  selectedSlotIndex: number | null;
  slot: DeckSlot | null;
  activeTab: string;
  workspaces: Workspace[];
  onUpdateSlot: (index: number, updated: Partial<DeckSlot>) => void;
  onClearSlot: (index: number) => void;
  onAssignWorkspace: (index: number, ws: Workspace) => void;
  onAssignAction: (
    index: number,
    action: { id: string; label: string; type: string; workspaceId: string }
  ) => void;
  onTriggerLaunch?: (workspace: Workspace) => void;
  onTriggerAction?: (actionId: string, workspaceId: string) => void;
}

export const KeyInspector: React.FC<KeyInspectorProps> = ({
  selectedSlotIndex,
  slot,
  activeTab,
  workspaces,
  onUpdateSlot,
  onClearSlot,
  onAssignWorkspace,
  onAssignAction,
  onTriggerLaunch,
  onTriggerAction,
}) => {
  if (selectedSlotIndex === null || !slot) {
    return (
      <div className="h-full bg-[#161618] border border-white/[0.08] rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 mb-2.5">
          <LayoutGrid className="w-5 h-5 opacity-60" />
        </div>
        <h4 className="text-xs font-semibold text-white tracking-tight">No Key Selected</h4>
        <p className="text-[11px] text-neutral-400 max-w-xs mt-1">
          Click any key on the visual deck canvas above or select an action on the right to configure parameters and styling.
        </p>
      </div>
    );
  }

  // Flatten quick actions list for dropdown picker
  const allWorkspaceActions = workspaces.flatMap((w) =>
    w.actions.map((a) => ({
      ...a,
      workspaceId: w.id,
      workspaceName: w.name,
    }))
  );

  const isEmpty = slot.type === 'empty';

  return (
    <div className="h-full bg-[#161618] border border-white/[0.08] rounded-xl p-3 flex flex-col justify-between shadow-lg overflow-hidden select-none">
      {/* Header bar: Key index + Clear button */}
      <div className="flex-shrink-0 flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Sliders className="w-3 h-3" />
          </div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-semibold text-white tracking-tight">
              Key #{selectedSlotIndex + 1} Configuration
            </h3>
            <span
              className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${
                isEmpty
                  ? 'bg-neutral-800 text-neutral-400 border-white/10'
                  : slot.type === 'workspace'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isEmpty ? 'UNASSIGNED' : slot.type === 'workspace' ? 'WORKFLOW' : 'ACTION'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isEmpty && (
            <button
              type="button"
              onClick={() => onClearSlot(selectedSlotIndex)}
              className="h-5 px-2 text-[10px] text-neutral-400 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded border border-white/10 flex items-center space-x-1 transition-colors"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Inspector Columns - compact 3-column layout that fits easily */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Column 1: Target Binding & Label */}
        <div className="flex flex-col justify-between gap-1.5">
          <div>
            <label className="flex items-center space-x-1 text-[9px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
              <Layers className="w-2.5 h-2.5 text-red-400" />
              <span>Target Assignment</span>
            </label>

            {activeTab === 'workspaces' ? (
              <select
                value={slot.targetId || ''}
                onChange={(e) => {
                  const targetWs = workspaces.find((w) => w.id === e.target.value);
                  if (targetWs) {
                    onAssignWorkspace(selectedSlotIndex, targetWs);
                  } else {
                    onClearSlot(selectedSlotIndex);
                  }
                }}
                aria-label="Select Target Workspace"
                className="w-full bg-[#1e1e22] border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500/50"
              >
                <option value="">-- Choose Workspace --</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} ({ws.actions.length} actions)
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={slot.targetId || ''}
                onChange={(e) => {
                  const targetAct = allWorkspaceActions.find((a) => a.id === e.target.value);
                  if (targetAct) {
                    onAssignAction(selectedSlotIndex, targetAct);
                  } else {
                    onClearSlot(selectedSlotIndex);
                  }
                }}
                aria-label="Select Target Action"
                className="w-full bg-[#1e1e22] border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500/50"
              >
                <option value="">-- Choose Quick Action --</option>
                {allWorkspaceActions.map((act) => (
                  <option key={act.id} value={act.id}>
                    [{act.workspaceName}] {act.label} ({act.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Label Input */}
          <div>
            <label className="flex items-center space-x-1 text-[9px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
              <Type className="w-2.5 h-2.5 text-red-400" />
              <span>Button Label</span>
            </label>
            <input
              type="text"
              value={slot.label}
              onChange={(e) =>
                onUpdateSlot(selectedSlotIndex, { label: e.target.value })
              }
              placeholder="e.g. Deep Focus Mode"
              className="w-full bg-[#1e1e22] border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50"
            />
          </div>
        </div>

        {/* Column 2: Icon Style Selector */}
        <div className="flex flex-col">
          <label className="flex items-center space-x-1 text-[9px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
            <Zap className="w-2.5 h-2.5 text-red-400" />
            <span>Icon Style</span>
          </label>
          <div className="flex-1 min-h-0 grid grid-cols-6 gap-1 p-1 bg-[#1a1a1d] rounded-md border border-white/5 overflow-y-auto custom-scrollbar">
            {Object.keys(AVAILABLE_ICONS).map((iconKey) => (
              <button
                key={iconKey}
                type="button"
                onClick={() => onUpdateSlot(selectedSlotIndex, { icon: iconKey })}
                title={iconKey}
                className={`p-1 rounded flex items-center justify-center transition-all ${
                  slot.icon === iconKey
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {renderWorkspaceIcon(iconKey, 'w-3 h-3')}
              </button>
            ))}
          </div>
        </div>

        {/* Column 3: Accent Glow Color & Desktop Test Launch */}
        <div className="flex flex-col justify-between gap-1.5">
          <div>
            <label className="flex items-center space-x-1 text-[9px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
              <Palette className="w-2.5 h-2.5 text-red-400" />
              <span>Accent Glow</span>
            </label>
            <div className="flex flex-wrap gap-1">
              {ACCENT_COLORS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() =>
                    onUpdateSlot(selectedSlotIndex, { accentColor: acc.id as AccentColor })
                  }
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium border flex items-center space-x-1 transition-all ${
                    slot.accentColor === acc.id
                      ? 'border-white bg-white/20 text-white shadow-sm'
                      : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      acc.id === 'indigo'
                        ? 'bg-indigo-400'
                        : acc.id === 'emerald'
                        ? 'bg-emerald-400'
                        : acc.id === 'cyan'
                        ? 'bg-cyan-400'
                        : acc.id === 'violet'
                        ? 'bg-violet-400'
                        : acc.id === 'amber'
                        ? 'bg-amber-400'
                        : acc.id === 'rose'
                        ? 'bg-rose-400'
                        : 'bg-sky-400'
                    }`}
                  />
                  <span>{acc.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Test Launch Trigger */}
          {!isEmpty && (
            <div>
              <button
                type="button"
                onClick={() => {
                  if (slot.type === 'workspace' && slot.targetId) {
                    const targetWs = workspaces.find((w) => w.id === slot.targetId);
                    if (targetWs && onTriggerLaunch) onTriggerLaunch(targetWs);
                  } else if (slot.type === 'quick_action' && slot.targetId && slot.targetWorkspaceId) {
                    if (onTriggerAction) onTriggerAction(slot.targetId, slot.targetWorkspaceId);
                  }
                }}
                className="w-full py-1 px-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-md text-[11px] font-medium flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-[0.98]"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Test Run on Desktop</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
