import React, { useState, useEffect, useRef } from 'react';
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
  Smartphone,
  QrCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Workspace, LaunchReport, DeckConfig } from './types/workspace';
import { StorageService, isTauriEnvironment } from './services/storage';
import { LauncherService } from './services/launcher';
import { WorkspaceCard } from './components/WorkspaceCard';
import { WorkspaceModal } from './components/WorkspaceModal';
import { LaunchOverlay } from './components/LaunchOverlay';
import { OnboardingModal } from './components/OnboardingModal';
import { TemplateModal } from './components/TemplateModal';
import { QRPairingModal } from './components/QRPairingModal';
import { MobileDeckModal } from './components/MobileDeckModal';
import { generateDefaultDeckConfig } from './data/deckDefaults';

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [deckConfig, setDeckConfig] = useState<DeckConfig>(() => generateDefaultDeckConfig([]));
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isQRPairingOpen, setIsQRPairingOpen] = useState(false);
  const [isMobileDeckOpen, setIsMobileDeckOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<LaunchReport | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isTauri = isTauriEnvironment();
  const workspacesRef = useRef<Workspace[]>(workspaces);
  workspacesRef.current = workspaces;

  useEffect(() => {
    loadInitialData();
    if (!StorageService.isOnboardingCompleted()) {
      setIsOnboardingOpen(true);
    }

    // Set up Tauri event listener for remote triggers from embedded Axum / WebSocket server
    let isSubscribed = true;
    let unlistenFn: (() => void) | null = null;

    if (isTauri) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        if (!isSubscribed) return;
        listen<{ workspaceId: string; actionId?: string }>('remote-launch-trigger', async (event) => {
          const { workspaceId, actionId } = event.payload;
          
          const currentWorkspaces = await StorageService.loadWorkspaces();
          const targetWs = currentWorkspaces.find((w) => w.id === workspaceId);
          
          if (targetWs) {
            if (actionId) {
              const specificAction = targetWs.actions.find((a) => a.id === actionId);
              if (specificAction) {
                await LauncherService.executeAction(specificAction);
                showToast(`Remote Action: ${specificAction.label}`);
                return;
              }
            }
            await handleLaunch(targetWs);
            showToast(`Remote Trigger: ${targetWs.name}`);
          }
        }).then((unlisten) => {
          if (!isSubscribed) {
            unlisten();
          } else {
            unlistenFn = unlisten;
          }
        });
      });
    }

    return () => {
      isSubscribed = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadInitialData = async () => {
    const wsData = await StorageService.loadWorkspaces();
    setWorkspaces(wsData);
    const deckData = await StorageService.loadDeckConfig(wsData);
    setDeckConfig(deckData);
  };

  const handleSaveWorkspace = async (saved: Workspace) => {
    setWorkspaces((prev) => {
      const exists = prev.some((w) => w.id === saved.id);
      const updated = exists ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev];
      StorageService.saveWorkspaces(updated);
      showToast(exists ? `Updated "${saved.name}"` : `Created "${saved.name}"`);
      return updated;
    });
  };

  const handleSaveDeckConfig = async (newConfig: DeckConfig) => {
    setDeckConfig(newConfig);
    await StorageService.saveDeckConfig(newConfig);
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
    setWorkspaces((prev) => {
      const updated = [newWs, ...prev];
      StorageService.saveWorkspaces(updated);
      return updated;
    });
    setIsTemplateModalOpen(false);
    showToast(`Added workspace from template "${template.name}"`);
  };

  const handleDeleteWorkspace = async (id: string) => {
    const target = workspacesRef.current.find((w) => w.id === id);
    if (!target) return;
    if (window.confirm(`Are you sure you want to delete "${target.name}"?`)) {
      setWorkspaces((prev) => {
        const updated = prev.filter((w) => w.id !== id);
        StorageService.saveWorkspaces(updated);
        return updated;
      });
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
    setWorkspaces((prev) => {
      const updated = [duplicated, ...prev];
      StorageService.saveWorkspaces(updated);
      return updated;
    });
    showToast(`Duplicated "${workspace.name}"`);
  };

  const handleLaunch = async (workspace: Workspace) => {
    setLaunchingId(workspace.id);

    confetti({
      particleCount: 30,
      spread: 45,
      origin: { y: 0.85 },
      colors: ['#FF6B6B', '#FFFFFF', '#4D96FF', '#6BCB77'],
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

    setWorkspaces((prevWorkspaces) => {
      const updated = prevWorkspaces.map((w) =>
        w.id === workspace.id
          ? {
              ...w,
              launchCount: (w.launchCount || 0) + 1,
              lastLaunchedAt: new Date().toISOString(),
            }
          : w
      );
      StorageService.saveWorkspaces(updated);
      return updated;
    });
  };

  const handleExport = () => {
    const jsonStr = StorageService.exportToJson(workspaces, deckConfig);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inflow-workspaces-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported workspaces & deck configuration');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const imported = StorageService.importFromJson(content);
        setWorkspaces(imported.workspaces);
        await StorageService.saveWorkspaces(imported.workspaces);
        if (imported.deckConfig) {
          setDeckConfig(imported.deckConfig);
          await StorageService.saveDeckConfig(imported.deckConfig);
        }
        showToast(`Imported ${imported.workspaces.length} workspaces`);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Invalid JSON format.');
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
    <div className="min-h-screen bg-[#121214] text-neutral-200 flex flex-col font-sans antialiased selection:bg-red-500/30 selection:text-white">
      {/* Raycast Ambient Vignette Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-red-500/[0.03] rounded-full blur-[120px]" />
      </div>

      {/* Raycast Translucent Navigation Topbar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#1e1e20]/80 backdrop-blur-2xl px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* App Branding */}
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-sm">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xs font-semibold tracking-tight text-white">InFlow</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
                {isTauri ? 'Windows Desktop' : 'Web Simulator'}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-1.5">
            {/* Search Input with Shortcut Cue */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search command or workspace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-7 bg-neutral-900/80 border border-white/10 rounded-md text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 w-40 sm:w-60 transition-all"
                aria-label="Search workflows"
              />
              <kbd className="hidden sm:inline-block absolute right-2 text-[9px] font-mono text-neutral-400 border border-white/10 px-1 rounded bg-white/5">
                /
              </kbd>
            </div>

            <div className="h-4 w-[1px] bg-white/10 mx-1" />

            {/* Icon Utility Buttons */}
            <button
              onClick={() => setIsOnboardingOpen(true)}
              title="User Guide"
              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsTemplateModalOpen(true)}
              title="Browse Templates"
              className="h-7 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-red-400" />
              <span className="hidden sm:inline text-[11px]">Templates</span>
            </button>

            {/* Mobile Deck & Pairing Actions */}
            <button
              onClick={() => setIsMobileDeckOpen(true)}
              title="Configure Mobile Deck"
              className="h-7 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline text-[11px]">Mobile Deck</span>
            </button>

            <button
              onClick={() => setIsQRPairingOpen(true)}
              title="Pair Phone via QR Code"
              className="h-7 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline text-[11px]">Pair QR</span>
            </button>

            <label
              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white cursor-pointer transition-colors"
              title="Import Config"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleExport}
              title="Export Config"
              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Primary Action Button */}
            <button
              onClick={() => {
                setEditingWorkspace(null);
                setIsModalOpen(true);
              }}
              className="h-7 px-2.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-medium shadow-sm flex items-center space-x-1 transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-5 z-10">
        {/* Compact HUD Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="p-2.5 bg-[#1e1e20]/50 border border-white/[0.06] rounded-lg shadow-sm backdrop-blur-md">
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Workspaces</span>
            <div className="text-sm font-medium text-white mt-0.5">{workspaces.length}</div>
          </div>
          <div className="p-2.5 bg-[#1e1e20]/50 border border-white/[0.06] rounded-lg shadow-sm backdrop-blur-md">
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Actions</span>
            <div className="text-sm font-medium text-white mt-0.5">{totalActionsCount}</div>
          </div>
          <div className="p-2.5 bg-[#1e1e20]/50 border border-white/[0.06] rounded-lg shadow-sm backdrop-blur-md">
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Launches</span>
            <div className="text-sm font-medium text-white mt-0.5">
              {workspaces.reduce((acc, w) => acc + (w.launchCount || 0), 0)}
            </div>
          </div>
          <div className="p-2.5 bg-[#1e1e20]/50 border border-white/[0.06] rounded-lg shadow-sm backdrop-blur-md">
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Runtime</span>
            <div className="text-xs font-medium text-neutral-300 mt-1 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{isTauri ? 'Windows App' : 'Web Sandbox'}</span>
            </div>
          </div>
        </div>

        {/* Workspaces Grid / Raycast Empty View */}
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-14 px-4 border border-white/[0.08] rounded-xl bg-[#1e1e20]/40 backdrop-blur-xl max-w-sm mx-auto shadow-2xl">
            <div className="w-9 h-9 rounded-md bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-neutral-400 mb-2.5">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-white tracking-tight">
              {searchQuery ? 'No Results Found' : 'No Workspaces Configured'}
            </h3>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto mt-1 mb-4 leading-normal">
              {searchQuery
                ? `No workflows matching "${searchQuery}".`
                : 'Create automated workflows to launch apps, local directories, and websites.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setEditingWorkspace(null);
                  setIsModalOpen(true);
                }}
                className="h-7 px-3 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-medium flex items-center space-x-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Workspace</span>
              </button>
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="h-7 px-3 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 rounded-md text-xs font-medium transition-colors"
              >
                Templates
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
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

      {/* Raycast Floating HUD Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-3 py-1.5 bg-[#1e1e20]/90 text-white border border-white/10 rounded-md shadow-2xl text-xs font-medium flex items-center space-x-2 animate-fade-in backdrop-blur-2xl">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Execution Tracker Overlay */}
      <LaunchOverlay report={activeReport} onClose={() => setActiveReport(null)} />

      {/* Workspace Modal */}
      <WorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWorkspace}
        initialWorkspace={editingWorkspace}
      />

      {/* Template Gallery */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Onboarding Guide */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />

      {/* QR Pairing Modal */}
      <QRPairingModal
        isOpen={isQRPairingOpen}
        onClose={() => setIsQRPairingOpen(false)}
      />

      {/* Mobile Deck Visual Configurator */}
      <MobileDeckModal
        isOpen={isMobileDeckOpen}
        onClose={() => setIsMobileDeckOpen(false)}
        workspaces={workspaces}
        deckConfig={deckConfig}
        onSaveDeckConfig={handleSaveDeckConfig}
        onTriggerLaunch={handleLaunch}
      />
    </div>
  );
}

export default App;