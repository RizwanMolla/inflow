import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ICON_LIBRARY, PICKABLE_ICONS, isLibraryIcon } from '../utils/theme';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  className?: string;
}

/** Splits "MonitorUp" into "monitor up" so searches match words. */
const searchable = (name: string) => name.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase();

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, className = '' }) => {
  const [query, setQuery] = useState('');
  const emojiValue = isLibraryIcon(value) ? '' : value;

  const icons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? PICKABLE_ICONS.filter((n) => searchable(n).includes(q)) : PICKABLE_ICONS;
  }, [query]);

  return (
    <div className={`flex flex-col gap-2 min-h-0 ${className}`}>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${PICKABLE_ICONS.length} icons`}
            aria-label="Search icons"
            className="field pl-8"
          />
        </div>
        <input
          value={emojiValue}
          onChange={(e) => {
            // Keep only the first grapheme so a pasted string doesn't become a label.
            const first = [...new Intl.Segmenter().segment(e.target.value.trim())][0]?.segment;
            if (first) onChange(first);
          }}
          placeholder="😀"
          aria-label="Use an emoji instead"
          title="Use an emoji instead"
          className="field !w-11 text-center !px-0"
        />
      </div>
      <div
        role="listbox"
        aria-label="Icons"
        className="flex-1 min-h-0 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(30px,1fr))] gap-1 content-start pr-0.5"
      >
        {icons.map((name) => {
          const Icon = ICON_LIBRARY[name];
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={selected}
              title={name}
              onClick={() => onChange(name)}
              className={`aspect-square rounded-lg flex items-center justify-center transition-colors ${
                selected
                  ? 'bg-brand text-white shadow-[0_0_0_1px_rgb(255_255_255/0.15)]'
                  : 'text-ink-2 hover:text-ink hover:bg-white/[0.07]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
        {icons.length === 0 && (
          <p className="col-span-full py-4 text-center text-micro text-ink-3">No icons match “{query}”</p>
        )}
      </div>
    </div>
  );
};
