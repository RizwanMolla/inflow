import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Library,
  Monitor,
  MousePointer2,
  Pencil,
  Play,
  Plus,
  Search,
  Smartphone,
  XCircle,
} from 'lucide-react';
import type { ActivityEntry, TriggerSource, Workspace, WorkspaceAction } from '../types/workspace';
import { KEY_PRESETS, accentStyle, getActionTypeMeta, renderWorkspaceIcon, type KeyPreset } from '../utils/theme';
import { dragManager } from '../services/dragManager';

interface LibraryPanelProps {
  workspaces: Workspace[];
  activity: ActivityEntry[];
  hasSelection: boolean;
  onAssignWorkspace: (ws: Workspace) => void;
  onAssignStep: (action: WorkspaceAction, workspaceId: string) => void;
  onAssignPreset: (preset: KeyPreset) => void;
  onNewWorkspace: () => void;
  onEditWorkspace: (ws: Workspace) => void;
  onLaunchWorkspace: (ws: Workspace) => void;
}

const PRESET_GROUPS: KeyPreset['group'][] = ['Media', 'Keyboard', 'System', 'Open', 'Navigation'];

export const LibraryPanel: React.FC<LibraryPanelProps> = (props) => {
  const [tab, setTab] = useState<'library' | 'activity'>('library');

  return (
    <section className="panel flex flex-col h-full overflow-hidden" aria-label="Library">
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 h-12 border-b border-line bg-raised/60">
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-pressed={tab === 'library'} aria-selected={tab === 'library'} onClick={() => setTab('library')}>
            <Library className="w-3.5 h-3.5" />
            Library
          </button>
          <button type="button" role="tab" aria-pressed={tab === 'activity'} aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>
            <Activity className="w-3.5 h-3.5" />
            Activity
            {props.activity.length > 0 && (
              <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-white/10 text-[10px] leading-4 tabular-nums text-ink-2">
                {props.activity.length}
              </span>
            )}
          </button>
        </div>
        {tab === 'library' && (
          <button type="button" onClick={props.onNewWorkspace} className="btn btn-sm btn-secondary">
            <Plus className="w-3.5 h-3.5" />
            Workspace
          </button>
        )}
      </div>
      {tab === 'library' ? <LibraryTab {...props} /> : <ActivityTab entries={props.activity} />}
    </section>
  );
};

// --- Library ---

const LibraryTab: React.FC<LibraryPanelProps> = ({
  workspaces,
  hasSelection,
  onAssignWorkspace,
  onAssignStep,
  onAssignPreset,
  onEditWorkspace,
  onLaunchWorkspace,
  onNewWorkspace,
}) => {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();

  const filteredWorkspaces = useMemo(
    () => workspaces.filter((w) => !q || w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)),
    [workspaces, q]
  );
  const filteredPresets = useMemo(
    () => KEY_PRESETS.filter((p) => !q || p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)),
    [q]
  );
  const filteredSteps = useMemo(
    () =>
      workspaces
        .flatMap((w) => w.actions.map((a) => ({ action: a, workspace: w })))
        .filter(
          ({ action, workspace }) =>
            !q ||
            action.label.toLowerCase().includes(q) ||
            action.target.toLowerCase().includes(q) ||
            workspace.name.toLowerCase().includes(q)
        ),
    [workspaces, q]
  );

  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  const endDrag = () => dragManager.setDragItem(null);

  return (
    <>
      <div className="flex-shrink-0 p-3 pb-2 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces and actions"
            aria-label="Search library"
            className="field pl-8"
          />
        </div>
        <p className="flex items-center gap-1.5 text-micro text-ink-3">
          <MousePointer2 className="w-3 h-3" />
          {hasSelection ? 'Drag onto a key, or click to assign to the selected key' : 'Drag onto a key to assign it'}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-4">
        {/* Workspaces */}
        <Section id="ws" title="Workspaces" count={filteredWorkspaces.length} collapsed={collapsed.ws} onToggle={toggle}>
          {filteredWorkspaces.length === 0 ? (
            <EmptyRow>
              {q ? 'No workspaces match.' : (
                <button type="button" onClick={onNewWorkspace} className="text-brand-ink hover:underline">
                  Create your first workspace
                </button>
              )}
            </EmptyRow>
          ) : (
            filteredWorkspaces.map((ws) => (
              <div
                key={ws.id}
                draggable
                onDragStart={(e) => dragManager.begin(e, { type: 'workspace', id: ws.id, title: ws.name })}
                onDragEnd={endDrag}
                onClick={() => onAssignWorkspace(ws)}
                className="group flex items-center gap-2.5 p-2 rounded-xl border border-transparent hover:border-line hover:bg-white/[0.035] cursor-grab active:cursor-grabbing transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/[0.08] text-[color-mix(in_oklab,var(--accent)_75%,white)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)]"
                  style={accentStyle(ws.accentColor)}
                >
                  {renderWorkspaceIcon(ws.icon || 'Zap', 'w-3.5 h-3.5')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-ui font-medium truncate">{ws.name}</div>
                  <div className="text-micro text-ink-3">
                    {ws.actions.length} step{ws.actions.length === 1 ? '' : 's'}
                    {ws.launchCount ? ` · launched ${ws.launchCount}×` : ''}
                  </div>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchWorkspace(ws);
                    }}
                    title="Run workspace"
                    aria-label={`Run ${ws.name}`}
                    className="btn btn-sm btn-ghost btn-icon"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditWorkspace(ws);
                    }}
                    title="Edit workspace"
                    aria-label={`Edit ${ws.name}`}
                    className="btn btn-sm btn-ghost btn-icon"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </Section>

        {/* Built-in actions */}
        <Section id="builtin" title="Built-in actions" count={filteredPresets.length} collapsed={collapsed.builtin} onToggle={toggle}>
          {PRESET_GROUPS.map((group) => {
            const items = filteredPresets.filter((p) => p.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-2.5 last:mb-0">
                <div className="text-micro text-ink-3 mb-1 px-1">{group}</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {items.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      draggable
                      onDragStart={(e) => dragManager.begin(e, { type: 'preset', id: preset.id, title: preset.label })}
                      onDragEnd={endDrag}
                      onClick={() => onAssignPreset(preset)}
                      title={preset.action?.target ? `${preset.label} · ${preset.action.target}` : preset.label}
                      className="flex flex-col items-center justify-center gap-1.5 h-14 px-1 rounded-xl border border-line bg-white/[0.02] hover:bg-white/[0.06] hover:border-line-strong cursor-grab active:cursor-grabbing transition-colors"
                      style={accentStyle(preset.accentColor)}
                    >
                      <span className="text-[color-mix(in_oklab,var(--accent)_75%,white)]">
                        {renderWorkspaceIcon(preset.icon, 'w-3.5 h-3.5')}
                      </span>
                      <span className="text-micro text-ink-2 text-center leading-tight line-clamp-1">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {filteredPresets.length === 0 && <EmptyRow>No built-in actions match.</EmptyRow>}
        </Section>

        {/* Workspace steps */}
        <Section id="steps" title="Workspace steps" count={filteredSteps.length} collapsed={collapsed.steps ?? true} onToggle={(id) => setCollapsed((c) => ({ ...c, [id]: !(c[id] ?? true) }))}>
          {filteredSteps.length === 0 ? (
            <EmptyRow>No steps match.</EmptyRow>
          ) : (
            filteredSteps.map(({ action, workspace }) => {
              const meta = getActionTypeMeta(action.type);
              return (
                <div
                  key={`${workspace.id}-${action.id}`}
                  draggable
                  onDragStart={(e) => dragManager.begin(e, { type: 'action', id: action.id, workspaceId: workspace.id, title: action.label })}
                  onDragEnd={endDrag}
                  onClick={() => onAssignStep(action, workspace.id)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-grab active:cursor-grabbing transition-colors"
                >
                  <meta.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.hex }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-ui truncate">{action.label}</div>
                    <div className="text-micro text-ink-3 truncate">{workspace.name}</div>
                  </div>
                  <span className="text-micro text-ink-3 flex-shrink-0">{meta.short}</span>
                </div>
              );
            })
          )}
        </Section>
      </div>
    </>
  );
};

const Section: React.FC<{
  id: string;
  title: string;
  count: number;
  collapsed?: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}> = ({ id, title, count, collapsed, onToggle, children }) => (
  <div>
    <button
      type="button"
      onClick={() => onToggle(id)}
      aria-expanded={!collapsed}
      className="w-full flex items-center gap-1.5 mb-1.5 px-1 eyebrow hover:text-ink-2 transition-colors"
    >
      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      <span>{title}</span>
      <span className="font-normal tabular-nums">{count}</span>
    </button>
    {!collapsed && <div className="space-y-0.5">{children}</div>}
  </div>
);

const EmptyRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 py-4 text-center text-ui text-ink-3 rounded-xl border border-dashed border-line">{children}</div>
);

// --- Activity ---

const SOURCE_META: Record<TriggerSource, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  phone: { label: 'Phone', icon: Smartphone },
  desktop: { label: 'Desktop', icon: Monitor },
  tray: { label: 'Tray', icon: Monitor },
  palette: { label: 'Command bar', icon: Search },
};

function relativeTime(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ActivityTab: React.FC<{ entries: ActivityEntry[] }> = ({ entries }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
        <Activity className="w-5 h-5 text-ink-3" />
        <h4 className="text-sm font-semibold">No activity yet</h4>
        <p className="text-ui text-ink-2 max-w-[240px]">Keys pressed on your phone, the tray menu or this window show up here.</p>
      </div>
    );
  }

  return (
    <ol className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1" aria-label="Recent activity">
      {entries.map((entry) => {
        const source = SOURCE_META[entry.source];
        return (
          <li key={entry.id} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/[0.03]">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/[0.08] text-[color-mix(in_oklab,var(--accent)_75%,white)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)]"
              style={accentStyle(entry.accentColor)}
            >
              {renderWorkspaceIcon(entry.icon || 'Zap', 'w-3.5 h-3.5')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-ui font-medium truncate">{entry.label}</span>
                {entry.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" aria-label="Succeeded" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" aria-label="Failed" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-micro text-ink-3">
                <source.icon className="w-3 h-3" />
                {source.label}
                <span aria-hidden>·</span>
                <time dateTime={new Date(entry.timestamp).toISOString()}>{relativeTime(entry.timestamp, now)}</time>
              </div>
              {entry.message && !entry.success && <p className="text-micro text-red-300/90 mt-0.5 break-words">{entry.message}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
