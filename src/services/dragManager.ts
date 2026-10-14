import type { DragEvent } from 'react';

/**
 * What is being dragged onto the deck:
 *  workspace — a workspace from the library
 *  action    — one step of a workspace
 *  preset    — a built-in key (media key, hotkey, deck folder…)
 *  slot      — an existing key being moved to another position
 */
export interface DragItemData {
  type: 'workspace' | 'action' | 'preset' | 'slot';
  id: string;
  workspaceId?: string;
  slotIndex?: number;
  title?: string;
}

type DragListener = (item: DragItemData | null) => void;

// WebView2 sometimes drops custom dataTransfer payloads, so the active drag is mirrored here.
class DragStateService {
  private activeItem: DragItemData | null = null;
  private listeners: Set<DragListener> = new Set();

  setDragItem(item: DragItemData | null) {
    this.activeItem = item;
    this.notify();
  }

  getDragItem(): DragItemData | null {
    return this.activeItem;
  }

  subscribe(listener: DragListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Starts a drag carrying `item` both in dataTransfer and in memory. */
  begin(e: DragEvent, item: DragItemData) {
    this.setDragItem(item);
    const json = JSON.stringify(item);
    e.dataTransfer.setData('text/plain', json);
    e.dataTransfer.setData('application/json', json);
    e.dataTransfer.effectAllowed = item.type === 'slot' ? 'move' : 'copy';
  }

  /** Reads the dragged item from a drop event, falling back to the in-memory copy. */
  read(e: DragEvent): DragItemData | null {
    try {
      const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.type === 'string' && typeof parsed.id === 'string') return parsed;
      }
    } catch {
      // not one of ours; fall through
    }
    return this.activeItem;
  }

  private notify() {
    this.listeners.forEach((l) => l(this.activeItem));
  }
}

export const dragManager = new DragStateService();
