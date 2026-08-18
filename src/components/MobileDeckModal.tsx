import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Layers,
  Zap,
  LayoutGrid,
  Trash2,
  Sliders,
  Check,
  Play,
  RotateCcw,
} from 'lucide-react';
import type {
  DeckConfig,
  DeckSlot,
  GridDimension,
  Workspace,
} from '../types/workspace';
import { AVAILABLE_ICONS, ACCENT_COLORS, renderWorkspaceIcon } from '../utils/theme';
import { generateDefaultDeckConfig } from '../data/deckDefaults';

interface MobileDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  deckConfig: DeckConfig;
  onSaveDeckConfig: (config: DeckConfig) => void;
  onTriggerLaunch?: (workspace: Workspace) => void;
}

export const MobileDeckModal: React.FC<MobileDeckModalProps> = ({
  isOpen,
  onClose,
  workspaces,
  deckConfig,
  onSaveDeckConfig,
  onTriggerLaunch,
}) => {
  const [config, setConfig] = useState<DeckConfig>(deckConfig);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'quick_actions'>('workspaces');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // Sync state if props update while opened
  React.useEffect(() => {
    setConfig(deckConfig);
  }, [deckConfig, isOpen]);

  if (!isOpen) return null;

  const activePage =
    config.pages.find((p) => p.id === activeTab) || config.pages[0];

  const totalSlotsCount = config.gridDimension === '2x3' ? 6 : 12;

  // Flatten quick actions list for picker
  const allWorkspaceActions = workspaces.flatMap((w) =>
    w.actions.map((a) => ({
      ...a,
      workspaceId: w.id,
      workspaceName: w.name,
    }))
  );

  const handleDimensionToggle = (dim: GridDimension) => {
    const newLength = dim === '2x3' ? 6 : 12;
    const updatedPages = config.pages.map((p) => {
      let slots = [...p.slots];
      if (slots.length < newLength) {
        const diff = newLength - slots.length;
        const extra = Array.from({ length: diff }).map((_, i) => ({
          id: `slot-${p.id}-${slots.length + i}`,
          type: 'empty' as const,
          label: 'Empty Slot',
          icon: 'Plus',
        }));
        slots = [...slots, ...extra];
      } else if (slots.length > newLength) {
        slots = slots.slice(0, newLength);
      }
      return { ...p, slots };
    });

    const updatedConfig: DeckConfig = {
      ...config,
      gridDimension: dim,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    setConfig(updatedConfig);
    onSaveDeckConfig(updatedConfig);
    setSelectedSlotIndex(null);
  };

  const handleUpdateSlot = (index: number, updatedSlot: Partial<DeckSlot>) => {
    const updatedPages = config.pages.map((p) => {
      if (p.id === activeTab) {
        const slots = [...p.slots];
        slots[index] = {
          ...slots[index],
          ...updatedSlot,
        };
        return { ...p, slots };
      }
      return p;
    });

    const updatedConfig: DeckConfig = {
      ...config,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    setConfig(updatedConfig);
    onSaveDeckConfig(updatedConfig);
  };

  const handleAssignWorkspace = (index: number, ws: Workspace) => {
    handleUpdateSlot(index, {
      type: 'workspace',
      targetId: ws.id,
      label: ws.name,
      icon: ws.icon || 'Zap',
      accentColor: ws.accentColor || 'indigo',
    });
  };

  const handleAssignAction = (
    index: number,
    action: { id: string; label: string; type: string; workspaceId: string }
  ) => {
    const defaultIcon =
      action.type === 'url'
        ? 'Globe'
        : action.type === 'app'
        ? 'Terminal'
        : action.type === 'folder'
        ? 'Folder'
        : 'FileText';

    handleUpdateSlot(index, {
      type: 'quick_action',
      targetId: action.id,
      targetWorkspaceId: action.workspaceId,
      label: action.label,
      icon: defaultIcon,
      accentColor: 'blue',
    });
  };

  const handleClearSlot = (index: number) => {
    handleUpdateSlot(index, {
      type: 'empty',
      targetId: undefined,
      targetWorkspaceId: undefined,
      label: 'Empty Slot',
      icon: 'Plus',
      accentColor: undefined,
    });
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset mobile deck layout back to smart defaults?')) {
      const generated = generateDefaultDeckConfig(workspaces);
      setConfig(generated);
      onSaveDeckConfig(generated);
      setSelectedSlotIndex(null);
    }
  };

  const selectedSlot =
    selectedSlotIndex !== null && activePage?.slots[selectedSlotIndex]
      ? activePage.slots[selectedSlotIndex]
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#161618] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-neutral-200 font-sans flex flex-col max-h-[90vh]">
        {/* Accent Bar */}
        <div className="h-0.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Mobile Deck Visual Editor</h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                Customize buttons & touch layout for your phone companion
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Grid Size Switcher */}
            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleDimensionToggle('2x3')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  config.gridDimension === '2x3'
                    ? 'bg-red-500 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                2×3 (6 Keys)
              </button>
              <button
                type="button"
                onClick={() => handleDimensionToggle('3x4')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  config.gridDimension === '3x4'
                    ? 'bg-red-500 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                3×4 (12 Keys)
              </button>
            </div>

            <button
              onClick={handleResetDefaults}
              title="Reset to defaults"
              className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-6 border-b border-white/[0.08] bg-black/20 space-x-6">
          <button
            onClick={() => {
              setActiveTab('workspaces');
              setSelectedSlotIndex(null);
            }}
            className={`py-2.5 text-xs font-medium border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'workspaces'
                ? 'border-red-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Workspaces Deck</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('quick_actions');
              setSelectedSlotIndex(null);
            }}
            className={`py-2.5 text-xs font-medium border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'quick_actions'
                ? 'border-red-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Quick Actions Deck</span>
          </button>
        </div>

        {/* Main Content Split (Phone Grid Simulation vs Slot Editor) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
          {/* Left: Mobile Phone Frame Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm bg-[#0d0d0f] border-2 border-white/10 rounded-[2.5rem] p-4 shadow-2xl flex flex-col items-center relative">
              {/* Phone Dynamic Island / Speaker notch */}
              <div className="w-20 h-4 bg-black rounded-full mb-3 border border-white/10 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-neutral-800 rounded-full" />
              </div>

              {/* Mobile Screen Header */}
              <div className="w-full flex items-center justify-between px-2 mb-3">
                <div className="flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-bold text-white tracking-tight">InFlow Mobile</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Deck
                </span>
              </div>

              {/* Grid of Deck Buttons */}
              <div
                className={`w-full grid gap-2.5 p-1 ${
                  config.gridDimension === '2x3' ? 'grid-cols-3' : 'grid-cols-4'
                }`}
              >
                {activePage.slots.slice(0, totalSlotsCount).map((slot, index) => {
                  const isSelected = selectedSlotIndex === index;
                  const isEmpty = slot.type === 'empty';

                  return (
                    <button
                      key={slot.id || index}
                      type="button"
                      onClick={() => setSelectedSlotIndex(index)}
                      className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-150 group border ${
                        isSelected
                          ? 'border-red-500 ring-2 ring-red-500/40 bg-white/10 shadow-lg scale-105 z-10'
                          : isEmpty
                          ? 'border-dashed border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'
                          : 'border-white/10 bg-[#1e1e20] hover:border-white/25 hover:bg-[#252528] shadow-md active:scale-95'
                      }`}
                    >
                      {/* Accent Line Indicator */}
                      {!isEmpty && slot.accentColor && (
                        <div
                          className={`absolute top-0 inset-x-3 h-0.5 rounded-full bg-${slot.accentColor}-400/80`}
                        />
                      )}

                      {/* Icon */}
                      <div
                        className={`p-2 rounded-xl mb-1.5 transition-transform group-hover:scale-110 ${
                          isEmpty
                            ? 'text-neutral-600'
                            : 'bg-white/5 text-white border border-white/10'
                        }`}
                      >
                        {renderWorkspaceIcon(slot.icon || (isEmpty ? 'Plus' : 'Zap'), 'w-4 h-4')}
                      </div>

                      {/* Label */}
                      <span
                        className={`text-[10px] font-medium text-center line-clamp-1 leading-tight ${
                          isEmpty ? 'text-neutral-500' : 'text-white'
                        }`}
                      >
                        {slot.label || (isEmpty ? 'Empty' : 'Button')}
                      </span>

                      {/* Quick Type Tag */}
                      {!isEmpty && (
                        <span className="text-[8px] font-mono text-neutral-400 opacity-60 mt-0.5 uppercase">
                          {slot.type === 'workspace' ? 'Workflow' : 'Action'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="w-24 h-1 bg-white/20 rounded-full mt-4" />
            </div>
            <p className="text-[11px] text-neutral-400 mt-3 font-mono">
              Click any key above to edit assignment & style
            </p>
          </div>

          {/* Right: Slot Configurator Panel */}
          <div className="lg:col-span-5 bg-black/30 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            {selectedSlot ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-red-400" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Key #{selectedSlotIndex! + 1} Settings
                    </h3>
                  </div>
                  {selectedSlot.type !== 'empty' && (
                    <button
                      onClick={() => handleClearSlot(selectedSlotIndex!)}
                      className="text-xs text-neutral-400 hover:text-red-400 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Target Assignment */}
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">
                    Assign Target {activeTab === 'workspaces' ? 'Workspace' : 'Quick Action'}
                  </label>

                  {activeTab === 'workspaces' ? (
                    <select
                      value={selectedSlot.targetId || ''}
                      onChange={(e) => {
                        const targetWs = workspaces.find((w) => w.id === e.target.value);
                        if (targetWs) {
                          handleAssignWorkspace(selectedSlotIndex!, targetWs);
                        } else {
                          handleClearSlot(selectedSlotIndex!);
                        }
                      }}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                    >
                      <option value="">-- Select Workspace --</option>
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name} ({ws.actions.length} actions)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={selectedSlot.targetId || ''}
                      onChange={(e) => {
                        const targetAct = allWorkspaceActions.find((a) => a.id === e.target.value);
                        if (targetAct) {
                          handleAssignAction(selectedSlotIndex!, targetAct);
                        } else {
                          handleClearSlot(selectedSlotIndex!);
                        }
                      }}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                    >
                      <option value="">-- Select Quick Action --</option>
                      {allWorkspaceActions.map((act) => (
                        <option key={act.id} value={act.id}>
                          [{act.workspaceName}] {act.label} ({act.type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Custom Label */}
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">
                    Custom Button Label
                  </label>
                  <input
                    type="text"
                    value={selectedSlot.label}
                    onChange={(e) =>
                      handleUpdateSlot(selectedSlotIndex!, { label: e.target.value })
                    }
                    placeholder="e.g. LeetCode Prep"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                  />
                </div>

                {/* Icon Selector */}
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">
                    Icon Style
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1 bg-neutral-900/60 rounded-lg border border-white/5">
                    {Object.keys(AVAILABLE_ICONS).map((iconKey) => (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => handleUpdateSlot(selectedSlotIndex!, { icon: iconKey })}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                          selectedSlot.icon === iconKey
                            ? 'bg-red-500 text-white'
                            : 'text-neutral-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {renderWorkspaceIcon(iconKey, 'w-3.5 h-3.5')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color Palette with WCAG standard dark contrast */}
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">
                    Accent Glow (WCAG Compliant)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() =>
                          handleUpdateSlot(selectedSlotIndex!, { accentColor: acc.id })
                        }
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center space-x-1.5 transition-all ${
                          selectedSlot.accentColor === acc.id
                            ? 'border-white bg-white/20 text-white shadow-sm'
                            : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
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

                {/* Instant Launch Test Trigger */}
                {selectedSlot.type === 'workspace' && selectedSlot.targetId && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetWs = workspaces.find((w) => w.id === selectedSlot.targetId);
                        if (targetWs && onTriggerLaunch) {
                          onTriggerLaunch(targetWs);
                        }
                      }}
                      className="w-full py-1.5 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Test Trigger on Desktop</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
                <LayoutGrid className="w-8 h-8 opacity-40" />
                <p className="text-xs">Select any button slot from the phone mockup to configure its target and styling.</p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>Live Synced via WebSocket</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Apply & Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
