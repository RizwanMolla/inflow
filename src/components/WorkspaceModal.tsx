import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Check, Loader2, Play, Plus, Trash2, X } from 'lucide-react';
import type { AccentColor, ActionType, Workspace, WorkspaceAction } from '../types/workspace';
import {
  ACCENT_COLORS,
  ACTION_TYPE_META,
  ACTION_TYPE_ORDER,
  accentStyle,
  defaultTargetFor,
  getActionTypeMeta,
  renderWorkspaceIcon,
} from '../utils/theme';
import { LauncherService } from '../services/launcher';
import { uid } from '../services/deckOps';
import { ActionTargetField, ActionTypeSelect } from './ActionFields';
import { IconPicker } from './IconPicker';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workspace: Workspace) => void;
  onDelete?: (workspace: Workspace) => void;
  initialWorkspace?: Workspace | null;
}

function newStep(type: ActionType): WorkspaceAction {
  return { id: uid('act'), type, label: ACTION_TYPE_META[type].label, target: defaultTargetFor(type) };
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ isOpen, onClose, onSave, onDelete, initialWorkspace }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Code2');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState<AccentColor>('indigo');
  const [actions, setActions] = useState<WorkspaceAction[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg?: string } | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialWorkspace?.name || '');
    setIcon(initialWorkspace?.icon || 'Code2');
    setDescription(initialWorkspace?.description || '');
    setAccentColor(initialWorkspace?.accentColor || 'indigo');
    setActions(
      initialWorkspace?.actions?.length ? structuredClone(initialWorkspace.actions) : [newStep('url')]
    );
    setErrorMsg('');
    setTestResult(null);
    setTesting(null);
    setShowIconPicker(false);
    setShowAddMenu(false);
  }, [isOpen, initialWorkspace]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showIconPicker || showAddMenu) {
        setShowIconPicker(false);
        setShowAddMenu(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, showIconPicker, showAddMenu, onClose]);

  if (!isOpen) return null;

  const updateAction = (id: string, updates: Partial<WorkspaceAction>) =>
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));

  const changeType = (act: WorkspaceAction, type: ActionType) => {
    const prevMeta = getActionTypeMeta(act.type);
    updateAction(act.id, {
      type,
      target: defaultTargetFor(type),
      ...(act.label === prevMeta.label || !act.label ? { label: ACTION_TYPE_META[type].label } : {}),
    });
  };

  const addStep = (type: ActionType) => {
    setActions((prev) => [...prev, newStep(type)]);
    setShowAddMenu(false);
    requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  };

  const removeStep = (id: string) => {
    if (actions.length <= 1) {
      setErrorMsg('A workspace needs at least one step.');
      return;
    }
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= actions.length) return;
    setActions((prev) => {
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  const testStep = async (action: WorkspaceAction) => {
    setTesting(action.id);
    setTestResult(null);
    const res = await LauncherService.executeAction(action);
    setTesting(null);
    setTestResult({ id: action.id, success: res.success, msg: res.error });
    setTimeout(() => setTestResult((r) => (r?.id === action.id ? null : r)), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrorMsg('Give the workspace a name.');
    const missing = actions.findIndex((a) => a.type !== 'delay' && !a.target.trim());
    if (missing >= 0) return setErrorMsg(`Step ${missing + 1} (${actions[missing].label || 'Untitled'}) needs a target.`);

    onSave({
      id: initialWorkspace?.id || uid('ws'),
      name: name.trim(),
      icon,
      description: description.trim(),
      accentColor,
      actions: actions.map((a) => ({ ...a, label: a.label.trim() || getActionTypeMeta(a.type).label })),
      launchCount: initialWorkspace?.launchCount || 0,
      lastLaunchedAt: initialWorkspace?.lastLaunchedAt,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} className="modal max-w-2xl" role="dialog" aria-modal="true" aria-labelledby="ws-modal-title">
        <header className="flex items-center justify-between px-5 h-14 border-b border-line flex-shrink-0">
          <div>
            <h2 id="ws-modal-title" className="text-base font-semibold">
              {initialWorkspace ? 'Edit workspace' : 'New workspace'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div role="alert" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-ui text-red-300">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Identity */}
          <div className="flex gap-3">
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowIconPicker((v) => !v)}
                className="w-[74px] h-[74px] rounded-2xl flex items-center justify-center border border-white/10 text-[color-mix(in_oklab,var(--accent)_75%,white)] bg-[color-mix(in_oklab,var(--accent)_16%,#18181b)] hover:brightness-110 transition"
                style={accentStyle(accentColor)}
                aria-label="Change icon"
                title="Change icon"
              >
                {renderWorkspaceIcon(icon, 'w-6 h-6 text-[22px]')}
              </button>
              {showIconPicker && (
                <div className="absolute left-0 top-[82px] z-30 w-[300px] h-[280px] p-2.5 rounded-xl bg-[#1c1c20] border border-line-strong shadow-2xl animate-pop-in flex">
                  <IconPicker
                    value={icon}
                    onChange={(v) => {
                      setIcon(v);
                      setShowIconPicker(false);
                    }}
                    className="flex-1"
                  />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name, e.g. Frontend Dev"
                aria-label="Workspace name"
                autoFocus={!initialWorkspace}
                className="field !h-9 text-sm font-medium"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this workspace for? (optional)"
                aria-label="Description"
                className="field"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="eyebrow w-14">Color</span>
            <div className="flex items-center gap-2" role="radiogroup" aria-label="Workspace color">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={accentColor === c.id}
                  title={c.label}
                  onClick={() => setAccentColor(c.id)}
                  className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                    accentColor === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#18181b]' : ''
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Steps</h3>
                <p className="text-micro text-ink-3">Run top to bottom when the key is pressed.</p>
              </div>
              <div className="relative">
                <button type="button" onClick={() => setShowAddMenu((v) => !v)} className="btn btn-sm btn-secondary" aria-expanded={showAddMenu}>
                  <Plus className="w-3.5 h-3.5" />
                  Add step
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 top-9 z-30 w-[300px] p-1.5 rounded-xl bg-[#1c1c20] border border-line-strong shadow-2xl animate-pop-in grid grid-cols-2 gap-1">
                    {ACTION_TYPE_ORDER.map((type) => {
                      const meta = ACTION_TYPE_META[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => addStep(type)}
                          className="flex items-center gap-2 h-9 px-2.5 rounded-lg text-ui text-left hover:bg-white/[0.07]"
                        >
                          <meta.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.hex }} />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <ol className="space-y-2">
              {actions.map((act, index) => {
                const meta = getActionTypeMeta(act.type);
                const result = testResult?.id === act.id ? testResult : null;
                return (
                  <li key={act.id} className="rounded-xl border border-line bg-white/[0.02] p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-micro font-semibold tabular-nums"
                        style={{ background: `color-mix(in oklab, ${meta.hex} 16%, transparent)`, color: meta.hex }}
                        aria-label={`Step ${index + 1}`}
                      >
                        {index + 1}
                      </span>
                      <ActionTypeSelect value={act.type} onChange={(t) => changeType(act, t)} className="!w-40 flex-shrink-0" />
                      <input
                        value={act.label}
                        onChange={(e) => updateAction(act.id, { label: e.target.value })}
                        placeholder="Step name"
                        aria-label={`Step ${index + 1} name`}
                        className="field flex-1 min-w-0"
                      />
                      <div className="flex items-center flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => testStep(act)}
                          disabled={testing === act.id}
                          className="btn btn-sm btn-ghost btn-icon"
                          title="Test this step"
                          aria-label={`Test step ${index + 1}`}
                        >
                          {testing === act.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                        </button>
                        <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} className="btn btn-sm btn-ghost btn-icon" aria-label="Move up">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => moveStep(index, 1)} disabled={index === actions.length - 1} className="btn btn-sm btn-ghost btn-icon" aria-label="Move down">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => removeStep(act.id)} className="btn btn-sm btn-ghost btn-icon hover:!text-red-300" aria-label="Remove step">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="pl-9">
                      <ActionTargetField action={act} onChange={(u) => updateAction(act.id, u)} />
                      {result && (
                        <p className={`mt-1.5 flex items-center gap-1.5 text-micro ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                          {result.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {result.success ? 'Step ran successfully.' : result.msg}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <div ref={listEndRef} />
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 px-5 h-16 border-t border-line flex-shrink-0 bg-black/20">
          {initialWorkspace && onDelete ? (
            <button type="button" onClick={() => onDelete(initialWorkspace)} className="btn btn-danger">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check className="w-3.5 h-3.5" />
              {initialWorkspace ? 'Save changes' : 'Create workspace'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
};
