import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Download,
  Upload,
  Layers,
  Zap,
  CheckCircle2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Workspace, LaunchReport } from './types/workspace';
import { StorageService, isTauriEnvironment } from './services/storage';
import { LauncherService } from './services/launcher';
import { WorkspaceCard } from './components/WorkspaceCard';
import { WorkspaceModal } from './components/WorkspaceModal';
import { LaunchOverlay } from './components/LaunchOverlay';
import { OnboardingModal } from './components/OnboardingModal';
import { TemplateModal } from './components/TemplateModal';

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<LaunchReport | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isTauri = isTauriEnvironment();

  useEffect(() => {
    loadWorkspaces();
    // Check if new user needs onboarding guide
    if (!StorageService.isOnboardingCompleted()) {
      setIsOnboardingOpen(true);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadWorkspaces = async () => {
    const data = await StorageService.loadWorkspaces();
    setWorkspaces(data);
  };

  const handleSaveWorkspace = async (saved: Workspace) => {
    const exists = workspaces.some((w) => w.id === saved.id);
    let updated: Workspace[];
    if (exists) {
      updated = workspaces.map((w) => (w.id === saved.id ? saved : w));
      showToast(`Updated "${saved.name}"`);
    } else {
      updated = [saved, ...workspaces];
      showToast(`Created "${saved.name}"`);
    }
    setWorkspaces(updated);
    await StorageService.saveWorkspaces(updated);
  };

  const handleSelectTemplate = async (template: Workspace) => {
    const newWs: Workspace = {
      ...template,
      id: `ws-${Date.now()}`,
      name: template.name,
      launchCount: 0,
      lastLaunchedAt: undefined,
      actions: template.actions.map((a) => ({
        ...a,
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      })),
    };
    const updated = [newWs, ...workspaces];
    setWorkspaces(updated);
    await StorageService.saveWorkspaces(updated);
    setIsTemplateModalOpen(false);
    showToast(`Added workspace from template "${template.name}"`);
  };

  const handleDeleteWorkspace = async (id: string) => {
    const target = workspaces.find((w) => w.id === id);
    if (!target) return;
    if (window.confirm(`Are you sure you want to delete "${target.name}"?`)) {
      const updated = workspaces.filter((w) => w.id !== id);
      setWorkspaces(updated);
      await StorageService.saveWorkspaces(updated);
      showToast(`Deleted "${target.name}"`);
    }
  };

  const handleDuplicateWorkspace = async (workspace: Workspace) => {
    const duplicated: Workspace = {
      ...workspace,
      id: `ws-${Date.now()}`,
      name: `${workspace.name} (Copy)`,
      launchCount: 0,
      lastLaunchedAt: undefined,
      actions: workspace.actions.map((a) => ({
        ...a,
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      })),
    };
    const updated = [duplicated, ...workspaces];
    setWorkspaces(updated);
    await StorageService.saveWorkspaces(updated);
    showToast(`Duplicated "${workspace.name}"`);
  };

  const handleLaunch = async (workspace: Workspace) => {
    setLaunchingId(workspace.id);

    // Trigger confetti celebration on launch start
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#10b981', '#38bdf8', '#a855f7'],
    });

    const report = await LauncherService.launchWorkspace(workspace, (progress) => {
      setActiveReport((prev) => {
        if (!prev) {
          return {
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            startTime: Date.now(),
            totalActions: workspace.actions.length,
            succeededActions: progress.status === 'success' ? 1 : 0,
            failedActions: progress.status === 'error' ? 1 : 0,
            progressList: [progress],
            isComplete: false,
          };
        }
        const updatedList = prev.progressList.map((item) =>
          item.actionId === progress.actionId ? progress : item
        );
        return {
          ...prev,
          progressList: updatedList,
        };
      });
    });

    setActiveReport(report);
    setLaunchingId(null);

    // Update launch count stats
    const updated = workspaces.map((w) =>
      w.id === workspace.id
        ? {
            ...w,
            launchCount: (w.launchCount || 0) + 1,
            lastLaunchedAt: new Date().toISOString(),
          }
        : w
    );
    setWorkspaces(updated);
    await StorageService.saveWorkspaces(updated);
  };

  const handleExport = () => {
    const jsonStr = StorageService.exportToJson(workspaces);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inflow-workspaces-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported workspaces configuration');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const imported = StorageService.importFromJson(content);
        setWorkspaces(imported);
        await StorageService.saveWorkspaces(imported);
        showToast(`Successfully imported ${imported.length} workspaces!`);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOnboardingComplete = () => {
    StorageService.setOnboardingCompleted(true);
    setIsOnboardingOpen(false);
  };

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.actions.some(
        (a) =>
          a.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.target.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const totalActionsCount = workspaces.reduce((acc, w) => acc + w.actions.length, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight text-white">InFlow</h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isTauri ? 'Desktop v2' : 'Web Simulator'}
                </span>
              </div>
              <p className="text-xs text-slate-400">One click to enter any work mode.</p>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
                aria-label="Search workflows"
              />
            </div>

            {/* Guide Button */}
            <button
              onClick={() => setIsOnboardingOpen(true)}
              title="Open User Guide"
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-indigo-300 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Templates Gallery Button */}
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              title="Browse Ready-made Templates"
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Templates</span>
            </button>

            {/* Import / Export JSON */}
            <label
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
              title="Import JSON"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={handleExport}
              title="Export Workspaces as JSON"
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Create Workspace Button */}
            <button
              onClick={() => {
                setEditingWorkspace(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all transform active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Workspace</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 z-10">
        {/* Quick Insights Banner */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <span className="text-xs text-slate-400">Total Workspaces</span>
            <div className="text-lg font-bold text-white mt-0.5">{workspaces.length}</div>
          </div>
          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <span className="text-xs text-slate-400">Pipelines / Actions</span>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">{totalActionsCount}</div>
          </div>
          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <span className="text-xs text-slate-400">Total Launches</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {workspaces.reduce((acc, w) => acc + (w.launchCount || 0), 0)}
            </div>
          </div>
          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <span className="text-xs text-slate-400">Environment</span>
            <div className="text-sm font-semibold text-cyan-400 mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{isTauri ? 'Windows Native' : 'Active Ready'}</span>
            </div>
          </div>
        </div>

        {/* Workspaces Grid or Empty State */}
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-20 px-4 border border-dashed border-slate-800/90 rounded-3xl bg-slate-900/30 backdrop-blur-sm max-w-2xl mx-auto">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl w-20 h-20 mx-auto flex items-center justify-center text-indigo-400 mb-5 shadow-inner">
              <Layers className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {searchQuery ? 'No Matching Workspaces' : 'No Workspaces Yet'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2 mb-8 leading-relaxed">
              {searchQuery
                ? `No workspaces match "${searchQuery}". Try a different keyword.`
                : 'Create your first workspace from scratch or pick a pre-configured template to start launching your daily tools with one click.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setEditingWorkspace(null);
                  setIsModalOpen(true);
                }}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Workspace</span>
              </button>
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-all transform active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Choose from Templates</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onLaunch={handleLaunch}
                onEdit={(ws) => {
                  setEditingWorkspace(ws);
                  setIsModalOpen(true);
                }}
                onDuplicate={handleDuplicateWorkspace}
                onDelete={handleDeleteWorkspace}
                isLaunching={launchingId === workspace.id}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Status Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 bg-indigo-600 text-white rounded-xl shadow-xl text-xs font-medium flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Execution Tracker Overlay */}
      <LaunchOverlay report={activeReport} onClose={() => setActiveReport(null)} />

      {/* Workspace Creation & Edit Modal */}
      <WorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWorkspace}
        initialWorkspace={editingWorkspace}
      />

      {/* Ready-made Template Gallery */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Onboarding Guide Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}

export default App;
