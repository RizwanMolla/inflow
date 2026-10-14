import React, { useEffect, useState } from 'react';
import { Circle, FolderSearch, Keyboard, X } from 'lucide-react';
import type { ActionType, WorkspaceAction } from '../types/workspace';
import { ACTION_TYPE_META, ACTION_TYPE_ORDER, MEDIA_KEYS, getActionTypeMeta } from '../utils/theme';
import { isTauriEnvironment } from '../services/native';

const COMMON_APPS = [
  { label: 'VS Code', command: 'code' },
  { label: 'Terminal', command: 'wt' },
  { label: 'Notepad', command: 'notepad' },
  { label: 'Chrome', command: 'chrome' },
  { label: 'Calculator', command: 'calc' },
];

const DELAY_PRESETS = [250, 500, 1000, 2000];

export const ActionTypeSelect: React.FC<{
  value: ActionType;
  onChange: (type: ActionType) => void;
  className?: string;
  'aria-label'?: string;
}> = ({ value, onChange, className = '', ...rest }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as ActionType)}
    className={`field ${className}`}
    aria-label={rest['aria-label'] || 'Action type'}
  >
    {ACTION_TYPE_ORDER.map((t) => (
      <option key={t} value={t}>
        {ACTION_TYPE_META[t].label}
      </option>
    ))}
  </select>
);

interface ActionTargetFieldProps {
  action: WorkspaceAction;
  onChange: (updates: Partial<WorkspaceAction>) => void;
  showHint?: boolean;
}

/** The type-specific input for an action's target (URL, path, shortcut, snippet, media key, delay). */
export const ActionTargetField: React.FC<ActionTargetFieldProps> = ({ action, onChange, showHint = true }) => {
  const meta = getActionTypeMeta(action.type);

  const field = (() => {
    switch (action.type) {
      case 'hotkey':
        return <HotkeyRecorder value={action.target} onChange={(target) => onChange({ target })} />;
      case 'text':
        return (
          <textarea
            value={action.target}
            onChange={(e) => onChange({ target: e.target.value })}
            placeholder={meta.placeholder}
            rows={2}
            className="field"
            aria-label="Text to type"
          />
        );
      case 'media':
        return (
          <select
            value={action.target || 'play_pause'}
            onChange={(e) => onChange({ target: e.target.value })}
            className="field"
            aria-label="Media key"
          >
            {MEDIA_KEYS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        );
      case 'delay':
        return (
          <div className="flex items-center gap-1.5">
            <div className="relative w-28 flex-shrink-0">
              <input
                type="number"
                min={0}
                max={60000}
                step={50}
                value={action.target}
                onChange={(e) => onChange({ target: e.target.value })}
                className="field pr-8 tabular-nums"
                aria-label="Delay in milliseconds"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-micro text-ink-3 pointer-events-none">ms</span>
            </div>
            {DELAY_PRESETS.map((ms) => (
              <button
                key={ms}
                type="button"
                onClick={() => onChange({ target: String(ms) })}
                className={`btn btn-sm ${String(ms) === action.target ? 'btn-secondary' : 'btn-ghost'} tabular-nums`}
              >
                {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
              </button>
            ))}
          </div>
        );
      default:
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={action.target}
                onChange={(e) => onChange({ target: e.target.value })}
                placeholder={meta.placeholder}
                spellCheck={false}
                className="field font-mono text-xs"
                aria-label={meta.label}
              />
              {(action.type === 'folder' || action.type === 'file' || action.type === 'app') && (
                <BrowseButton action={action} onChange={onChange} />
              )}
            </div>
            {action.type === 'app' && (
              <div className="flex items-center flex-wrap gap-1">
                <span className="text-micro text-ink-3 mr-0.5">Suggestions</span>
                {COMMON_APPS.map((app) => (
                  <button
                    key={app.command}
                    type="button"
                    onClick={() => onChange({ target: app.command, label: app.label })}
                    className="h-6 px-2 rounded-md text-micro text-ink-2 bg-white/[0.04] border border-line hover:text-ink hover:border-line-strong transition-colors"
                  >
                    {app.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
    }
  })();

  return (
    <div className="space-y-1">
      {field}
      {showHint && <p className="text-micro text-ink-3">{meta.hint}</p>}
    </div>
  );
};

const BrowseButton: React.FC<{ action: WorkspaceAction; onChange: (u: Partial<WorkspaceAction>) => void }> = ({
  action,
  onChange,
}) => {
  const applyPath = (path: string) => {
    const filename = path.split(/[\\/]/).pop() || path;
    const clean = filename.replace(/\.[^/.]+$/, '');
    const isGenericLabel = !action.label || /^(open|launch) /i.test(action.label) || action.label === getActionTypeMeta(action.type).label;
    onChange({
      target: path,
      ...(isGenericLabel && clean ? { label: action.type === 'app' ? `Launch ${clean}` : `Open ${filename}` } : {}),
    });
  };

  const browse = async () => {
    try {
      if (isTauriEnvironment()) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: action.type === 'folder',
          multiple: false,
          filters:
            action.type === 'app'
              ? [{ name: 'Applications', extensions: ['exe', 'bat', 'cmd', 'lnk'] }]
              : undefined,
          title: action.type === 'folder' ? 'Select folder' : action.type === 'app' ? 'Select application' : 'Select file',
        });
        if (typeof selected === 'string') applyPath(selected);
        return;
      }
      // The browser can't reveal real paths; use the picked name so the simulator still shows something useful.
      const input = document.createElement('input');
      input.type = 'file';
      if (action.type === 'folder') input.setAttribute('webkitdirectory', '');
      if (action.type === 'app') input.accept = '.exe,.bat,.cmd,.lnk';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) applyPath(file.webkitRelativePath?.split('/')[0] || file.name);
      };
      input.click();
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  return (
    <button type="button" onClick={browse} className="btn btn-secondary flex-shrink-0" title="Browse">
      <FolderSearch className="w-3.5 h-3.5" />
      Browse
    </button>
  );
};

// --- Hotkey recorder ---

const CODE_NAMES: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  NumpadEnter: 'Enter',
  Escape: 'Escape',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  PrintScreen: 'PrintScreen',
  Pause: 'Pause',
  CapsLock: 'CapsLock',
  Slash: '/',
  Period: '.',
  Comma: ',',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
};

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'OS']);

function mainKeyName(e: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3);
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5);
  if (/^Numpad\d$/.test(e.code)) return e.code.slice(6);
  if (/^F\d{1,2}$/.test(e.code)) return e.code;
  return CODE_NAMES[e.code] ?? (e.key.length === 1 ? e.key.toUpperCase() : null);
}

function modifiersOf(e: KeyboardEvent): string[] {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.shiftKey) mods.push('Shift');
  if (e.altKey) mods.push('Alt');
  if (e.metaKey) mods.push('Win');
  return mods;
}

export const KeyCombo: React.FC<{ combo: string; className?: string }> = ({ combo, className = '' }) => {
  const parts = combo.split('+').map((p) => p.trim()).filter(Boolean);
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {parts.map((p, i) => (
        <kbd key={`${p}-${i}`} className="kbd">
          {p}
        </kbd>
      ))}
    </span>
  );
};

const HotkeyRecorder: React.FC<{ value: string; onChange: (combo: string) => void }> = ({ value, onChange }) => {
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const mods = modifiersOf(e);
      const key = mainKeyName(e);
      if (!key) {
        setPreview(mods.join('+'));
        return;
      }
      // A bare Escape cancels; with modifiers it is a real shortcut (e.g. Ctrl+Shift+Escape).
      if (key === 'Escape' && mods.length === 0) {
        setRecording(false);
        return;
      }
      onChange([...mods, key].join('+'));
      setRecording(false);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recording, onChange]);

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`flex-1 min-w-0 h-8 px-2 rounded-lg border flex items-center gap-2 ${
          recording ? 'border-brand/70 bg-brand/[0.06]' : 'border-line bg-field'
        }`}
      >
        {recording ? (
          <span className="flex items-center gap-2 text-ui text-brand-ink">
            <Circle className="w-2.5 h-2.5 fill-current animate-pulse" />
            {preview ? <KeyCombo combo={`${preview}+…`} /> : 'Press a shortcut…'}
          </span>
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ctrl+Shift+M"
            spellCheck={false}
            aria-label="Shortcut"
            className="flex-1 min-w-0 bg-transparent outline-none font-mono text-xs text-ink placeholder:text-ink-3"
          />
        )}
        {!recording && value && <KeyCombo combo={value} className="flex-shrink-0" />}
      </div>
      {recording ? (
        <button type="button" onClick={() => setRecording(false)} className="btn btn-secondary flex-shrink-0">
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setPreview('');
            setRecording(true);
          }}
          className="btn btn-secondary flex-shrink-0"
        >
          <Keyboard className="w-3.5 h-3.5" />
          Record
        </button>
      )}
    </div>
  );
};
