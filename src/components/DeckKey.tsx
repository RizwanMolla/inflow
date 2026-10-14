import React from 'react';
import { AlertTriangle, FolderClosed, Layers } from 'lucide-react';
import type { DeckSlot } from '../types/workspace';
import { accentStyle, ICON_LIBRARY } from '../utils/theme';

// `slot` is also a native HTML attribute, so drop it before redefining it.
interface DeckKeyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'slot'> {
  slot: DeckSlot;
  index?: number;
  broken?: boolean;
  /** Extra classes for state (selection rings, drag-over, flash). */
  stateClassName?: string;
}

/**
 * A single Stream Deck key face. Purely visual: interaction handlers are passed
 * through so the same component serves the canvas, the inspector preview and drag ghosts.
 */
export const DeckKey = React.forwardRef<HTMLDivElement, DeckKeyProps>(function DeckKey(
  { slot, index, broken, stateClassName = '', style, ...rest },
  ref
) {
  const isEmpty = slot.type === 'empty';
  const isBack = slot.type === 'back';
  const Icon = ICON_LIBRARY[slot.icon] || (isEmpty ? ICON_LIBRARY.Plus : null);

  const variant = isEmpty
    ? 'deck-key--empty'
    : isBack
    ? 'deck-key--neutral'
    : broken
    ? 'deck-key--broken'
    : '';

  return (
    <div
      ref={ref}
      className={`deck-key ${variant} ${stateClassName}`}
      style={{ ...accentStyle(slot.accentColor), ...style }}
      {...rest}
    >
      {index !== undefined && <span className="deck-key__index">{index + 1}</span>}

      {slot.type === 'folder' && <FolderClosed className="deck-key__badge" aria-hidden />}
      {slot.type === 'workspace' && !broken && <Layers className="deck-key__badge" aria-hidden />}
      {broken && <AlertTriangle className="deck-key__badge !text-amber-400" aria-label="Target missing" />}

      {Icon ? (
        <Icon className="deck-key__icon" aria-hidden />
      ) : (
        <span className="deck-key__emoji" aria-hidden>
          {slot.icon}
        </span>
      )}

      {!isEmpty && slot.label && <span className="deck-key__title">{slot.label}</span>}
    </div>
  );
});
