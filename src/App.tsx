import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Download,
  Upload,
  Zap,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  QrCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  Workspace,
  WorkspaceAction,
  LaunchReport,
  DeckConfig,
  DeckSlot,
  GridDimension,
} from './types/workspace';
import { StorageService, isTauriEnvironment } from './services/storage';
import { LauncherService } from './services/launcher';
import { WorkspaceModal } from './components/WorkspaceModal';
import { LaunchOverlay } from './components/LaunchOverlay';
import { OnboardingModal } from './components/OnboardingModal';
import { TemplateModal } from './components/TemplateModal';
import { QRPairingModal } from './components/QRPairingModal';
import { DeckCanvas, getDimensionSlotCount } from './components/DeckCanvas';
import { KeyInspector } from './components/KeyInspector';
import { ActionPalette } from './components/ActionPalette';
import { generateDefaultDeckConfig } from './data/deckDefaults';

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [deckConfig, setDeckConfig] = useState<DeckConfig>(() => generateDefaultDeckConfig([]));
  const [activeDeckTab, setActiveDeckTab] = useState<string>('workspaces');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isQRPairingOpen, setIsQRPairingOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
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

  const handleDimensionChange = (dim: GridDimension) => {
    const { total } = getDimensionSlotCount(dim);
    const updatedPages = deckConfig.pages.map((p) => {
      let slots = [...p.slots];
      if (slots.length < total) {
        const diff = total - slots.length;
        const extra = Array.from({ length: diff }).map((_, i) => ({
          id: `slot-${p.id}-${slots.length + i}`,
          type: 'empty' as const,
          label: 'Empty Slot',
          icon: 'Plus',
        }));
        slots = [...slots, ...extra];
      }
      return { ...p, slots };
    });

    const updated: DeckConfig = {
      ...deckConfig,
      gridDimension: dim,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    handleSaveDeckConfig(updated);
  };

  const handleAddPage = (title?: string) => {
    const { total } = getDimensionSlotCount(deckConfig.gridDimension || '2x3');
    const newPageId = `page-${Date.now()}`;
    const pageNumber = deckConfig.pages.length + 1;
    const pageTitle = title || `Deck ${pageNumber}`;

    const newSlots = Array.from({ length: total }).map((_, i) => ({
      id: `slot-${newPageId}-${i}`,
      type: 'empty' as const,
      label: 'Empty Slot',
      icon: 'Plus',
    }));

    const newPage = {
      id: newPageId,
      title: pageTitle,
      slots: newSlots,
    };

    const updatedConfig: DeckConfig = {
      ...deckConfig,
      pages: [...deckConfig.pages, newPage],
      updatedAt: new Date().toISOString(),
    };

    handleSaveDeckConfig(updatedConfig);
    setActiveDeckTab(newPageId);
    setSelectedSlotIndex(0);
    showToast(`Created new deck page "${pageTitle}"`);
  };

  const handleRenamePage = (pageId: string, newTitle: string) => {
    const updatedPages = deckConfig.pages.map((p) =>
      p.id === pageId ? { ...p, title: newTitle } : p
    );
    const updatedConfig: DeckConfig = {
      ...deckConfig,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    handleSaveDeckConfig(updatedConfig);
    showToast(`Renamed page to "${newTitle}"`);
  };

  const handleDeletePage = (pageId: string) => {
    if (deckConfig.pages.length <= 1) {
      showToast('Cannot delete the only remaining page');
      return;
    }

    const updatedPages = deckConfig.pages.filter((p) => p.id !== pageId);
    const fallbackTab = updatedPages[0].id;

    const updatedConfig: DeckConfig = {
      ...deckConfig,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };

    handleSaveDeckConfig(updatedConfig);
    if (activeDeckTab === pageId) {
      setActiveDeckTab(fallbackTab);
      setSelectedSlotIndex(0);
    }
    showToast('Deleted deck page');
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset deck layout back to smart defaults?')) {
      const generated = generateDefaultDeckConfig(workspaces);
      handleSaveDeckConfig(generated);
      setActiveDeckTab('workspaces');
      setSelectedSlotIndex(0);
      showToast('Deck layout reset to defaults');
    }
  };

  const handleUpdateSlot = (index: number, updatedSlot: Partial<DeckSlot>) => {
    setDeckConfig((prev) => {
      const updatedPages = prev.pages.map((p) => {
        if (p.id === activeDeckTab) {
          const slots = [...p.slots];
          while (slots.length <= index) {
            slots.push({
              id: `slot-${p.id}-${slots.length}`,
              type: 'empty',
              label: 'Empty Slot',
              icon: 'Plus',
            });
          }
          slots[index] = {
            ...slots[index],
            ...updatedSlot,
          };
          return { ...p, slots };
        }
        return p;
      });

      const updatedConfig: DeckConfig = {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString(),
      };
      StorageService.saveDeckConfig(updatedConfig);
      return updatedConfig;
    });
  };

  const handleAssignWorkspace = (index: number, ws: Workspace) => {
    handleUpdateSlot(index, {
      type: 'workspace',
      targetId: ws.id,
      targetWorkspaceId: undefined,
      label: ws.name,
      icon: ws.icon || 'Zap',
      accentColor: ws.accentColor || 'indigo',
    });
    showToast(`Assigned workspace "${ws.name}" to Key #${index + 1}`);
  };

  const handleAssignAction = (
    index: number,
    action: { id: string; label: string; type: string; workspaceId: string }
  ) => {
    const defaultIcon =
      action.type === 'url'
        ? 'Globe'
        : action.type === 'app'
        ? 'Terminal'
        : action.type === 'folder'
        ? 'Folder'
        : 'FileText';

    handleUpdateSlot(index, {
      type: 'quick_action',
      targetId: action.id,
      targetWorkspaceId: action.workspaceId,
      label: action.label,
      icon: defaultIcon,
      accentColor: 'blue',
    });
    showToast(`Assigned action "${action.label}" to Key #${index + 1}`);
  };

  const handleClearSlot = (index: number) => {
    handleUpdateSlot(index, {
      type: 'empty',
      targetId: undefined,
      targetWorkspaceId: undefined,
      label: 'Empty Slot',
      icon: 'Plus',
      accentColor: undefined,
    });
    showToast(`Cleared Key #${index + 1}`);
  };

  // Drag & drop or Palette assignment handler
  const handleDropActionOrWorkspace = (
    slotIndex: number,
    data: { type: 'workspace' | 'action'; id: string; workspaceId?: string }
  ) => {
    const currentList = workspacesRef.current.length > 0 ? workspacesRef.current : workspaces;
    if (data.type === 'workspace') {
      const targetWs = currentList.find((w) => w.id === data.id);
      if (targetWs) {
        handleAssignWorkspace(slotIndex, targetWs);
      }
    } else if (data.type === 'action') {
      const parentWs = currentList.find((w) => w.id === data.workspaceId);
      const targetAct = parentWs?.actions.find((a) => a.id === data.id);
      if (targetAct && data.workspaceId) {
        handleAssignAction(slotIndex, {
          ...targetAct,
          workspaceId: data.workspaceId,
        });
      }
    }
  };

  // Helper when user clicks from right palette to assign to currently selected slot
  const handleAssignFromPaletteWorkspace = (ws: Workspace) => {
    const targetIdx = selectedSlotIndex !== null ? selectedSlotIndex : 0;
    handleAssignWorkspace(targetIdx, ws);
    setSelectedSlotIndex(targetIdx);
  };

  const handleAssignFromPaletteAction = (action: WorkspaceAction, workspaceId: string) => {
    const targetIdx = selectedSlotIndex !== null ? selectedSlotIndex : 0;
    handleAssignAction(targetIdx, {
      ...action,
      workspaceId,
    });
    setSelectedSlotIndex(targetIdx);
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

  const handleLaunch = async (workspace: Workspace) => {
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

  const handleTriggerActionOnly = async (actionId: string, workspaceId: string) => {
    const parentWs = workspaces.find((w) => w.id === workspaceId);
    const targetAct = parentWs?.actions.find((a) => a.id === actionId);
    if (targetAct) {
      await LauncherService.executeAction(targetAct);
      showToast(`Action executed: ${targetAct.label}`);
    }
  };

  const handleExport = () => {
    const jsonStr = StorageService.exportToJson(workspaces, deckConfig);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inflow-config-${new Date().toISOString().slice(0, 10)}.json`;
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

  const activePage =
    deckConfig.pages.find((p) => p.id === activeDeckTab) || deckConfig.pages[0];

  const currentSelectedSlot =
    selectedSlotIndex !== null && activePage?.slots[selectedSlotIndex]
      ? activePage.slots[selectedSlotIndex]
      : selectedSlotIndex !== null
      ? {
          id: `slot-${activeDeckTab}-${selectedSlotIndex}`,
          type: 'empty' as const,
          label: 'Empty Slot',
          icon: 'Plus',
        }
      : null;

  // Resizable Right Pane State (in pixels, clamped between 260px and 450px)
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(340);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX; // dragging left expands width
      const newWidth = Math.min(Math.max(startWidth + delta, 260), 460);
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className={`h-screen w-screen bg-[#121214] text-neutral-200 flex flex-col font-sans antialiased selection:bg-red-500/30 selection:text-white overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* Raycast Ambient Vignette Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-red-500/[0.04] rounded-full blur-[130px]" />
      </div>

      {/* Topbar Header */}
      <header className="flex-shrink-0 z-40 border-b border-white/[0.08] bg-[#1a1a1c]/90 backdrop-blur-2xl px-5 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* App Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-semibold tracking-tight text-white">InFlow</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
                {isTauri ? 'Windows Desktop' : 'Web Simulator'}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2">
            {/* Guide */}
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              title="User Guide"
              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {/* Templates */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              title="Browse Workflow Templates"
              className="h-7 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-red-400" />
              <span className="hidden sm:inline text-[11px]">Templates</span>
            </button>

            {/* Pair Phone via QR */}
            <button
              type="button"
              onClick={() => setIsQRPairingOpen(true)}
              title="Pair Phone via QR Code"
              className="h-7 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline text-[11px]">Pair QR</span>
            </button>

            <div className="h-4 w-[1px] bg-white/10 mx-1" />

            {/* Import / Export */}
            <label
              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white cursor-pointer transition-colors"
              title="Import Config JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleExport}
              title="Export Config JSON"
              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Primary New Workspace Button */}
            <button
              type="button"
              onClick={() => {
                setEditingWorkspace(null);
                setIsModalOpen(true);
              }}
              className="h-7 px-3 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-medium shadow-sm flex items-center space-x-1.5 transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio 3-Pane Workspace */}
      <main className="flex-1 min-h-0 z-10 p-3 flex gap-2 overflow-hidden">
        {/* Left Column (Deck Canvas + Key Customization Inspector) */}
        <div className="flex-1 min-w-0 flex flex-col gap-2.5 h-full overflow-hidden">
          {/* Top-Left: Visual Deck Canvas */}
          <div className="flex-[3] min-h-0 overflow-hidden">
            <DeckCanvas
              deckConfig={deckConfig}
              activeTab={activeDeckTab}
              onTabChange={(tab) => {
                setActiveDeckTab(tab);
                setSelectedSlotIndex(0);
              }}
              onAddPage={handleAddPage}
              onRenamePage={handleRenamePage}
              onDeletePage={handleDeletePage}
              selectedSlotIndex={selectedSlotIndex}
              onSelectSlot={(idx) => setSelectedSlotIndex(idx)}
              onUpdateDimension={handleDimensionChange}
              onResetDefaults={handleResetDefaults}
              onDropActionOrWorkspace={handleDropActionOrWorkspace}
            />
          </div>

          {/* Bottom-Left: Key Inspector & Styling Studio */}
          <div className="flex-[2] min-h-0 overflow-hidden">
            <KeyInspector
              selectedSlotIndex={selectedSlotIndex}
              slot={currentSelectedSlot}
              activeTab={activeDeckTab}
              workspaces={workspaces}
              onUpdateSlot={handleUpdateSlot}
              onClearSlot={handleClearSlot}
              onAssignWorkspace={handleAssignWorkspace}
              onAssignAction={handleAssignAction}
              onTriggerLaunch={handleLaunch}
              onTriggerAction={handleTriggerActionOnly}
            />
          </div>
        </div>

        {/* Resizable Divider Handle */}
        <div
          onMouseDown={handleMouseDownResize}
          className="group relative w-2 hover:w-2 flex items-center justify-center cursor-col-resize select-none flex-shrink-0 transition-colors"
          title="Drag to resize library pane"
        >
          <div className="w-[3px] h-12 rounded-full bg-white/10 group-hover:bg-red-500/80 group-active:bg-red-500 transition-colors" />
        </div>

        {/* Right Column: Action Library & Workspace Palette (Dynamic width) */}
        <div
          style={{ width: `${rightPanelWidth}px` }}
          className="flex-shrink-0 h-full min-h-0 overflow-hidden"
        >
          <ActionPalette
            workspaces={workspaces}
            onSelectWorkspaceToAssign={handleAssignFromPaletteWorkspace}
            onSelectActionToAssign={handleAssignFromPaletteAction}
            onOpenNewWorkspaceModal={() => {
              setEditingWorkspace(null);
              setIsModalOpen(true);
            }}
            onEditWorkspace={(ws) => {
              setEditingWorkspace(ws);
              setIsModalOpen(true);
            }}
            onLaunchWorkspace={handleLaunch}
          />
        </div>
      </main>

      {/* Floating HUD Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-3.5 py-2 bg-[#1e1e20]/95 text-white border border-white/10 rounded-lg shadow-2xl text-xs font-medium flex items-center space-x-2 animate-fade-in backdrop-blur-2xl">
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
    </div>
  );
}

export default App;