import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import type { DeckSlot } from '../types/workspace';
import { DeckKey } from './DeckKey';
import { KeyCombo } from './ActionFields';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const demoKey = (label: string, icon: string, accentColor: DeckSlot['accentColor'], type: DeckSlot['type'] = 'custom'): DeckSlot => ({
  id: label,
  type,
  label,
  icon,
  accentColor,
});

const SLIDES: {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}[] = [
  {
    eyebrow: 'Welcome',
    title: 'Your phone becomes a Stream Deck',
    body: 'Design a grid of keys here, pair your phone once, and every tap runs on this PC: whole workspaces, single apps, hotkeys or media controls.',
    visual: (
      <div className="grid grid-cols-3 gap-2.5 w-[260px]">
        <DeckKey slot={demoKey('Dev Mode', 'Code2', 'cyan', 'workspace')} />
        <DeckKey slot={demoKey('Mute', 'MicOff', 'rose')} />
        <DeckKey slot={demoKey('Play', 'Play', 'amber')} />
        <DeckKey slot={demoKey('Job Hunt', 'Briefcase', 'emerald', 'workspace')} />
        <DeckKey slot={demoKey('Lock PC', 'Lock', 'slate')} />
        <DeckKey slot={demoKey('Media', 'Headphones', 'amber', 'folder')} />
      </div>
    ),
  },
  {
    eyebrow: 'Workspaces',
    title: 'One key, a whole setup',
    body: 'A workspace is a multi-action: open sites, folders and apps, wait for them, then send a shortcut. Put it on a key and your morning routine is a single tap.',
    visual: (
      <ol className="w-[300px] space-y-1.5 text-ui">
        {[
          ['#38bdf8', 'Open website', 'github.com/notifications'],
          ['#fbbf24', 'Open folder', 'D:\\Projects\\inflow'],
          ['#a78bfa', 'Launch app', 'code .'],
          ['#a1a1aa', 'Delay', '1500 ms'],
        ].map(([color, label, target], i) => (
          <li key={label} className="flex items-center gap-2.5 px-3 h-10 rounded-xl border border-line bg-white/[0.03]">
            <span className="w-5 h-5 rounded-md text-micro font-semibold flex items-center justify-center tabular-nums" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
              {i + 1}
            </span>
            <span>{label}</span>
            <span className="ml-auto text-micro text-ink-3 font-mono truncate max-w-[45%]">{target}</span>
          </li>
        ))}
        <li className="flex items-center gap-2.5 px-3 h-10 rounded-xl border border-line bg-white/[0.03]">
          <span className="w-5 h-5 rounded-md text-micro font-semibold flex items-center justify-center bg-pink-400/15 text-pink-400">5</span>
          <span>Hotkey</span>
          <KeyCombo combo="Win+Up" className="ml-auto" />
        </li>
      </ol>
    ),
  },
  {
    eyebrow: 'Build your deck',
    title: 'Drag, drop, done',
    body: 'Drag workspaces or built-in actions onto keys, drag keys to rearrange them, and use folders to nest more keys. Press Ctrl K anywhere to launch something without touching the mouse.',
    visual: (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-[76px]"><DeckKey slot={demoKey('Volume +', 'Volume2', 'amber')} /></div>
          <ArrowRight className="w-4 h-4 text-ink-3" />
          <div className="w-[76px]"><DeckKey slot={{ id: 'e', type: 'empty', label: '', icon: 'Plus' }} stateClassName="outline-2 outline-dashed outline-offset-[3px] outline-white/60" /></div>
        </div>
        <div className="flex items-center gap-2 text-ui text-ink-2">
          <KeyCombo combo="Ctrl+K" /> opens the command bar
        </div>
      </div>
    ),
  },
  {
    eyebrow: 'Pair',
    title: 'Scan once, stay connected',
    body: 'Click “Pair phone” in the top bar and scan the QR code with the InFlow Companion app. Closing this window keeps the deck running in the system tray.',
    visual: (
      <div className="w-[150px] h-[150px] rounded-2xl bg-white p-3 grid grid-cols-5 grid-rows-5 gap-1" aria-hidden>
        {Array.from({ length: 25 }, (_, i) => (
          <span key={i} className={`rounded-[3px] ${[0, 1, 3, 5, 6, 8, 12, 14, 16, 18, 19, 20, 21, 23, 24].includes(i) ? 'bg-neutral-900' : 'bg-transparent'}`} />
        ))}
      </div>
    ),
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, SLIDES.length - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="modal-backdrop">
      <div className="modal max-w-[520px]" role="dialog" aria-modal="true" aria-labelledby="onb-title">
        <button type="button" onClick={onClose} className="btn btn-ghost btn-icon absolute top-3 right-3 z-10" aria-label="Close guide">
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="h-[250px] flex items-center justify-center bg-[radial-gradient(ellipse_at_top,rgb(239_68_68/0.12),transparent_65%)] border-b border-line">
          <div key={step} className="animate-pop-in">{slide.visual}</div>
        </div>

        <div className="px-7 pt-6 pb-5 space-y-2 min-h-[150px]">
          <p className="eyebrow !text-brand-ink">{slide.eyebrow}</p>
          <h2 id="onb-title" className="text-xl font-semibold tracking-tight">{slide.title}</h2>
          <p className="text-sm text-ink-2 leading-relaxed">{slide.body}</p>
        </div>

        <footer className="flex items-center justify-between px-7 pb-6">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                aria-current={i === step}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-brand' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="btn btn-secondary">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button type="button" onClick={() => (isLast ? onComplete() : setStep(step + 1))} className="btn btn-primary">
              {isLast ? 'Get started' : 'Next'}
              {isLast ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
