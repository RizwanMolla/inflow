import React, { useState } from 'react';
import {
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
  Globe,
  Folder,
  FileText,
  Terminal,
  Play,
  HelpCircle,
  FolderOpen,
  FileSearch,
} from 'lucide-react';
import type {
  Workspace,
  WorkspaceAction,
  ActionType,
  AccentColor,
} from '../types/workspace';
import { AVAILABLE_ICONS, ACCENT_COLORS } from '../utils/theme';
import { LauncherService } from '../services/launcher';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workspace: Workspace) => void;
  initialWorkspace?: Workspace | null;
}

const COMMON_APPS = [
  { label: 'VS Code', command: 'code' },
  { label: 'Terminal', command: 'wt' },
  { label: 'Notepad', command: 'notepad' },
  { label: 'Chrome', command: 'chrome' },
  { label: 'Calculator', command: 'calc' },
];

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWorkspace,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Code2');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState<AccentColor>('indigo');
  const [actions, setActions] = useState<WorkspaceAction[]>([]);
  const [testingActionId, setTestingActionId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg?: string } | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      if (initialWorkspace) {
        setName(initialWorkspace.name || '');
        setIcon(initialWorkspace.icon || 'Code2');
        setDescription(initialWorkspace.description || '');
        setAccentColor(initialWorkspace.accentColor || 'indigo');
        setActions(
          initialWorkspace.actions && initialWorkspace.actions.length > 0
            ? JSON.parse(JSON.stringify(initialWorkspace.actions))
            : [
                {
                  id: `act-${Date.now()}-1`,
                  type: 'url',
                  label: 'Open Web Link',
                  target: '',
                },
              ]
        );
      } else {
        setName('');
        setIcon('Code2');
        setDescription('');
        setAccentColor('indigo');
        setActions([
          {
            id: `act-${Date.now()}-1`,
            type: 'url',
            label: 'Open Web Link',
            target: '',
          },
        ]);
      }
      setErrorMsg('');
      setTestResult(null);
      setTestingActionId(null);
      setShowIconPicker(false);
    }
  }, [isOpen, initialWorkspace]);

  if (!isOpen) return null;

  const handleAddAction = (type: ActionType = 'url') => {
    const defaultLabels: Record<ActionType, string> = {
      url: 'Open Web Link',
      folder: 'Open Folder',
      file: 'Open File',
      app: 'Launch App',
    };

    const newAction: WorkspaceAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      label: defaultLabels[type],
      target: '',
    };
    setActions([...actions, newAction]);
  };

  const handleUpdateAction = (id: string, updates: Partial<WorkspaceAction>) => {
    setActions(actions.map((act) => (act.id === id ? { ...act, ...updates } : act)));
  };

  const handleRemoveAction = (id: string) => {
    if (actions.length <= 1) {
      setErrorMsg('Workspace must have at least 1 action.');
      return;
    }
    setActions(actions.filter((act) => act.id !== id));
  };

  const handleMoveAction = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;
    const updated = [...actions];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setActions(updated);
  };

  const handleTestAction = async (action: WorkspaceAction) => {
    if (!action.target.trim()) {
      setTestResult({ id: action.id, success: false, msg: 'Target cannot be empty.' });
      setTimeout(() => setTestResult(null), 3000);
      return;
    }
    setTestingActionId(action.id);
    setTestResult(null);
    const res = await LauncherService.executeAction(action);
    setTestingActionId(null);
    setTestResult({ id: action.id, success: res.success, msg: res.error });
    setTimeout(() => setTestResult(null), 3500);
  };

  const handleBrowseFileOrFolder = async (act: WorkspaceAction) => {
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const isFolder = act.type === 'folder';
        const isApp = act.type === 'app';
        
        const filters = isApp
          ? [{ name: 'Applications / Executables', extensions: ['exe', 'bat', 'cmd', 'lnk', 'app'] }]
          : undefined;

        const selected = await open({
          directory: isFolder,
          multiple: false,
          filters,
          title: isFolder ? 'Select Folder' : isApp ? 'Select Application' : 'Select File',
        });

        if (selected && typeof selected === 'string') {
          handleUpdateAction(act.id, { target: selected });
          if (!act.label || act.label.startsWith('Open ') || act.label.startsWith('Launch ')) {
            const filename = selected.split(/[\\/]/).pop() || '';
            const cleanName = filename.replace(/\.[^/.]+$/, '');
            if (cleanName) {
              handleUpdateAction(act.id, {
                target: selected,
                label: isApp ? `Launch ${cleanName}` : `Open ${filename}`,
              });
            }
          }
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        if (act.type === 'folder') {
          input.setAttribute('webkitdirectory', '');
        } else if (act.type === 'app') {
          input.accept = '.exe,.bat,.cmd,.lnk,.app';
        }
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            handleUpdateAction(act.id, {
              target: `C:\\Program Files\\${file.name}`,
              label: `Open ${file.name}`,
            });
          }
        };
        input.click();
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Workspace title is required.');
      return;
    }

    if (actions.length === 0) {
      setErrorMsg('Please add at least one action to launch.');
      return;
    }

    for (let i = 0; i < actions.length; i++) {
      if (!actions[i].target.trim()) {
        setErrorMsg(`Action #${i + 1} (${actions[i].label || 'Untitled'}) target cannot be empty.`);
        return;
      }
    }

    const finalWorkspace: Workspace = {
      id: initialWorkspace?.id || `ws-${Date.now()}`,
      name: name.trim(),
      icon,
      description: description.trim(),
      accentColor,
      actions,
      launchCount: initialWorkspace?.launchCount || 0,
      lastLaunchedAt: initialWorkspace?.lastLaunchedAt,
    };

    onSave(finalWorkspace);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in font-sans">
      {/* Raycast Panel Window */}
      <div className="relative w-full max-w-xl bg-[#1e1e20]/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden text-neutral-200">
        
        {/* Window Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-white/10 rounded-md border border-white/10 text-neutral-200">
              <Sparkles className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium tracking-tight text-white">
                {initialWorkspace ? 'Edit Workspace' : 'Create Workspace'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
          {errorMsg && (
            <div className="p-2.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center space-x-2">
              <span className="font-medium">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Details Section */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Icon Picker Trigger */}
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Icon</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-neutral-900/60 hover:bg-neutral-800/80 border border-white/10 rounded-md text-neutral-200 text-xs transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate">
                    {AVAILABLE_ICONS[icon] ? (
                      React.createElement(AVAILABLE_ICONS[icon], { className: 'w-4 h-4 text-red-400 shrink-0' })
                    ) : (
                      <span className="w-4 h-4" />
                    )}
                    <span className="font-mono text-[11px] truncate">{icon}</span>
                  </div>
                </button>

                {showIconPicker && (
                  <div className="absolute left-0 top-10 z-30 w-56 p-2 bg-[#1e1e20] border border-white/10 rounded-lg shadow-2xl grid grid-cols-5 gap-1 max-h-48 overflow-y-auto">
                    {Object.keys(AVAILABLE_ICONS).map((iconKey) => {
                      const IconComp = AVAILABLE_ICONS[iconKey];
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => {
                            setIcon(iconKey);
                            setShowIconPicker(false);
                          }}
                          className={`p-1.5 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors ${
                            icon === iconKey ? 'bg-red-500/20 text-red-400' : 'text-neutral-400'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Title Input */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Frontend Dev Stack"
                className="w-full px-2.5 py-1.5 bg-neutral-900/60 border border-white/10 rounded-md text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of this workflow..."
              className="w-full px-2.5 py-1.5 bg-neutral-900/60 border border-white/10 rounded-md text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
            />
          </div>

          {/* Accent Color Picker */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">Accent Color</label>
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAccentColor(c.id)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                    accentColor === c.id
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-neutral-900/40 border-white/[0.05] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      c.id === 'indigo'
                        ? 'bg-indigo-400'
                        : c.id === 'emerald'
                        ? 'bg-emerald-400'
                        : c.id === 'cyan'
                        ? 'bg-cyan-400'
                        : c.id === 'violet'
                        ? 'bg-violet-400'
                        : c.id === 'amber'
                        ? 'bg-amber-400'
                        : c.id === 'rose'
                        ? 'bg-rose-400'
                        : 'bg-blue-400'
                    }`}
                  />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action List Section */}
          <div className="space-y-2.5 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-300">Actions Sequence</span>
              {/* Add Action Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAddAction('url')}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-neutral-300 transition-colors flex items-center space-x-1"
                >
                  <Globe className="w-3 h-3 text-sky-400" />
                  <span>URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('folder')}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-neutral-300 transition-colors flex items-center space-x-1"
                >
                  <Folder className="w-3 h-3 text-amber-400" />
                  <span>Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('file')}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-neutral-300 transition-colors flex items-center space-x-1"
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>File</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('app')}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-neutral-300 transition-colors flex items-center space-x-1"
                >
                  <Terminal className="w-3 h-3 text-purple-400" />
                  <span>App</span>
                </button>
              </div>
            </div>

            {/* List of actions */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
              {actions.map((act, index) => {
                const isTesting = testingActionId === act.id;
                const result = testResult?.id === act.id ? testResult : null;

                return (
                  <div
                    key={act.id}
                    className="p-2.5 bg-neutral-900/50 border border-white/5 rounded-lg space-y-2 hover:border-white/10 transition-colors"
                  >
                    {/* Action Card Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-neutral-500 w-4">#{index + 1}</span>
                        {/* Raycast Segmented Control Selector */}
                        <div className="flex items-center p-0.5 bg-black/40 rounded-md border border-white/5">
                          {(['url', 'folder', 'file', 'app'] as ActionType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleUpdateAction(act.id, { type })}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-all ${
                                act.type === type
                                  ? 'bg-white/15 text-white shadow-xs'
                                  : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-0.5">
                        <button
                          type="button"
                          onClick={() => handleTestAction(act)}
                          disabled={isTesting}
                          className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-neutral-300 rounded text-[10px] flex items-center space-x-1 transition-colors"
                        >
                          <Play className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{isTesting ? 'Testing...' : 'Test'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveAction(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 rounded hover:bg-white/5"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveAction(index, 'down')}
                          disabled={index === actions.length - 1}
                          className="p-1 text-neutral-400 hover:text-white disabled:opacity-20 rounded hover:bg-white/5"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(act.id)}
                          className="p-1 text-neutral-400 hover:text-red-400 rounded hover:bg-white/5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Action Field Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      <input
                        type="text"
                        value={act.label}
                        onChange={(e) => handleUpdateAction(act.id, { label: e.target.value })}
                        placeholder="Action Label"
                        className="px-2 py-1 bg-black/40 border border-white/5 rounded text-xs text-neutral-200 focus:outline-none focus:border-white/20"
                      />
                      <div className="sm:col-span-2 flex items-center gap-1">
                        <input
                          type="text"
                          value={act.target}
                          onChange={(e) => handleUpdateAction(act.id, { target: e.target.value })}
                          placeholder="Target Path or URL"
                          className="flex-1 px-2 py-1 bg-black/40 border border-white/5 rounded text-xs font-mono text-neutral-200 focus:outline-none focus:border-white/20"
                        />
                        {(act.type === 'folder' || act.type === 'file' || act.type === 'app') && (
                          <button
                            type="button"
                            onClick={() => handleBrowseFileOrFolder(act)}
                            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-neutral-300 rounded text-xs shrink-0 border border-white/5 transition-colors flex items-center space-x-1"
                          >
                            {act.type === 'folder' ? (
                              <FolderOpen className="w-3 h-3 text-amber-400" />
                            ) : act.type === 'app' ? (
                              <Terminal className="w-3 h-3 text-purple-400" />
                            ) : (
                              <FileSearch className="w-3 h-3 text-emerald-400" />
                            )}
                            <span className="text-[11px]">Browse</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* App Quick Suggestions */}
                    {act.type === 'app' && (
                      <div className="flex items-center flex-wrap gap-1 pt-0.5">
                        <span className="text-[10px] text-neutral-500 mr-1">Quick Suggestions:</span>
                        {COMMON_APPS.map((item) => (
                          <button
                            key={item.command}
                            type="button"
                            onClick={() => {
                              handleUpdateAction(act.id, {
                                label: item.label,
                                target: item.command,
                              });
                            }}
                            className="px-1.5 py-0.5 rounded bg-black/30 border border-white/5 hover:border-white/20 text-[10px] text-neutral-400 hover:text-neutral-200 transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {result && (
                      <div
                        className={`text-[11px] px-2 py-1 rounded flex items-center space-x-1.5 ${
                          result.success
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {result.success ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Action triggered successfully!</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-3 h-3" />
                            <span>Execution issue: {result.msg}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-md text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-medium shadow-sm transition-all flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{initialWorkspace ? 'Save Changes' : 'Create Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};