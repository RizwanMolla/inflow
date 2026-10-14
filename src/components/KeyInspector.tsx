import React from 'react';
import { CornerUpLeft, FolderOpen, Layers, MousePointerClick, Pencil, Play, Trash2, Workflow, Zap } from 'lucide-react';
import type { AccentColor, ActionType, DeckConfig, DeckSlot, Workspace } from '../types/workspace';
import { ACCENT_COLORS, KEY_PRESETS, MEDIA_KEYS, defaultTargetFor, describeAction, getActionTypeMeta } from '../utils/theme';
import {
  contentFromPreset,
  contentFromWorkspace,
  contentFromWorkspaceStep,
  getPage,
  isSlotBroken,
  type SlotContent,
} from '../services/deckOps';
import { DeckKey } from './DeckKey';
import { ActionTargetField, ActionTypeSelect } from './ActionFields';
import { IconPicker } from './IconPicker';

interface KeyInspectorProps {
  deckConfig: DeckConfig;
  pageId: string;
  index: number | null;
  slot: DeckSlot | null;
  workspaces: Workspace[];
  onSetContent: (content: SlotContent) => void;
  onPatch: (patch: Partial<SlotContent>) => void;
  onClear: () => void;
  onMakeFolder: () => void;
  onOpenFolder: () => void;
  onRun: () => void;
  onEditWorkspace: (ws: Workspace) => void;
}

type KeyKind = 'workspace' | 'quick_action' | 'custom' | 'folder';

const KIND_OPTIONS: { id: KeyKind; label: string; icon: React.ComponentType<{ className?: string }>; title: string }[] = [
  { id: 'workspace', label: 'Workspace', icon: Layers, title: 'Runs every step of a workspace' },
  { id: 'quick_action', label: 'Step', icon: Workflow, title: 'Runs one step from a workspace' },
  { id: 'custom', label: 'Action', icon: Zap, title: 'Runs its own hotkey, media key, URL, command…' },
  { id: 'folder', label: 'Folder', icon: FolderOpen, title: 'Opens a nested page of keys' },
];

export const KeyInspector: React.FC<KeyInspectorProps> = ({
  deckConfig,
  pageId,
  index,
  slot,
  workspaces,
  onSetContent,
  onPatch,
  onClear,
  onMakeFolder,
  onOpenFolder,
  onRun,
  onEditWorkspace,
}) => {
  if (index === null || !slot) {
    return (
      <section className="panel h-full flex flex-col items-center justify-center text-center gap-2 p-6">
        <MousePointerClick className="w-5 h-5 text-ink-3" />
        <h3 className="text-sm font-semibold">Select a key</h3>
        <p className="text-ui text-ink-2 max-w-xs">Click a key on the deck to configure it, or drag something from the library onto it.</p>
      </section>
    );
  }

  const isEmpty = slot.type === 'empty';
  const broken = isSlotBroken(slot, workspaces);
  const allSteps = workspaces.flatMap((w) => w.actions.map((a) => ({ action: a, workspace: w })));
  const targetWorkspace =
    slot.type === 'workspace'
      ? workspaces.find((w) => w.id === slot.targetId)
      : slot.type === 'quick_action'
      ? workspaces.find((w) => w.id === slot.targetWorkspaceId)
      : undefined;

  const chooseKind = (kind: KeyKind) => {
    if (kind === slot.type) return;
    if (kind === 'folder') return onMakeFolder();
    if (kind === 'workspace' && workspaces[0]) return onSetContent(contentFromWorkspace(workspaces[0]));
    if (kind === 'quick_action' && allSteps[0]) {
      return onSetContent(contentFromWorkspaceStep(allSteps[0].action, allSteps[0].workspace.id));
    }
    if (kind === 'custom') {
      const hotkey = KEY_PRESETS.find((p) => p.id === 'hotkey');
      if (hotkey) onSetContent(contentFromPreset(hotkey));
    }
  };

  const changeCustomType = (type: ActionType) => {
    if (!slot.action) return;
    const prev = getActionTypeMeta(slot.action.type);
    const next = getActionTypeMeta(type);
    const patch: Partial<SlotContent> = {
      action: { ...slot.action, type, target: defaultTargetFor(type), label: next.label },
    };
    // Only replace the icon/title if the user hasn't customised them.
    if (!slot.icon || slot.icon === prev.defaultIcon) patch.icon = next.defaultIcon;
    if (!slot.label || slot.label === prev.label || slot.label === slot.action.label) patch.label = next.label;
    onPatch(patch);
  };

  const changeCustomTarget = (target: string) => {
    if (!slot.action) return;
    const patch: Partial<SlotContent> = { action: { ...slot.action, target } };
    if (slot.action.type === 'media') {
      const prev = MEDIA_KEYS.find((m) => m.id === slot.action?.target);
      const next = MEDIA_KEYS.find((m) => m.id === target);
      if (next && (!slot.label || slot.label === prev?.label)) patch.label = next.label;
      if (next && (!slot.icon || slot.icon === prev?.icon)) patch.icon = next.icon;
    }
    onPatch(patch);
  };

  const folderPage = slot.type === 'folder' && slot.targetId ? getPage(deckConfig, slot.targetId) : undefined;
  const folderKeyCount = folderPage?.slots.filter((s) => s.type !== 'empty' && s.type !== 'back').length ?? 0;

  const summary = (() => {
    if (isEmpty) return 'Unassigned';
    if (broken) return 'Target no longer exists';
    switch (slot.type) {
      case 'workspace':
        return `Runs ${targetWorkspace?.actions.length ?? 0} steps`;
      case 'quick_action':
        return `Step of ${targetWorkspace?.name ?? 'workspace'}`;
      case 'custom':
        return slot.action ? getActionTypeMeta(slot.action.type).label : 'Action';
      case 'folder':
        return `Folder · ${folderKeyCount} key${folderKeyCount === 1 ? '' : 's'}`;
      case 'back':
        return 'Returns to the parent page';
    }
  })();

  const canRun = slot.type === 'workspace' || slot.type === 'quick_action' || slot.type === 'custom';
  const pageTitle = getPage(deckConfig, pageId)?.title ?? '';

  return (
    <section className="panel h-full flex flex-col overflow-hidden" aria-label="Key inspector">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 h-12 border-b border-line bg-raised/60">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="text-sm font-semibold">Key {index + 1}</h3>
          <span className="text-ui text-ink-3 truncate">on {pageTitle}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {slot.type === 'folder' && (
            <button type="button" onClick={onOpenFolder} className="btn btn-sm btn-secondary">
              <FolderOpen className="w-3.5 h-3.5" />
              Open folder
            </button>
          )}
          {canRun && (
            <button type="button" onClick={onRun} disabled={broken} className="btn btn-sm btn-secondary" title="Run this key on this PC">
              <Play className="w-3 h-3 fill-current" />
              Test run
            </button>
          )}
          {!isEmpty && slot.type !== 'back' && (
            <button type="button" onClick={onClear} className="btn btn-sm btn-ghost btn-icon hover:!text-red-300" title="Clear key" aria-label="Clear key">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {slot.type === 'back' ? (
        <div className="flex-1 flex items-center gap-6 px-6">
          <div className="w-24 flex-shrink-0">
            <DeckKey slot={slot} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CornerUpLeft className="w-3.5 h-3.5 text-ink-2" />
              Back key
            </h4>
            <p className="text-ui text-ink-2 max-w-sm">
              Every folder keeps its first key as Back, just like a Stream Deck. Tapping it on your phone returns to{' '}
              <span className="text-ink">{getPage(deckConfig, getPage(deckConfig, pageId)?.parentId ?? '')?.title ?? 'the parent page'}</span>.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-[132px_minmax(0,1fr)_minmax(220px,0.85fr)] gap-5 px-4 py-3.5">
          {/* Preview + title */}
          <div className="flex flex-col items-center gap-2 min-h-0">
            <div className="w-[108px]">
              <DeckKey slot={slot} broken={broken} />
            </div>
            <p className={`text-micro text-center leading-tight ${broken ? 'text-amber-300' : 'text-ink-3'}`}>{summary}</p>
            {!isEmpty && (
              <input
                value={slot.label}
                onChange={(e) => onPatch({ label: e.target.value })}
                placeholder="Key title"
                aria-label="Key title"
                maxLength={32}
                className="field text-center"
              />
            )}
          </div>

          {/* Behaviour */}
          <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <span className="eyebrow">Key type</span>
              <div className="segmented" role="group" aria-label="Key type">
                {KIND_OPTIONS.map((k) => {
                  const disabled =
                    (k.id === 'workspace' && workspaces.length === 0) || (k.id === 'quick_action' && allSteps.length === 0);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      title={k.title}
                      disabled={disabled}
                      aria-pressed={slot.type === k.id}
                      onClick={() => chooseKind(k.id)}
                      className="disabled:opacity-40"
                    >
                      <k.icon className="w-3.5 h-3.5" />
                      {k.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isEmpty && (
              <p className="text-ui text-ink-2">
                Pick a key type above, or drag a workspace, step or built-in action from the library onto this key.
              </p>
            )}

            {slot.type === 'workspace' && (
              <label className="block space-y-1.5">
                <span className="eyebrow">Workspace</span>
                <div className="flex gap-1.5">
                  <select
                    value={slot.targetId || ''}
                    onChange={(e) => {
                      const ws = workspaces.find((w) => w.id === e.target.value);
                      if (ws) onSetContent(contentFromWorkspace(ws));
                    }}
                    className="field"
                  >
                    {broken && <option value={slot.targetId}>Missing workspace</option>}
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name} · {ws.actions.length} steps
                      </option>
                    ))}
                  </select>
                  {targetWorkspace && (
                    <button type="button" onClick={() => onEditWorkspace(targetWorkspace)} className="btn btn-secondary btn-icon flex-shrink-0" title="Edit workspace" aria-label="Edit workspace">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </label>
            )}

            {slot.type === 'quick_action' && (
              <label className="block space-y-1.5">
                <span className="eyebrow">Workspace step</span>
                <select
                  value={slot.targetId || ''}
                  onChange={(e) => {
                    const found = allSteps.find((s) => s.action.id === e.target.value);
                    if (found) onSetContent(contentFromWorkspaceStep(found.action, found.workspace.id));
                  }}
                  className="field"
                >
                  {broken && <option value={slot.targetId}>Missing step</option>}
                  {workspaces.map((ws) => (
                    <optgroup key={ws.id} label={ws.name}>
                      {ws.actions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} · {getActionTypeMeta(a.type).short}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {targetWorkspace && !broken && (
                  <p className="text-micro text-ink-3 truncate font-mono">
                    {describeAction(targetWorkspace.actions.find((a) => a.id === slot.targetId)!)}
                  </p>
                )}
              </label>
            )}

            {slot.type === 'custom' && slot.action && (
              <div className="space-y-1.5">
                <span className="eyebrow">Action</span>
                <ActionTypeSelect value={slot.action.type} onChange={changeCustomType} />
                <ActionTargetField
                  action={slot.action}
                  showHint={false}
                  onChange={(u) => (u.target !== undefined ? changeCustomTarget(u.target) : onPatch({ action: { ...slot.action!, ...u } }))}
                />
                <p className="text-micro text-ink-3">
                  {getActionTypeMeta(slot.action.type).hint}
                  {(slot.action.type === 'hotkey' || slot.action.type === 'text') && ' Test run waits 3 s so you can switch windows first.'}
                </p>
              </div>
            )}

            {slot.type === 'folder' && (
              <p className="text-ui text-ink-2">
                {folderKeyCount === 0 ? 'This folder is empty. ' : `Contains ${folderKeyCount} key${folderKeyCount === 1 ? '' : 's'}. `}
                Open it to add keys; on the phone, tapping this key opens the folder.
              </p>
            )}

          </div>

          {/* Appearance */}
          <div className={`flex flex-col gap-2 min-h-0 ${isEmpty ? 'opacity-40 pointer-events-none' : ''}`} aria-disabled={isEmpty}>
            <span className="eyebrow">Icon</span>
            <IconPicker value={slot.icon} onChange={(icon) => onPatch({ icon })} className="flex-1" />
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="eyebrow">Color</span>
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Key color">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={slot.accentColor === c.id}
                    title={c.label}
                    onClick={() => onPatch({ accentColor: c.id as AccentColor })}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                      slot.accentColor === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
