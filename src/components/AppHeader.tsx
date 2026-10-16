import React from 'react';
import { CircleHelp, Download, Plus, QrCode, Search, Sparkles, Upload } from 'lucide-react';
import type { LiveTone } from './DeckCanvas';

interface AppHeaderProps {
  isTauri: boolean;
  live: { tone: LiveTone; label: string };
  onOpenPalette: () => void;
  onOpenPairing: () => void;
  onOpenTemplates: () => void;
  onOpenGuide: () => void;
  onImport: () => void;
  onExport: () => void;
  onNewWorkspace: () => void;
}

const PILL_TONE: Record<LiveTone, { dot: string; text: string }> = {
  live: { dot: 'bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153/0.8)]', text: 'text-emerald-200' },
  idle: { dot: 'bg-amber-400 animate-pulse', text: 'text-ink-2' },
  offline: { dot: 'bg-red-500', text: 'text-red-300' },
  sim: { dot: 'bg-neutral-500', text: 'text-ink-2' },
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  isTauri,
  live,
  onOpenPalette,
  onOpenPairing,
  onOpenTemplates,
  onOpenGuide,
  onImport,
  onExport,
  onNewWorkspace,
}) => {
  const tone = PILL_TONE[live.tone];
  return (
    <header className="flex-shrink-0 z-30 h-14 px-4 flex items-center justify-between gap-4 border-b border-line bg-surface/80 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/logo.png"
          alt="InFlow"
          className="w-8 h-8 rounded-[10px] object-cover shadow-[0_4px_14px_-4px_rgb(239_68_68/0.4)]"
        />
        <div className="leading-tight">
          <h1 className="text-[15px] font-semibold tracking-tight">InFlow</h1>
          <p className="text-micro text-ink-3">{isTauri ? 'Deck studio' : 'Browser simulator'}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="hidden md:flex items-center gap-2 w-[300px] h-8 px-3 rounded-lg bg-white/[0.04] border border-line text-ui text-ink-3 hover:border-line-strong hover:text-ink-2 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Search or run anything…</span>
        <kbd className="kbd">Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenPairing}
          className="flex items-center gap-2 h-8 px-3 rounded-full border border-line bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
          title="Phone connection: click to pair"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
          <span className={`text-ui font-medium ${tone.text}`}>{live.label}</span>
        </button>

        <div className="w-px h-5 bg-line mx-1.5" />

        <button type="button" onClick={onOpenPairing} className="btn btn-ghost">
          <QrCode className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Pair phone</span>
        </button>
        <button type="button" onClick={onOpenTemplates} className="btn btn-ghost">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Templates</span>
        </button>
        <button type="button" onClick={onImport} className="btn btn-ghost btn-icon" title="Import configuration" aria-label="Import configuration">
          <Upload className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onExport} className="btn btn-ghost btn-icon" title="Export configuration" aria-label="Export configuration">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onOpenGuide} className="btn btn-ghost btn-icon" title="Guide" aria-label="Open guide">
          <CircleHelp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onNewWorkspace} className="btn btn-primary ml-1">
          <Plus className="w-3.5 h-3.5" />
          New workspace
        </button>
      </div>
    </header>
  );
};
