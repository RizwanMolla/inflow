import type {
  DeckConfig,
  DeckPage,
  DeckSlot,
  GridDimension,
  Workspace,
  WorkspaceAction,
} from '../types/workspace';
import { getActionTypeMeta, type KeyPreset } from '../utils/theme';

/**
 * Pure helpers for editing a DeckConfig. Every function returns a new config and
 * never mutates its input, so they can be used directly inside React state setters.
 *
 * Slot ids belong to grid positions: assigning, swapping or clearing a key replaces
 * its content but keeps the id, which the phone uses to report key presses.
 */

export type SlotContent = Omit<DeckSlot, 'id'>;

export const GRID_DIMENSION_OPTIONS: { id: GridDimension; rows: number; cols: number }[] = [
  { id: '2x3', rows: 2, cols: 3 },
  { id: '2x4', rows: 2, cols: 4 },
  { id: '3x4', rows: 3, cols: 4 },
  { id: '3x5', rows: 3, cols: 5 },
  { id: '3x6', rows: 3, cols: 6 },
];

export function getDimensionSlotCount(dim: GridDimension): { rows: number; cols: number; total: number } {
  const [r, c] = (dim || '2x3').split('x').map(Number);
  const rows = r || 2;
  const cols = c || 3;
  return { rows, cols, total: rows * cols };
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const EMPTY_CONTENT: SlotContent = { type: 'empty', label: '', icon: 'Plus' };

export function emptySlot(pageId: string, index: number): DeckSlot {
  return { id: `slot-${pageId}-${index}`, ...EMPTY_CONTENT };
}

function backSlot(pageId: string): DeckSlot {
  return { id: `slot-${pageId}-0`, type: 'back', label: 'Back', icon: 'ArrowLeft' };
}

function touch(config: DeckConfig, pages: DeckPage[]): DeckConfig {
  return { ...config, pages, updatedAt: new Date().toISOString() };
}

export function getPage(config: DeckConfig, pageId: string): DeckPage | undefined {
  return config.pages.find((p) => p.id === pageId);
}

export function topLevelPages(config: DeckConfig): DeckPage[] {
  return config.pages.filter((p) => !p.parentId);
}

/** Root-to-page chain used for the folder breadcrumb. */
export function pageTrail(config: DeckConfig, pageId: string): DeckPage[] {
  const trail: DeckPage[] = [];
  let current = getPage(config, pageId);
  while (current && trail.length < 16) {
    trail.unshift(current);
    current = current.parentId ? getPage(config, current.parentId) : undefined;
  }
  return trail;
}

/** Slots of a page padded with empty keys up to `count`. */
export function padSlots(page: DeckPage | undefined, pageId: string, count: number): DeckSlot[] {
  const slots = page ? [...page.slots] : [];
  for (let i = slots.length; i < count; i++) slots.push(emptySlot(pageId, i));
  return slots;
}

function updatePageSlots(
  config: DeckConfig,
  pageId: string,
  minLength: number,
  fn: (slots: DeckSlot[]) => DeckSlot[]
): DeckConfig {
  return touch(
    config,
    config.pages.map((p) => (p.id === pageId ? { ...p, slots: fn(padSlots(p, p.id, minLength)) } : p))
  );
}

/** A folder page's first key is its Back key and cannot be replaced or moved. */
export function isLockedSlot(config: DeckConfig, pageId: string, index: number): boolean {
  return index === 0 && !!getPage(config, pageId)?.parentId;
}

/** All pages nested under `pageId` (not including it). */
function descendantPageIds(config: DeckConfig, pageId: string): Set<string> {
  const found = new Set<string>();
  let frontier = [pageId];
  while (frontier.length) {
    // Skipping already-seen ids also protects against parent cycles in hand-edited configs.
    const next = config.pages
      .filter((p) => p.parentId && frontier.includes(p.parentId) && p.id !== pageId && !found.has(p.id))
      .map((p) => p.id);
    next.forEach((id) => found.add(id));
    frontier = next;
  }
  return found;
}

function withoutPages(config: DeckConfig, ids: Set<string>): DeckConfig {
  if (ids.size === 0) return config;
  return touch(config, config.pages.filter((p) => !ids.has(p.id)));
}

export function setSlotContent(config: DeckConfig, pageId: string, index: number, content: SlotContent): DeckConfig {
  if (isLockedSlot(config, pageId, index)) return config;
  const previous = getPage(config, pageId)?.slots[index];
  // Replacing a folder key deletes the folder and everything inside it.
  let next = config;
  if (previous?.type === 'folder' && previous.targetId && previous.targetId !== content.targetId) {
    next = withoutPages(next, new Set([previous.targetId, ...descendantPageIds(next, previous.targetId)]));
  }
  return updatePageSlots(next, pageId, index + 1, (slots) => {
    slots[index] = { ...content, id: slots[index].id };
    return slots;
  });
}

export function patchSlot(config: DeckConfig, pageId: string, index: number, patch: Partial<SlotContent>): DeckConfig {
  const page = getPage(config, pageId);
  const current = page?.slots[index];
  if (!current || isLockedSlot(config, pageId, index)) return config;
  let next = updatePageSlots(config, pageId, index + 1, (slots) => {
    slots[index] = { ...slots[index], ...patch };
    return slots;
  });
  // Keep a folder's page title in step with its key title.
  if (current.type === 'folder' && current.targetId && patch.label !== undefined) {
    next = touch(next, next.pages.map((p) => (p.id === current.targetId ? { ...p, title: patch.label || 'Folder' } : p)));
  }
  return next;
}

export function clearSlot(config: DeckConfig, pageId: string, index: number): DeckConfig {
  return setSlotContent(config, pageId, index, EMPTY_CONTENT);
}

/** Moves a key onto another position, swapping with whatever is there. */
export function swapSlots(config: DeckConfig, pageId: string, from: number, to: number): DeckConfig {
  if (from === to || isLockedSlot(config, pageId, from) || isLockedSlot(config, pageId, to)) return config;
  return updatePageSlots(config, pageId, Math.max(from, to) + 1, (slots) => {
    const a = slots[from];
    const b = slots[to];
    slots[from] = { ...b, id: a.id };
    slots[to] = { ...a, id: b.id };
    return slots;
  });
}

export function createFolder(
  config: DeckConfig,
  pageId: string,
  index: number,
  title = 'Folder'
): { config: DeckConfig; folderId: string } {
  const folderId = uid('folder');
  const { total } = getDimensionSlotCount(config.gridDimension);
  const folderPage: DeckPage = {
    id: folderId,
    title,
    parentId: pageId,
    slots: [backSlot(folderId), ...Array.from({ length: total - 1 }, (_, i) => emptySlot(folderId, i + 1))],
  };
  const withPage = touch(config, [...config.pages, folderPage]);
  const next = setSlotContent(withPage, pageId, index, {
    type: 'folder',
    targetId: folderId,
    label: title,
    icon: 'FolderClosed',
    accentColor: 'slate',
  });
  return { config: next, folderId };
}

export function addPage(config: DeckConfig, title: string): { config: DeckConfig; pageId: string } {
  const pageId = uid('page');
  const { total } = getDimensionSlotCount(config.gridDimension);
  const page: DeckPage = {
    id: pageId,
    title,
    slots: Array.from({ length: total }, (_, i) => emptySlot(pageId, i)),
  };
  // Insert after the last top-level page so folder pages stay grouped at the end.
  const pages = [...config.pages];
  const lastTop = pages.map((p) => !p.parentId).lastIndexOf(true);
  pages.splice(lastTop + 1, 0, page);
  return { config: touch(config, pages), pageId };
}

export function renamePage(config: DeckConfig, pageId: string, title: string): DeckConfig {
  return touch(config, config.pages.map((p) => (p.id === pageId ? { ...p, title } : p)));
}

export function deletePage(config: DeckConfig, pageId: string): DeckConfig {
  const removed = new Set([pageId, ...descendantPageIds(config, pageId)]);
  const pruned = withoutPages(config, removed);
  // Clear any folder keys that pointed into the removed pages.
  return touch(
    pruned,
    pruned.pages.map((p) => ({
      ...p,
      slots: p.slots.map((s) =>
        s.type === 'folder' && s.targetId && removed.has(s.targetId) ? { ...EMPTY_CONTENT, id: s.id } : s
      ),
    }))
  );
}

export function resizeGrid(config: DeckConfig, dim: GridDimension): DeckConfig {
  const { total } = getDimensionSlotCount(dim);
  // Keys beyond the new size are kept (just hidden) so shrinking the grid is reversible.
  return {
    ...touch(config, config.pages.map((p) => ({ ...p, slots: padSlots(p, p.id, total) }))),
    gridDimension: dim,
  };
}

export function findSlot(
  config: DeckConfig,
  slotId: string,
  pageId?: string | null
): { page: DeckPage; slot: DeckSlot; index: number } | null {
  const pages = pageId ? config.pages.filter((p) => p.id === pageId) : config.pages;
  for (const page of pages) {
    const index = page.slots.findIndex((s) => s.id === slotId);
    if (index >= 0) return { page, slot: page.slots[index], index };
  }
  return pageId ? findSlot(config, slotId) : null;
}

/** Clears every key that runs the given workspace or one of its steps. */
export function removeWorkspaceRefs(config: DeckConfig, workspaceId: string): DeckConfig {
  return touch(
    config,
    config.pages.map((p) => ({
      ...p,
      slots: p.slots.map((s) =>
        (s.type === 'workspace' && s.targetId === workspaceId) ||
        (s.type === 'quick_action' && s.targetWorkspaceId === workspaceId)
          ? { ...EMPTY_CONTENT, id: s.id }
          : s
      ),
    }))
  );
}

/** True when a key points at a workspace or step that no longer exists. */
export function isSlotBroken(slot: DeckSlot, workspaces: Workspace[]): boolean {
  if (slot.type === 'workspace') return !workspaces.some((w) => w.id === slot.targetId);
  if (slot.type === 'quick_action') {
    const ws = workspaces.find((w) => w.id === slot.targetWorkspaceId);
    return !ws?.actions.some((a) => a.id === slot.targetId);
  }
  if (slot.type === 'custom') return !slot.action;
  return false;
}

// --- Content factories ---

export function contentFromWorkspace(ws: Workspace): SlotContent {
  return {
    type: 'workspace',
    targetId: ws.id,
    label: ws.name,
    icon: ws.icon || 'Zap',
    accentColor: ws.accentColor || 'indigo',
  };
}

export function contentFromWorkspaceStep(action: WorkspaceAction, workspaceId: string): SlotContent {
  return {
    type: 'quick_action',
    targetId: action.id,
    targetWorkspaceId: workspaceId,
    label: action.label,
    icon: getActionTypeMeta(action.type).defaultIcon,
    accentColor: 'blue',
  };
}

export function contentFromPreset(preset: KeyPreset): SlotContent {
  return {
    type: 'custom',
    label: preset.label,
    icon: preset.icon,
    accentColor: preset.accentColor,
    action: preset.action ? { ...preset.action, id: uid('act') } : undefined,
  };
}

/** Deep copy for paste/duplicate so the copy owns its own inline action. */
export function cloneContent(slot: DeckSlot): SlotContent {
  const { id: _id, ...content } = slot;
  return {
    ...content,
    action: content.action ? { ...content.action, id: uid('act') } : undefined,
  };
}
