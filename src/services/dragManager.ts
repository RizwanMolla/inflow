export interface DragItemData {
  type: 'workspace' | 'action';
  id: string;
  workspaceId?: string;
  title?: string;
}

type DragListener = (item: DragItemData | null) => void;

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

  private notify() {
    this.listeners.forEach((l) => l(this.activeItem));
  }
}

export const dragManager = new DragStateService();
