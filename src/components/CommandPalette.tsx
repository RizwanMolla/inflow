import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import type { AccentColor } from '../types/workspace';
import { accentStyle, renderWorkspaceIcon } from '../utils/theme';

export interface PaletteItem {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  icon: string;
  accentColor?: AccentColor;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: PaletteItem[];
}

function score(item: PaletteItem, words: string[]): number {
  if (words.length === 0) return 1;
  const label = item.label.toLowerCase();
  const hay = `${label} ${item.sublabel?.toLowerCase() ?? ''} ${item.group.toLowerCase()}`;
  if (!words.every((w) => hay.includes(w))) return 0;
  // Prefer label prefix matches, then label matches, then anything else.
  return label.startsWith(words[0]) ? 3 : label.includes(words[0]) ? 2 : 1;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, items }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const scored = items
      .map((item, order) => ({ item, s: score(item, words), order }))
      .filter((r) => r.s > 0);
    if (words.length) {
      // Keep each group contiguous (so headings never repeat), ranking groups by their best match.
      const best = new Map<string, number>();
      for (const r of scored) best.set(r.item.group, Math.max(best.get(r.item.group) ?? 0, r.s));
      scored.sort(
        (a, b) =>
          (best.get(b.item.group) ?? 0) - (best.get(a.item.group) ?? 0) ||
          a.item.group.localeCompare(b.item.group) ||
          b.s - a.s ||
          a.order - b.order
      );
    }
    return scored.map((r) => r.item).slice(0, 60);
  }, [items, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!isOpen) return null;

  const runAt = (i: number) => {
    const item = results[i];
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runAt(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = '';

  return (
    <div className="modal-backdrop !items-start pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-[600px]" role="dialog" aria-modal="true" aria-label="Command bar" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line flex-shrink-0">
          <Search className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Launch a workspace, run a key, or search commands…"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            className="flex-1 bg-transparent outline-none text-base placeholder:text-ink-3"
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <p className="py-10 text-center text-ui text-ink-3">Nothing matches “{query}”.</p>}
          {results.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <React.Fragment key={item.id}>
                {showGroup && <div className="eyebrow px-2.5 pt-2.5 pb-1">{item.group}</div>}
                <div
                  id={`palette-${item.id}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => runAt(i)}
                  className={`flex items-center gap-3 px-2.5 h-11 rounded-xl cursor-pointer ${i === active ? 'bg-white/[0.08]' : ''}`}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/[0.08] text-[color-mix(in_oklab,var(--accent)_75%,white)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)]"
                    style={accentStyle(item.accentColor ?? 'slate')}
                  >
                    {renderWorkspaceIcon(item.icon, 'w-3.5 h-3.5')}
                  </span>
                  <span className="text-ui font-medium truncate">{item.label}</span>
                  {item.sublabel && <span className="text-ui text-ink-3 truncate">{item.sublabel}</span>}
                  <span className="ml-auto flex items-center gap-1.5 text-micro text-ink-3 flex-shrink-0">
                    {i === active ? (
                      <>
                        {item.hint ?? 'Run'}
                        <CornerDownLeft className="w-3 h-3" />
                      </>
                    ) : null}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-4 px-4 h-10 border-t border-line text-micro text-ink-3 flex-shrink-0">
          <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> Navigate</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd> Run</span>
        </div>
      </div>
    </div>
  );
};
