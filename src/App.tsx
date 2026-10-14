import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  ActivityEntry,
  DeckConfig,
  DeckSlot,
  GridDimension,
  LaunchReport,
  ServerStatus,
  TriggerSource,
  Workspace,
  WorkspaceAction,
} from './types/workspace';
import { StorageService } from './services/storage';
import { LauncherService } from './services/launcher';
import { Native, isTauriEnvironment, type RemoteTrigger } from './services/native';
import type { DragItemData } from './services/dragManager';
import {
  addPage,
  clearSlot,
  cloneContent,
  contentFromPreset,
  contentFromWorkspace,
  contentFromWorkspaceStep,
  createFolder,
  deletePage,
  findSlot,
  getDimensionSlotCount,
  getPage,
  padSlots,
  patchSlot,
  removeWorkspaceRefs,
  renamePage,
  resizeGrid,
  setSlotContent,
  swapSlots,
  topLevelPages,
  uid,
  type SlotContent,
} from './services/deckOps';
import { generateDefaultDeckConfig } from './data/deckDefaults';
import { KEY_PRESETS, type KeyPreset } from './utils/theme';
import { AppHeader } from './components/AppHeader';
import { DeckCanvas, type KeyFlash, type LiveTone } from './components/DeckCanvas';
import { KeyInspector } from './components/KeyInspector';
import { LibraryPanel } from './components/LibraryPanel';
import { WorkspaceModal } from './components/WorkspaceModal';
import { LaunchOverlay } from './components/LaunchOverlay';
import { OnboardingModal } from './components/OnboardingModal';
import { TemplateModal } from './components/TemplateModal';
import { QRPairingModal } from './components/QRPairingModal';
import { CommandPalette, type PaletteItem } from './components/CommandPalette';

type Toast = { message: string; tone: 'success' | 'error' | 'info' };
type RunResult = { success: boolean; message?: string };

const PERSIST_DEBOUNCE_MS = 250;
const FOCUS_COUNTDOWN_MS = 3000;
const MAX_ACTIVITY = 50;

export function App() {
  const isTauri = isTauriEnvironment();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [deckConfig, setDeckConfig] = useState<DeckConfig>(() => generateDefaultDeckConfig([]));
  const [loaded, setLoaded] = useState(false);
  const workspacesRef = useRef(workspaces);
  const deckRef = useRef(deckConfig);

  const [activePageId, setActivePageId] = useState('workspaces');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [clipboard, setClipboard] = useState<SlotContent | null>(null);
  const [flashes, setFlashes] = useState<Record<string, KeyFlash>>({});
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [activeReport, setActiveReport] = useState<LaunchReport | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [workspaceModal, setWorkspaceModal] = useState<{ open: boolean; editing: Workspace | null }>({ open: false, editing: null });
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  // --- State updates (refs are the source of truth so async handlers never see stale data) ---

  const updateDeck = useCallback((fn: (cfg: DeckConfig) => DeckConfig) => {
    const next = fn(deckRef.current);
    if (next === deckRef.current) return;
    deckRef.current = next;
    setDeckConfig(next);
  }, []);

  const updateWorkspaces = useCallback((fn: (list: Workspace[]) => Workspace[]) => {
    const next = fn(workspacesRef.current);
    workspacesRef.current = next;
    setWorkspaces(next);
  }, []);

  // --- Load & persist ---

  useEffect(() => {
    (async () => {
      const ws = await StorageService.loadWorkspaces();
      const deck = await StorageService.loadDeckConfig(ws);
      workspacesRef.current = ws;
      deckRef.current = deck;
      setWorkspaces(ws);
      setDeckConfig(deck);
      setActivePageId(topLevelPages(deck)[0]?.id ?? deck.pages[0]?.id);
      setLoaded(true);
      Native.updateTray(ws);
    })();
    if (!StorageService.isOnboardingCompleted()) setIsOnboardingOpen(true);
  }, []);

  // Persistence is debounced so typing a key title doesn't rewrite the store on every keystroke.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => StorageService.saveDeckConfig(deckConfig), PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [deckConfig, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => StorageService.saveWorkspaces(workspaces), PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [workspaces, loaded]);

  // --- Server status ---

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    const refresh = () => Native.getServerStatus().then((s) => !cancelled && s && setServerStatus(s));
    refresh();
    Native.listen<ServerStatus>('server-status', setServerStatus).then((fn) => (cancelled ? fn() : (unlisten = fn)));
    const poll = setInterval(refresh, 15_000);
    return () => {
      cancelled = true;
      unlisten?.();
      clearInterval(poll);
    };
  }, [isTauri]);

  const live = useMemo<{ tone: LiveTone; label: string }>(() => {
    if (!isTauri) return { tone: 'sim', label: 'Simulator' };
    if (!serverStatus) return { tone: 'idle', label: 'Starting…' };
    if (!serverStatus.online) return { tone: 'offline', label: 'Server offline' };
    const n = serverStatus.connectedClients;
    return n > 0 ? { tone: 'live', label: `${n} phone${n === 1 ? '' : 's'} live` } : { tone: 'idle', label: 'No phone connected' };
  }, [isTauri, serverStatus]);

  // --- Running keys ---

  const flash = useCallback((slotId: string, state: KeyFlash['state']) => {
    const at = Date.now();
    setFlashes((f) => ({ ...f, [slotId]: { state, at } }));
    setTimeout(() => setFlashes((f) => (f[slotId]?.at === at ? (({ [slotId]: _, ...rest }) => rest)(f) : f)), 1200);
  }, []);

  const logActivity = useCallback((entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
    setActivity((list) => [{ ...entry, id: uid('log'), timestamp: Date.now() }, ...list].slice(0, MAX_ACTIVITY));
  }, []);

  const launchWorkspace = useCallback(
    async (workspace: Workspace, source: TriggerSource): Promise<LaunchReport> => {
      if (source === 'desktop' || source === 'palette') {
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.9 }, colors: ['#ef4444', '#ffffff', '#818cf8', '#34d399'] });
      }
      setActiveReport({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        startTime: Date.now(),
        totalActions: workspace.actions.length,
        succeededActions: 0,
        failedActions: 0,
        progressList: workspace.actions.map((a) => ({ actionId: a.id, label: a.label, type: a.type, target: a.target, status: 'pending' })),
        isComplete: false,
      });
      const report = await LauncherService.launchWorkspace(workspace, (progress) =>
        setActiveReport((prev) =>
          prev && prev.workspaceId === workspace.id
            ? { ...prev, progressList: prev.progressList.map((p) => (p.actionId === progress.actionId ? progress : p)) }
            : prev
        )
      );
      setActiveReport(report);
      updateWorkspaces((list) =>
        list.map((w) =>
          w.id === workspace.id ? { ...w, launchCount: (w.launchCount || 0) + 1, lastLaunchedAt: new Date().toISOString() } : w
        )
      );
      return report;
    },
    [updateWorkspaces]
  );

  const runAction = useCallback(
    async (action: WorkspaceAction, source: TriggerSource): Promise<RunResult> => {
      // Keystrokes go to the focused window, which is InFlow itself when testing from here.
      if (source === 'desktop' && (action.type === 'hotkey' || action.type === 'text')) {
        showToast('Switch to the target window — sending in 3 seconds', 'info');
        await new Promise((r) => setTimeout(r, FOCUS_COUNTDOWN_MS));
      }
      const res = await LauncherService.executeAction(action);
      return { success: res.success, message: res.error };
    },
    [showToast]
  );

  const runSlot = useCallback(
    async (slot: DeckSlot, source: TriggerSource): Promise<RunResult> => {
      flash(slot.id, 'pressed');
      const ws = workspacesRef.current;
      let result: RunResult;

      if (slot.type === 'workspace') {
        const target = ws.find((w) => w.id === slot.targetId);
        if (!target) {
          result = { success: false, message: 'This workspace no longer exists.' };
        } else {
          const report = await launchWorkspace(target, source);
          const firstError = report.progressList.find((p) => p.status === 'error');
          result = {
            success: report.failedActions === 0,
            message: firstError ? `${firstError.label}: ${firstError.error}` : undefined,
          };
        }
      } else if (slot.type === 'quick_action') {
        const action = ws.find((w) => w.id === slot.targetWorkspaceId)?.actions.find((a) => a.id === slot.targetId);
        result = action ? await runAction(action, source) : { success: false, message: 'This step no longer exists.' };
      } else if (slot.type === 'custom') {
        result = slot.action ? await runAction(slot.action, source) : { success: false, message: 'No action configured.' };
      } else {
        return { success: false, message: 'Nothing to run.' };
      }

      flash(slot.id, result.success ? 'success' : 'error');
      logActivity({ label: slot.label || 'Key', icon: slot.icon, accentColor: slot.accentColor, source, success: result.success, message: result.message });
      if (!result.success && source !== 'phone') showToast(result.message || 'Action failed', 'error');
      return result;
    },
    [flash, launchWorkspace, logActivity, runAction, showToast]
  );

  // Remote presses (phone over Wi-Fi, tray menu) arrive as Tauri events from the Rust server.
  const runSlotRef = useRef(runSlot);
  runSlotRef.current = runSlot;

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    Native.listen<RemoteTrigger>('remote-launch-trigger', async (payload) => {
      const deck = deckRef.current;
      let slot: DeckSlot | null = payload.slotId ? findSlot(deck, payload.slotId, payload.pageId)?.slot ?? null : null;

      // Older phones and the tray only send workspace/action ids.
      if (!slot && payload.workspaceId) {
        const ws = workspacesRef.current.find((w) => w.id === payload.workspaceId);
        const action = payload.actionId ? ws?.actions.find((a) => a.id === payload.actionId) : undefined;
        if (ws) {
          slot = action
            ? { id: `remote-${action.id}`, ...contentFromWorkspaceStep(action, ws.id) }
            : { id: `remote-${ws.id}`, ...contentFromWorkspace(ws) };
        }
      }
      if (!slot) return;

      const result = await runSlotRef.current(slot, payload.source || 'phone');
      Native.reportLaunchResult({
        slotId: payload.slotId,
        workspaceId: slot.type === 'workspace' ? slot.targetId : null,
        success: result.success,
        message: result.message,
      });
    }).then((fn) => (cancelled ? fn() : (unlisten = fn)));
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [isTauri]);

  // --- Deck editing ---

  const activePage = getPage(deckConfig, activePageId) ?? topLevelPages(deckConfig)[0] ?? deckConfig.pages[0];
  const pageId = activePage.id;
  const { total } = getDimensionSlotCount(deckConfig.gridDimension);
  const pageSlots = padSlots(activePage, pageId, total).slice(0, total);
  const selectedSlot = selectedIndex !== null && selectedIndex < total ? pageSlots[selectedIndex] : null;

  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= total) setSelectedIndex(total - 1);
  }, [selectedIndex, total]);

  const goToPage = useCallback((id: string) => {
    setActivePageId(id);
    // Folder pages start with Back at 0, so select the first real key.
    setSelectedIndex(getPage(deckRef.current, id)?.parentId ? 1 : 0);
  }, []);

  /** Replacing a folder deletes its pages, so confirm when it still has keys. */
  const confirmFolderReplace = useCallback(async (index: number): Promise<boolean> => {
    const slot = getPage(deckRef.current, pageId)?.slots[index];
    if (slot?.type !== 'folder' || !slot.targetId) return true;
    const folder = getPage(deckRef.current, slot.targetId);
    const count = folder?.slots.filter((s) => s.type !== 'empty' && s.type !== 'back').length ?? 0;
    if (count === 0) return true;
    return Native.confirm(`“${slot.label}” contains ${count} key${count === 1 ? '' : 's'}. Replacing it deletes the folder and its keys.`, 'Replace folder');
  }, [pageId]);

  const assignContent = useCallback(
    async (index: number, content: SlotContent) => {
      if (!(await confirmFolderReplace(index))) return;
      updateDeck((cfg) => setSlotContent(cfg, pageId, index, content));
      setSelectedIndex(index);
    },
    [confirmFolderReplace, pageId, updateDeck]
  );

  const makeFolder = useCallback(
    async (index: number, title = 'Folder') => {
      if (!(await confirmFolderReplace(index))) return;
      let folderId = '';
      updateDeck((cfg) => {
        const res = createFolder(cfg, pageId, index, title);
        folderId = res.folderId;
        return res.config;
      });
      setSelectedIndex(index);
      if (folderId) showToast('Folder created. Double-click it to add keys inside.', 'info');
    },
    [confirmFolderReplace, pageId, showToast, updateDeck]
  );

  const assignPreset = useCallback(
    (index: number, preset: KeyPreset) => (preset.action ? assignContent(index, contentFromPreset(preset)) : makeFolder(index)),
    [assignContent, makeFolder]
  );

  /** Library clicks go to the selected key, or the first empty key if nothing is selected. */
  const targetIndex = () => {
    if (selectedIndex !== null && !(selectedIndex === 0 && activePage.parentId)) return selectedIndex;
    const empty = pageSlots.findIndex((s) => s.type === 'empty');
    return empty >= 0 ? empty : 0;
  };

  const handleDrop = (index: number, item: DragItemData) => {
    if (item.type === 'slot' && item.slotIndex !== undefined) {
      updateDeck((cfg) => swapSlots(cfg, pageId, item.slotIndex!, index));
      setSelectedIndex(index);
    } else if (item.type === 'workspace') {
      const ws = workspacesRef.current.find((w) => w.id === item.id);
      if (ws) assignContent(index, contentFromWorkspace(ws));
    } else if (item.type === 'action') {
      const action = workspacesRef.current.find((w) => w.id === item.workspaceId)?.actions.find((a) => a.id === item.id);
      if (action && item.workspaceId) assignContent(index, contentFromWorkspaceStep(action, item.workspaceId));
    } else if (item.type === 'preset') {
      const preset = KEY_PRESETS.find((p) => p.id === item.id);
      if (preset) assignPreset(index, preset);
    }
  };

  const handleClear = async (index: number) => {
    if (!(await confirmFolderReplace(index))) return;
    updateDeck((cfg) => clearSlot(cfg, pageId, index));
  };

  const handleCopy = (index: number) => {
    const slot = pageSlots[index];
    if (!slot || slot.type === 'empty' || slot.type === 'back') return;
    if (slot.type === 'folder') return showToast('Folders can’t be copied yet. Drag it to move it instead.', 'info');
    setClipboard(cloneContent(slot));
    showToast(`Copied “${slot.label}”`, 'info');
  };

  const handlePaste = (index: number) => {
    if (!clipboard) return;
    assignContent(index, cloneContent({ ...clipboard, id: '' }));
  };

  const handleDuplicate = (index: number) => {
    const slot = pageSlots[index];
    if (!slot || slot.type === 'empty' || slot.type === 'back') return;
    if (slot.type === 'folder') return showToast('Folders can’t be duplicated yet.', 'info');
    const free = pageSlots.findIndex((s, i) => i > index && s.type === 'empty');
    const target = free >= 0 ? free : pageSlots.findIndex((s) => s.type === 'empty');
    if (target < 0) return showToast('No empty key left on this page.', 'error');
    assignContent(target, cloneContent(slot));
  };

  const openFolder = (index: number) => {
    const slot = pageSlots[index];
    if (slot?.type === 'folder' && slot.targetId && getPage(deckRef.current, slot.targetId)) goToPage(slot.targetId);
  };

  const handleAddPage = useCallback(() => {
    let newId = '';
    updateDeck((cfg) => {
      const res = addPage(cfg, `Page ${topLevelPages(cfg).length + 1}`);
      newId = res.pageId;
      return res.config;
    });
    if (newId) goToPage(newId);
  }, [goToPage, updateDeck]);

  const handleDeletePage = async (id: string) => {
    const page = getPage(deckRef.current, id);
    if (!page || topLevelPages(deckRef.current).length <= 1) return;
    if (!(await Native.confirm(`Delete the page “${page.title}” and all of its keys and folders?`, 'Delete page'))) return;
    updateDeck((cfg) => deletePage(cfg, id));
    if (!getPage(deckRef.current, activePageId)) goToPage(topLevelPages(deckRef.current)[0].id);
  };

  const handleResetDeck = async () => {
    if (!(await Native.confirm('Replace the whole deck with the default layout? Your workspaces are kept.', 'Reset deck'))) return;
    const fresh = generateDefaultDeckConfig(workspacesRef.current);
    updateDeck(() => fresh);
    goToPage(topLevelPages(fresh)[0].id);
    showToast('Deck reset to the default layout');
  };

  // --- Workspaces ---

  const handleSaveWorkspace = (saved: Workspace) => {
    const exists = workspacesRef.current.some((w) => w.id === saved.id);
    updateWorkspaces((list) => (exists ? list.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...list]));
    showToast(exists ? `Saved “${saved.name}”` : `Created “${saved.name}”`);
  };

  const handleDeleteWorkspace = async (ws: Workspace) => {
    if (!(await Native.confirm(`Delete “${ws.name}”? Keys that run it or its steps will be cleared.`, 'Delete workspace'))) return;
    updateWorkspaces((list) => list.filter((w) => w.id !== ws.id));
    updateDeck((cfg) => removeWorkspaceRefs(cfg, ws.id));
    setWorkspaceModal({ open: false, editing: null });
    showToast(`Deleted “${ws.name}”`);
  };

  const handleSelectTemplate = (template: Workspace) => {
    const ws: Workspace = {
      ...template,
      id: uid('ws'),
      launchCount: 0,
      lastLaunchedAt: undefined,
      actions: template.actions.map((a) => ({ ...a, id: uid('act') })),
    };
    updateWorkspaces((list) => [ws, ...list]);
    setIsTemplatesOpen(false);
    showToast(`Added “${template.name}”. Drag it onto a key.`);
  };

  const openNewWorkspace = () => setWorkspaceModal({ open: true, editing: null });
  const openEditWorkspace = (ws: Workspace) => setWorkspaceModal({ open: true, editing: ws });

  // --- Import / export ---

  const handleExport = useCallback(() => {
    const blob = new Blob([StorageService.exportToJson(workspacesRef.current, deckRef.current)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inflow-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported workspaces and deck');
  }, [showToast]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((content) => {
      try {
        const imported = StorageService.importFromJson(content);
        updateWorkspaces(() => imported.workspaces);
        if (imported.deckConfig) {
          updateDeck(() => imported.deckConfig!);
          goToPage(topLevelPages(imported.deckConfig)[0]?.id ?? imported.deckConfig.pages[0].id);
        }
        showToast(`Imported ${imported.workspaces.length} workspaces`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'That file is not a valid InFlow export.', 'error');
      }
    });
  };

  // --- Global shortcuts ---

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = workspaces.map((ws) => ({
      id: `ws-${ws.id}`,
      group: 'Workspaces',
      label: ws.name,
      sublabel: `${ws.actions.length} steps`,
      icon: ws.icon,
      accentColor: ws.accentColor,
      hint: 'Launch',
      run: () => launchWorkspace(ws, 'palette'),
    }));

    for (const page of deckConfig.pages) {
      page.slots.forEach((slot, i) => {
        if (i >= total) return;
        if (slot.type === 'custom' || slot.type === 'quick_action') {
          items.push({
            id: `key-${slot.id}`,
            group: 'Deck keys',
            label: slot.label || 'Key',
            sublabel: page.title,
            icon: slot.icon,
            accentColor: slot.accentColor,
            run: () => runSlot(slot, 'palette'),
          });
        } else if (slot.type === 'folder' && slot.targetId) {
          const folderId = slot.targetId;
          items.push({
            id: `folder-${slot.id}`,
            group: 'Deck keys',
            label: slot.label || 'Folder',
            sublabel: `Folder in ${page.title}`,
            icon: slot.icon,
            accentColor: slot.accentColor,
            hint: 'Open',
            run: () => goToPage(folderId),
          });
        }
      });
    }

    const commands: Omit<PaletteItem, 'group'>[] = [
      { id: 'cmd-new', label: 'New workspace', icon: 'Plus', hint: 'Open', run: openNewWorkspace },
      { id: 'cmd-templates', label: 'Browse templates', icon: 'Sparkles', hint: 'Open', run: () => setIsTemplatesOpen(true) },
      { id: 'cmd-pair', label: 'Pair phone', sublabel: 'Show QR code', icon: 'Smartphone', hint: 'Open', run: () => setIsPairingOpen(true) },
      { id: 'cmd-page', label: 'Add deck page', icon: 'LayoutGrid', hint: 'Add', run: handleAddPage },
      { id: 'cmd-export', label: 'Export configuration', icon: 'Download', run: handleExport },
      { id: 'cmd-import', label: 'Import configuration', icon: 'Upload', hint: 'Open', run: () => importInputRef.current?.click() },
      { id: 'cmd-guide', label: 'Show guide', icon: 'BookOpen', hint: 'Open', run: () => setIsOnboardingOpen(true) },
    ];
    return [...items, ...commands.map((c) => ({ ...c, group: 'Commands' }))];
  }, [workspaces, deckConfig, total, launchWorkspace, runSlot, goToPage, handleAddPage, handleExport]);

  // Stable close handlers: modals use them as effect dependencies for their Escape listeners.
  const closeReport = useCallback(() => setActiveReport(null), []);
  const closeWorkspaceModal = useCallback(() => setWorkspaceModal({ open: false, editing: null }), []);
  const closeTemplates = useCallback(() => setIsTemplatesOpen(false), []);
  const closeOnboarding = useCallback(() => setIsOnboardingOpen(false), []);
  const closePairing = useCallback(() => setIsPairingOpen(false), []);
  const closePalette = useCallback(() => setIsPaletteOpen(false), []);

  // --- Resizable library pane ---

  const [rightPanelWidth, setRightPanelWidth] = useState(340);
  const [isResizing, setIsResizing] = useState(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = rightPanelWidth;
    const onMove = (ev: MouseEvent) => setRightPanelWidth(Math.min(Math.max(startWidth + (startX - ev.clientX), 280), 460));
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className={`h-full w-full flex flex-col bg-canvas text-ink overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <AppHeader
        isTauri={isTauri}
        live={live}
        onOpenPalette={() => setIsPaletteOpen(true)}
        onOpenPairing={() => setIsPairingOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenGuide={() => setIsOnboardingOpen(true)}
        onImport={() => importInputRef.current?.click()}
        onExport={handleExport}
        onNewWorkspace={openNewWorkspace}
      />
      <input ref={importInputRef} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />

      <main className="flex-1 min-h-0 p-3 flex gap-1.5 overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex-[3] min-h-[300px]">
            <DeckCanvas
              deckConfig={deckConfig}
              workspaces={workspaces}
              activePageId={pageId}
              onChangePage={goToPage}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onAddPage={handleAddPage}
              onRenamePage={(id, title) => updateDeck((cfg) => renamePage(cfg, id, title))}
              onDeletePage={handleDeletePage}
              onChangeGrid={(dim: GridDimension) => updateDeck((cfg) => resizeGrid(cfg, dim))}
              onResetDefaults={handleResetDeck}
              onDrop={handleDrop}
              onRunKey={(i) => pageSlots[i] && runSlot(pageSlots[i], 'desktop')}
              onOpenFolder={openFolder}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onDuplicate={handleDuplicate}
              onClear={handleClear}
              canPaste={!!clipboard}
              flashes={flashes}
              live={live}
            />
          </div>
          <div className="flex-[2] min-h-[270px]">
            <KeyInspector
              deckConfig={deckConfig}
              pageId={pageId}
              index={selectedSlot ? selectedIndex : null}
              slot={selectedSlot}
              workspaces={workspaces}
              onSetContent={(content) => selectedIndex !== null && assignContent(selectedIndex, content)}
              onPatch={(patch) => selectedIndex !== null && updateDeck((cfg) => patchSlot(cfg, pageId, selectedIndex, patch))}
              onClear={() => selectedIndex !== null && handleClear(selectedIndex)}
              onMakeFolder={() => selectedIndex !== null && makeFolder(selectedIndex)}
              onOpenFolder={() => selectedIndex !== null && openFolder(selectedIndex)}
              onRun={() => selectedSlot && runSlot(selectedSlot, 'desktop')}
              onEditWorkspace={openEditWorkspace}
            />
          </div>
        </div>

        <div
          onMouseDown={startResize}
          className="group w-1.5 flex items-center justify-center cursor-col-resize flex-shrink-0"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize library"
        >
          <div className="w-[3px] h-10 rounded-full bg-white/10 group-hover:bg-brand/80 transition-colors" />
        </div>

        <div style={{ width: rightPanelWidth }} className="flex-shrink-0 min-h-0">
          <LibraryPanel
            workspaces={workspaces}
            activity={activity}
            hasSelection={selectedIndex !== null}
            onAssignWorkspace={(ws) => assignContent(targetIndex(), contentFromWorkspace(ws))}
            onAssignStep={(action, wsId) => assignContent(targetIndex(), contentFromWorkspaceStep(action, wsId))}
            onAssignPreset={(preset) => assignPreset(targetIndex(), preset)}
            onNewWorkspace={openNewWorkspace}
            onEditWorkspace={openEditWorkspace}
            onLaunchWorkspace={(ws) => launchWorkspace(ws, 'desktop')}
          />
        </div>
      </main>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 h-10 px-4 rounded-full bg-[#1f1f23]/95 border border-line-strong shadow-2xl backdrop-blur-xl text-ui font-medium animate-slide-up`}
        >
          {toast.tone === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          {toast.tone === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
          {toast.tone === 'info' && <Info className="w-3.5 h-3.5 text-sky-400" />}
          {toast.message}
        </div>
      )}

      <LaunchOverlay report={activeReport} onClose={closeReport} />

      <WorkspaceModal
        isOpen={workspaceModal.open}
        onClose={closeWorkspaceModal}
        onSave={handleSaveWorkspace}
        onDelete={handleDeleteWorkspace}
        initialWorkspace={workspaceModal.editing}
      />
      <TemplateModal isOpen={isTemplatesOpen} onClose={closeTemplates} onSelectTemplate={handleSelectTemplate} />
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={closeOnboarding}
        onComplete={() => {
          StorageService.setOnboardingCompleted(true);
          setIsOnboardingOpen(false);
        }}
      />
      <QRPairingModal isOpen={isPairingOpen} onClose={closePairing} status={serverStatus} />
      <CommandPalette isOpen={isPaletteOpen} onClose={closePalette} items={paletteItems} />
    </div>
  );
}

export default App;
