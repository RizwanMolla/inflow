import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  ClipboardPaste,
  Copy,
  CopyPlus,
  FolderOpen,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { DeckConfig, GridDimension, Workspace } from '../types/workspace';
import {
  GRID_DIMENSION_OPTIONS,
  getDimensionSlotCount,
  isLockedSlot,
  isSlotBroken,
  padSlots,
  pageTrail,
  topLevelPages,
} from '../services/deckOps';
import { dragManager, type DragItemData } from '../services/dragManager';
import { DeckKey } from './DeckKey';

export type KeyFlash = { state: 'success' | 'error' | 'pressed'; at: number };
export type LiveTone = 'live' | 'idle' | 'offline' | 'sim';

interface DeckCanvasProps {
  deckConfig: DeckConfig;
  workspaces: Workspace[];
  activePageId: string;
  onChangePage: (pageId: string) => void;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onAddPage: () => void;
  onRenamePage: (pageId: string, title: string) => void;
  onDeletePage: (pageId: string) => void;
  onChangeGrid: (dim: GridDimension) => void;
  onResetDefaults: () => void;
  onDrop: (index: number, item: DragItemData) => void;
  onRunKey: (index: number) => void;
  onOpenFolder: (index: number) => void;
  onCopy: (index: number) => void;
  onPaste: (index: number) => void;
  onDuplicate: (index: number) => void;
  onClear: (index: number) => void;
  canPaste: boolean;
  flashes: Record<string, KeyFlash>;
  live: { tone: LiveTone; label: string };
}

const FLASH_COLORS: Record<KeyFlash['state'], string> = {
  success: 'rgb(52 211 153 / 0.75)',
  error: 'rgb(248 113 113 / 0.8)',
  pressed: 'rgb(255 255 255 / 0.55)',
};

const LIVE_DOT: Record<LiveTone, string> = {
  live: 'bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153/0.8)]',
  idle: 'bg-amber-400 animate-pulse',
  offline: 'bg-red-500',
  sim: 'bg-neutral-500',
};

export const DeckCanvas: React.FC<DeckCanvasProps> = (props) => {
  const {
    deckConfig,
    workspaces,
    activePageId,
    onChangePage,
    selectedIndex,
    onSelect,
    flashes,
    live,
  } = props;

  const { rows, cols, total } = getDimensionSlotCount(deckConfig.gridDimension);
  const activePage = deckConfig.pages.find((p) => p.id === activePageId) || deckConfig.pages[0];
  const slots = padSlots(activePage, activePage.id, total).slice(0, total);
  const trail = pageTrail(deckConfig, activePage.id);
  const rootPageId = trail[0]?.id ?? activePage.id;
  const assigned = slots.filter((s) => s.type !== 'empty' && s.type !== 'back').length;

  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('mousedown', close);
    window.addEventListener('blur', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const commitRename = () => {
    if (renamingPageId && renameValue.trim()) props.onRenamePage(renamingPageId, renameValue.trim());
    setRenamingPageId(null);
  };

  // --- Drag & drop ---

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const item = dragManager.read(e);
    dragManager.setDragItem(null);
    if (item) props.onDrop(index, item);
  };

  const allowDrop = (e: React.DragEvent, index: number) => {
    if (isLockedSlot(deckConfig, activePage.id, index)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = dragManager.getDragItem()?.type === 'slot' ? 'move' : 'copy';
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  // --- Keyboard ---

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;
    const mod = e.ctrlKey || e.metaKey;
    const move = (delta: number) => {
      e.preventDefault();
      onSelect(Math.min(Math.max(selectedIndex + delta, 0), total - 1));
    };
    switch (e.key) {
      case 'ArrowLeft':
        return move(-1);
      case 'ArrowRight':
        return move(1);
      case 'ArrowUp':
        return move(-cols);
      case 'ArrowDown':
        return move(cols);
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        return props.onClear(selectedIndex);
      case 'Enter':
        e.preventDefault();
        return slots[selectedIndex]?.type === 'folder'
          ? props.onOpenFolder(selectedIndex)
          : props.onRunKey(selectedIndex);
      case 'Escape':
        if (trail.length > 1) onChangePage(trail[trail.length - 2].id);
        return;
    }
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === 'c') {
      e.preventDefault();
      props.onCopy(selectedIndex);
    } else if (k === 'v') {
      e.preventDefault();
      props.onPaste(selectedIndex);
    } else if (k === 'd') {
      e.preventDefault();
      props.onDuplicate(selectedIndex);
    }
  };

  const menuSlot = menu ? slots[menu.index] : null;
  const menuLocked = menu ? isLockedSlot(deckConfig, activePage.id, menu.index) : false;
  const menuEmpty = menuSlot?.type === 'empty';

  return (
    <section className="panel flex flex-col h-full overflow-hidden select-none" aria-label="Deck editor">
      {/* Toolbar: pages + grid size */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-3 h-12 border-b border-line bg-raised/60">
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto" role="tablist" aria-label="Deck pages">
          {topLevelPages(deckConfig).map((page) => {
            const isActive = page.id === rootPageId;
            const isRenaming = renamingPageId === page.id;
            return (
              <div
                key={page.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => !isRenaming && onChangePage(page.id)}
                onDoubleClick={() => {
                  setRenamingPageId(page.id);
                  setRenameValue(page.title);
                }}
                onKeyDown={(e) => e.key === 'Enter' && !isRenaming && onChangePage(page.id)}
                className={`group relative flex items-center gap-1 h-8 rounded-lg ${isActive ? 'pl-3 pr-1.5' : 'px-3'} text-ui font-medium cursor-pointer flex-shrink-0 transition-colors ${
                  isActive ? 'bg-white/[0.08] text-ink' : 'text-ink-2 hover:text-ink hover:bg-white/[0.04]'
                }`}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingPageId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Page name"
                    className="w-28 h-6 px-1.5 rounded-md bg-field border border-brand/60 text-ui outline-none"
                  />
                ) : (
                  <span className="truncate max-w-[140px] pr-1">{page.title || 'Untitled'}</span>
                )}
                {/* Edit controls live on the active tab only, so inactive tabs stay compact. */}
                {!isRenaming && isActive && (
                  <span className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingPageId(page.id);
                        setRenameValue(page.title);
                      }}
                      aria-label={`Rename ${page.title}`}
                      className="p-1 rounded text-ink-3 hover:text-ink"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {topLevelPages(deckConfig).length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onDeletePage(page.id);
                        }}
                        aria-label={`Delete ${page.title}`}
                        className="p-1 rounded text-ink-3 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )}
              </div>
            );
          })}
          <button type="button" onClick={props.onAddPage} className="btn btn-sm btn-ghost flex-shrink-0" title="Add page">
            <Plus className="w-3.5 h-3.5" />
            Page
          </button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Narrow windows get a compact select so the page tabs keep their room. */}
          <select
            value={deckConfig.gridDimension}
            onChange={(e) => props.onChangeGrid(e.target.value as GridDimension)}
            aria-label="Grid size"
            className="field xl:hidden !w-[88px] !h-7 text-xs font-mono tabular-nums"
          >
            {GRID_DIMENSION_OPTIONS.map((dim) => (
              <option key={dim.id} value={dim.id}>
                {dim.rows}×{dim.cols}
              </option>
            ))}
          </select>
          <div className="segmented hidden xl:inline-flex" role="group" aria-label="Grid size">
            {GRID_DIMENSION_OPTIONS.map((dim) => (
              <button
                key={dim.id}
                type="button"
                aria-pressed={deckConfig.gridDimension === dim.id}
                onClick={() => props.onChangeGrid(dim.id)}
                title={`${dim.rows} rows × ${dim.cols} columns (${dim.rows * dim.cols} keys)`}
                className="!px-2 font-mono tabular-nums"
              >
                {dim.rows}×{dim.cols}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={props.onResetDefaults}
            className="btn btn-sm btn-ghost btn-icon"
            title="Reset deck to defaults"
            aria-label="Reset deck to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Device */}
      <div className="flex-1 min-h-0 flex flex-col px-5 pt-2.5 pb-4 bg-[radial-gradient(ellipse_at_top,rgb(255_255_255/0.025),transparent_60%)]">
        <div className="flex-shrink-0 flex items-center justify-between h-7 mb-2">
          <nav className="flex items-center gap-1 text-ui min-w-0" aria-label="Folder path">
            {trail.map((page, i) => {
              const isLast = i === trail.length - 1;
              return (
                <React.Fragment key={page.id}>
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" />}
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => onChangePage(page.id)}
                    className={`truncate rounded px-1 ${
                      isLast ? 'text-ink font-semibold' : 'text-ink-2 hover:text-ink hover:underline'
                    }`}
                  >
                    {page.title || 'Untitled'}
                  </button>
                </React.Fragment>
              );
            })}
            <span className="ml-2 text-micro text-ink-3 tabular-nums">
              {assigned}/{total - (trail.length > 1 ? 1 : 0)} keys
            </span>
          </nav>
          <p className="hidden xl:flex items-center gap-2 text-micro text-ink-3 flex-shrink-0">
            <span>Drag to rearrange</span>
            <span aria-hidden>·</span>
            <span>Right-click for options</span>
            <span aria-hidden>·</span>
            <span>Double-click folders to open</span>
          </p>
          <div className="xl:hidden flex items-center gap-2 text-micro font-medium text-ink-2" title="Phone connection">
            <span className={`w-1.5 h-1.5 rounded-full ${LIVE_DOT[live.tone]}`} />
            {live.label}
          </div>
        </div>

        <div className="flex-1 min-h-0 relative" style={{ containerType: 'size' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-[24px] p-3.5 bg-[linear-gradient(180deg,#0f0f11,#09090a)] border border-white/[0.06] shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.04)]"
            >
              <div
                ref={gridRef}
                role="grid"
                aria-label={`${activePage.title} keys`}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                className="outline-none"
                style={
                  {
                    '--cols': cols,
                    '--rows': rows,
                    '--gap': '12px',
                    '--key':
                      'min(128px, calc((100cqw - 30px - (var(--cols) - 1) * var(--gap)) / var(--cols)), calc((100cqh - 30px - (var(--rows) - 1) * var(--gap)) / var(--rows)))',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(var(--cols), var(--key))',
                    gridTemplateRows: 'repeat(var(--rows), var(--key))',
                    gap: 'var(--gap)',
                  } as React.CSSProperties
                }
              >
                {slots.map((slot, index) => {
                  const locked = isLockedSlot(deckConfig, activePage.id, index);
                  const isSelected = selectedIndex === index;
                  const isDragOver = dragOverIndex === index;
                  const flash = flashes[slot.id];
                  const broken = isSlotBroken(slot, workspaces);
                  const draggable = slot.type !== 'empty' && !locked;

                  return (
                    <DeckKey
                      key={`${slot.id}-${flash?.at ?? 0}`}
                      role="gridcell"
                      aria-selected={isSelected}
                      aria-label={`Key ${index + 1}: ${slot.type === 'empty' ? 'empty' : slot.label}`}
                      slot={slot}
                      index={index}
                      broken={broken}
                      draggable={draggable}
                      onDragStart={(e) => {
                        dragManager.begin(e, { type: 'slot', id: slot.id, slotIndex: index });
                        onSelect(index);
                      }}
                      onDragEnd={() => {
                        dragManager.setDragItem(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnter={(e) => allowDrop(e, index)}
                      onDragOver={(e) => allowDrop(e, index)}
                      onDragLeave={() => dragOverIndex === index && setDragOverIndex(null)}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => {
                        onSelect(index);
                        gridRef.current?.focus();
                      }}
                      onDoubleClick={() => {
                        if (slot.type === 'folder') props.onOpenFolder(index);
                        else if (slot.type === 'back' && trail.length > 1) onChangePage(trail[trail.length - 2].id);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onSelect(index);
                        setMenu({ x: e.clientX, y: e.clientY, index });
                      }}
                      stateClassName={[
                        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                        'hover:brightness-[1.12]',
                        isSelected && 'outline-2 outline-offset-[3px] outline-brand',
                        isDragOver && 'outline-2 outline-dashed outline-offset-[3px] outline-white/70 scale-[1.04]',
                        flash && 'animate-key-flash',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={flash ? ({ '--flash': FLASH_COLORS[flash.state] } as React.CSSProperties) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Context menu */}
      {menu && menuSlot && (
        <div
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed z-50 min-w-[200px] p-1 rounded-xl bg-[#1c1c20] border border-line-strong shadow-2xl animate-pop-in"
          style={{ left: Math.min(menu.x, window.innerWidth - 216), top: Math.min(menu.y, window.innerHeight - 260) }}
        >
          <MenuHeader>Key {menu.index + 1}</MenuHeader>
          {menuSlot.type === 'folder' && (
            <MenuItem icon={FolderOpen} label="Open folder" shortcut="Enter" onClick={() => props.onOpenFolder(menu.index)} close={() => setMenu(null)} />
          )}
          {!menuEmpty && menuSlot.type !== 'folder' && menuSlot.type !== 'back' && (
            <MenuItem icon={Play} label="Test run" shortcut="Enter" onClick={() => props.onRunKey(menu.index)} close={() => setMenu(null)} />
          )}
          <MenuItem icon={Copy} label="Copy" shortcut="Ctrl C" disabled={menuEmpty || menuLocked} onClick={() => props.onCopy(menu.index)} close={() => setMenu(null)} />
          <MenuItem icon={ClipboardPaste} label="Paste" shortcut="Ctrl V" disabled={!props.canPaste || menuLocked} onClick={() => props.onPaste(menu.index)} close={() => setMenu(null)} />
          <MenuItem icon={CopyPlus} label="Duplicate" shortcut="Ctrl D" disabled={menuEmpty || menuLocked} onClick={() => props.onDuplicate(menu.index)} close={() => setMenu(null)} />
          <div className="h-px bg-line my-1" />
          <MenuItem icon={Trash2} label="Clear key" shortcut="Del" danger disabled={menuEmpty || menuLocked} onClick={() => props.onClear(menu.index)} close={() => setMenu(null)} />
        </div>
      )}
    </section>
  );
};

const MenuHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="eyebrow px-2.5 pt-1.5 pb-1">{children}</div>
);

const MenuItem: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  close: () => void;
}> = ({ icon: Icon, label, shortcut, danger, disabled, onClick, close }) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    onClick={() => {
      onClick();
      close();
    }}
    className={`w-full flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-ui text-left disabled:opacity-35 disabled:pointer-events-none ${
      danger ? 'text-red-300 hover:bg-red-500/15' : 'text-ink hover:bg-white/[0.07]'
    }`}
  >
    <Icon className="w-3.5 h-3.5 opacity-80" />
    <span className="flex-1">{label}</span>
    {shortcut && <span className="text-micro text-ink-3 font-mono">{shortcut}</span>}
  </button>
);
