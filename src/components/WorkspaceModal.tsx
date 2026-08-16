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
import type { Workspace, WorkspaceAction, ActionType, AccentColor } from '../types/workspace';
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
  { label: 'Windows Terminal', command: 'wt' },
  { label: 'Notepad', command: 'notepad' },
  { label: 'Google Chrome', command: 'chrome' },
  { label: 'Calculator', command: 'calc' },
];

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWorkspace,
}) => {
  const [name, setName] = useState(initialWorkspace?.name || '');
  const [icon, setIcon] = useState(initialWorkspace?.icon || 'Code2');
  const [description, setDescription] = useState(initialWorkspace?.description || '');
  const [accentColor, setAccentColor] = useState<AccentColor>(
    initialWorkspace?.accentColor || 'indigo'
  );
  const [actions, setActions] = useState<WorkspaceAction[]>(
    initialWorkspace?.actions || [
      {
        id: `act-${Date.now()}-1`,
        type: 'url',
        label: 'Dashboard',
        target: '',
      },
    ]
  );
  const [testingActionId, setTestingActionId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg?: string } | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {initialWorkspace ? 'Edit Workspace' : 'Create New Workspace'}
              </h2>
              <p className="text-xs text-slate-400">Configure single-click workflow automation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl flex items-center space-x-2">
              <span className="font-bold">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Icon Picker Trigger */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Icon</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 transition-colors"
                >
                  {AVAILABLE_ICONS[icon] ? (
                    React.createElement(AVAILABLE_ICONS[icon], { className: 'w-5 h-5 text-indigo-400' })
                  ) : (
                    <span>{icon}</span>
                  )}
                  <span className="text-xs font-mono">{icon}</span>
                </button>

                {showIconPicker && (
                  <div className="absolute left-0 top-11 z-30 w-64 p-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
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
                          className={`p-2 rounded-lg flex items-center justify-center hover:bg-indigo-600/30 transition-colors ${
                            icon === iconKey ? 'bg-indigo-600 text-white' : 'text-slate-300'
                          }`}
                        >
                          <IconComp className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Name input */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Workspace Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Theme Color Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Color Accent</label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAccentColor(c.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    accentColor === c.id
                      ? `${c.badge} border-opacity-100 ring-2 ring-indigo-500/40`
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
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
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Execution Actions</h3>
                <p className="text-xs text-slate-400">
                  Select and chain what to launch in sequence.
                </p>
              </div>
              {/* Add Action Buttons */}
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddAction('url')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-medium flex items-center space-x-1 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>+ URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('folder')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-medium flex items-center space-x-1 transition-colors"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>+ Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('file')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-medium flex items-center space-x-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ File</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAction('app')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-medium flex items-center space-x-1 transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>+ App</span>
                </button>
              </div>
            </div>

            {/* List of actions */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {actions.map((act, index) => {
                const isTesting = testingActionId === act.id;
                const result = testResult?.id === act.id ? testResult : null;

                return (
                  <div
                    key={act.id}
                    className="p-3.5 bg-slate-800/70 border border-slate-700/80 rounded-2xl space-y-3 hover:border-slate-600 transition-colors"
                  >
                    {/* Action Header: Index, Action Type Tabs, Control Buttons */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-slate-500 w-5">#{index + 1}</span>
                        {/* Type Picker Tabs */}
                        <div className="flex items-center p-0.5 bg-slate-900/90 rounded-xl border border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleUpdateAction(act.id, { type: 'url' })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
                              act.type === 'url'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Globe className="w-3 h-3" />
                            <span>URL</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAction(act.id, { type: 'folder' })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
                              act.type === 'folder'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Folder className="w-3 h-3" />
                            <span>Folder</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAction(act.id, { type: 'file' })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
                              act.type === 'file'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <FileText className="w-3 h-3" />
                            <span>File</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAction(act.id, { type: 'app' })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
                              act.type === 'app'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Terminal className="w-3 h-3" />
                            <span>App</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {/* Test button */}
                        <button
                          type="button"
                          onClick={() => handleTestAction(act)}
                          disabled={isTesting}
                          title="Test launch this specific action"
                          className="px-2.5 py-1 bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs flex items-center space-x-1 transition-colors"
                        >
                          <Play className="w-3 h-3 text-emerald-400" />
                          <span>{isTesting ? 'Testing...' : 'Test'}</span>
                        </button>

                        {/* Reorder Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveAction(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-700"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        {/* Reorder Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveAction(index, 'down')}
                          disabled={index === actions.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-700"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(act.id)}
                          className="p-1 text-red-400/80 hover:text-red-300 rounded hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Action Label & Target Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <input
                          type="text"
                          value={act.label}
                          onChange={(e) => handleUpdateAction(act.id, { label: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          aria-label="Action label"
                        />
                      </div>
                      <div className="sm:col-span-2 relative">
                        <input
                          type="text"
                          value={act.target}
                          onChange={(e) => handleUpdateAction(act.id, { target: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                          aria-label="Action target path or URL"
                        />
                      </div>
                    </div>

                    {/* App Quick Suggestions (if App selected) */}
                    {act.type === 'app' && (
                      <div className="flex items-center flex-wrap gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-400 mr-1">Quick Select:</span>
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
                            className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-purple-500/40 text-[11px] text-slate-300 hover:text-purple-300 transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* File/Folder Quick Hint */}
                    {act.type === 'folder' && (
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Enter any local directory path (e.g. D:\Projects\MyProject)</span>
                      </div>
                    )}

                    {act.type === 'file' && (
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                        <FileSearch className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Enter any local file path (e.g. D:\Documents\Report.pdf or notes.md)</span>
                      </div>
                    )}

                    {result && (
                      <div
                        className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 ${
                          result.success
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {result.success ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Action triggered successfully!</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-3.5 h-3.5" />
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

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{initialWorkspace ? 'Save Changes' : 'Create Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
