import React from 'react';
import {
  Layers,
  Zap,
  Grid3X3,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react';
import type {
  DeckConfig,
  DeckSlot,
  GridDimension,
} from '../types/workspace';
import { renderWorkspaceIcon } from '../utils/theme';
import { dragManager } from '../services/dragManager';

interface DeckCanvasProps {
  deckConfig: DeckConfig;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onAddPage: (title?: string) => void;
  onRenamePage: (pageId: string, newTitle: string) => void;
  onDeletePage: (pageId: string) => void;
  selectedSlotIndex: number | null;
  onSelectSlot: (index: number) => void;
  onUpdateDimension: (dim: GridDimension) => void;
  onResetDefaults: () => void;
  onDropActionOrWorkspace?: (slotIndex: number, data: { type: 'workspace' | 'action'; id: string; workspaceId?: string }) => void;
}

export const GRID_DIMENSION_OPTIONS: { id: GridDimension; label: string; rows: number; cols: number }[] = [
  { id: '2x3', label: '2×3 (6 Keys)', rows: 2, cols: 3 },
  { id: '2x4', label: '2×4 (8 Keys)', rows: 2, cols: 4 },
  { id: '3x4', label: '3×4 (12 Keys)', rows: 3, cols: 4 },
  { id: '3x5', label: '3×5 (15 Keys)', rows: 3, cols: 5 },
  { id: '3x6', label: '3×6 (18 Keys)', rows: 3, cols: 6 },
];

export function getDimensionSlotCount(dim: GridDimension): { rows: number; cols: number; total: number } {
  const [r, c] = (dim || '2x3').split('x').map(Number);
  const rows = r || 2;
  const cols = c || 3;
  return { rows, cols, total: rows * cols };
}

export const DeckCanvas: React.FC<DeckCanvasProps> = ({
  deckConfig,
  activeTab,
  onTabChange,
  onAddPage,
  onRenamePage,
  onDeletePage,
  selectedSlotIndex,
  onSelectSlot,
  onUpdateDimension,
  onResetDefaults,
  onDropActionOrWorkspace,
}) => {
  const { total, rows, cols } = getDimensionSlotCount(deckConfig.gridDimension || '2x3');
  const activePage =
    deckConfig.pages.find((p) => p.id === activeTab) || deckConfig.pages[0];

  const [editingPageId, setEditingPageId] = React.useState<string | null>(null);
  const [pageRenameTitle, setPageRenameTitle] = React.useState('');

  const handleStartRename = (pageId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(pageId);
    setPageRenameTitle(currentTitle);
  };

  const handleSaveRename = (pageId: string) => {
    if (pageRenameTitle.trim()) {
      onRenamePage(pageId, pageRenameTitle.trim());
    }
    setEditingPageId(null);
  };

  // Fill array up to total slots
  const displaySlots: DeckSlot[] = [];
  for (let i = 0; i < total; i++) {
    if (activePage?.slots && activePage.slots[i]) {
      displaySlots.push(activePage.slots[i]);
    } else {
      displaySlots.push({
        id: `slot-${activeTab}-${i}`,
        type: 'empty',
        label: 'Empty Slot',
        icon: 'Plus',
      });
    }
  }

  // Handle Drag Over & Drop with visual dragover indication
  const [dragOverSlotIndex, setDragOverSlotIndex] = React.useState<number | null>(null);

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlotIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverSlotIndex !== index) {
      setDragOverSlotIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverSlotIndex === index) {
      setDragOverSlotIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlotIndex(null);

    let parsed: { type: 'workspace' | 'action'; id: string; workspaceId?: string } | null = null;

    try {
      const rawText = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/json');
      if (rawText) {
        parsed = JSON.parse(rawText);
      }
    } catch {
      // fallback to dragManager below
    }

    if (!parsed) {
      const activeMemItem = dragManager.getDragItem();
      if (activeMemItem) {
        parsed = activeMemItem;
      }
    }

    if (parsed && onDropActionOrWorkspace) {
      onDropActionOrWorkspace(slotIndex, parsed);
      onSelectSlot(slotIndex);
    }
    dragManager.setDragItem(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#161618] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl select-none">
      {/* Canvas Top Bar: Page tabs & Grid switcher */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-[#1b1b1e] border-b border-white/[0.08]">
        {/* Left: Dynamic Page Tabs with Add/Delete/Rename */}
        <div className="flex items-center space-x-1 overflow-x-auto custom-scrollbar max-w-[65%] py-0.5">
          {deckConfig.pages.map((page, pIdx) => {
            const isActive = (activePage?.id || deckConfig.pages[0].id) === page.id;
            const isEditing = editingPageId === page.id;

            return (
              <div
                key={page.id}
                onClick={() => {
                  if (!isEditing) onTabChange(page.id);
                }}
                className={`group px-2.5 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                {pIdx === 0 ? (
                  <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                ) : pIdx === 1 ? (
                  <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                )}

                {isEditing ? (
                  <input
                    type="text"
                    autoFocus
                    value={pageRenameTitle}
                    onChange={(e) => setPageRenameTitle(e.target.value)}
                    onBlur={() => handleSaveRename(page.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(page.id);
                      if (e.key === 'Escape') setEditingPageId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-black/80 text-white text-xs px-1.5 py-0.5 rounded border border-red-500/60 focus:outline-none w-24"
                  />
                ) : (
                  <span className="truncate max-w-[120px]">
                    {page.title || `Page ${pIdx + 1}`}
                  </span>
                )}

                {/* Rename & Delete Icons for Custom Pages or on Hover */}
                {!isEditing && (
                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(page.id, page.title, e)}
                      title="Rename Page"
                      className="p-0.5 text-neutral-400 hover:text-white rounded"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                    {deckConfig.pages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete page "${page.title}"?`)) {
                            onDeletePage(page.id);
                          }
                        }}
                        title="Delete Page"
                        className="p-0.5 text-neutral-400 hover:text-red-400 rounded"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add New Page Button */}
          <button
            type="button"
            onClick={() => onAddPage()}
            title="Create New Deck Page"
            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white rounded-md text-xs font-medium flex items-center space-x-1 border border-white/10 transition-colors flex-shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span className="text-[11px]">New Page</span>
          </button>
        </div>

        {/* Right: Grid Matrix Selector & Reset */}
        <div className="flex items-center space-x-1.5">
          {/* Grid Dim Selector */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-md p-0.5">
            <span className="text-[10px] font-mono text-neutral-400 px-1 flex items-center gap-1">
              <Grid3X3 className="w-3 h-3 text-neutral-400" />
            </span>
            {GRID_DIMENSION_OPTIONS.map((dim) => (
              <button
                key={dim.id}
                type="button"
                onClick={() => onUpdateDimension(dim.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                  deckConfig.gridDimension === dim.id
                    ? 'bg-red-500 text-white font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {dim.id}
              </button>
            ))}
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={onResetDefaults}
            title="Reset to Smart Defaults"
            className="p-1 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport (Stream Deck / Mobile Phone Frame simulation) - No scroll, auto fits container */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-2.5 bg-[#0f0f11]/80 backdrop-blur-md overflow-hidden">
        {/* Hardware Frame Shell */}
        <div className="w-full h-full max-w-4xl bg-[#0c0c0e] border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col justify-between overflow-hidden">
          {/* Subtle Top Indicator & Badge */}
          <div className="flex-shrink-0 w-full flex items-center justify-between mb-2 px-1">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              <span className="text-[11px] font-semibold text-white tracking-tight flex items-center gap-1.5">
                <span>InFlow Deck Matrix</span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  ({deckConfig.gridDimension || '2x3'} • {total} Keys)
                </span>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Live Companion Ready</span>
              </span>
            </div>
          </div>

          {/* Deck Buttons Dynamic Grid - flex-1 with grid-template-rows so buttons auto scale and never overflow */}
          <div
            className="flex-1 min-h-0 w-full grid gap-2 p-0.5"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {displaySlots.map((slot, index) => {
              const isSelected = selectedSlotIndex === index;
              const isEmpty = slot.type === 'empty';
              const isDragOver = dragOverSlotIndex === index;

              return (
                <div
                  key={slot.id || index}
                  onClick={() => onSelectSlot(index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={(e) => handleDragLeave(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`group relative h-full w-full rounded-xl flex flex-col items-center justify-center p-1.5 transition-all duration-150 border cursor-pointer select-none overflow-hidden ${
                    isDragOver
                      ? 'border-red-400 ring-2 ring-red-500 bg-red-500/20 scale-[1.02] z-20'
                      : isSelected
                      ? 'border-red-500 ring-1.5 ring-red-500/50 bg-white/10 shadow-lg shadow-red-500/10 z-10'
                      : isEmpty
                      ? 'border-dashed border-white/10 bg-black/25 hover:border-white/25 hover:bg-white/5'
                      : 'border-white/10 bg-[#1e1e22] hover:border-white/25 hover:bg-[#26262b] shadow-sm active:scale-98'
                  }`}
                >
                  {/* Top Key Index Badge */}
                  <span className="absolute top-1 left-1.5 text-[8px] font-mono text-neutral-400 group-hover:text-neutral-300 opacity-60">
                    {index + 1}
                  </span>

                  {/* Accent Top Glowing Line */}
                  {!isEmpty && slot.accentColor && (
                    <div
                      className={`absolute top-0 inset-x-2 h-0.5 rounded-full ${
                        slot.accentColor === 'indigo'
                          ? 'bg-indigo-400'
                          : slot.accentColor === 'emerald'
                          ? 'bg-emerald-400'
                          : slot.accentColor === 'cyan'
                          ? 'bg-cyan-400'
                          : slot.accentColor === 'violet'
                          ? 'bg-violet-400'
                          : slot.accentColor === 'amber'
                          ? 'bg-amber-400'
                          : slot.accentColor === 'rose'
                          ? 'bg-rose-400'
                          : 'bg-sky-400'
                      }`}
                    />
                  )}

                  {/* Button Icon Surface */}
                  <div
                    className={`p-1.5 rounded-lg mb-0.5 transition-transform duration-150 group-hover:scale-105 pointer-events-none ${
                      isEmpty
                        ? 'text-neutral-600 group-hover:text-neutral-400'
                        : 'bg-white/5 text-white border border-white/10 shadow-inner'
                    }`}
                  >
                    {renderWorkspaceIcon(slot.icon || (isEmpty ? 'Plus' : 'Zap'), 'w-4 h-4')}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[10px] font-medium text-center line-clamp-1 leading-tight px-1 pointer-events-none ${
                      isEmpty ? 'text-neutral-400' : 'text-white'
                    }`}
                  >
                    {slot.label || (isEmpty ? 'Empty' : 'Key')}
                  </span>

                  {/* Type Tag */}
                  {!isEmpty && (
                    <span className="text-[7px] font-mono text-neutral-400 opacity-70 uppercase tracking-wider pointer-events-none">
                      {slot.type === 'workspace' ? 'Workflow' : 'Action'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footnote hint */}
          <div className="flex-shrink-0 flex items-center justify-between text-[10px] text-neutral-400 mt-1.5 px-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-red-400" />
              <span>Select key or drag action from right palette to assign</span>
            </span>
            <span className="font-mono text-[9px] text-neutral-400">
              {displaySlots.filter((s) => s.type !== 'empty').length}/{total} Assigned
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
