import type { DeckConfig, DeckPage, DeckSlot, Workspace } from '../types/workspace';
import { KEY_PRESETS } from '../utils/theme';
import {
  contentFromPreset,
  contentFromWorkspace,
  contentFromWorkspaceStep,
  emptySlot,
  type SlotContent,
} from '../services/deckOps';

// Pages are created with enough slots for the largest grid (3x6) so switching sizes never loses keys.
const SLOTS_PER_PAGE = 18;

function buildPage(id: string, title: string, contents: SlotContent[], parentId?: string): DeckPage {
  const slots: DeckSlot[] = Array.from({ length: SLOTS_PER_PAGE }, (_, i) =>
    contents[i] ? { ...contents[i], id: `slot-${id}-${i}` } : emptySlot(id, i)
  );
  return { id, title, slots, ...(parentId ? { parentId } : {}) };
}

function preset(id: string): SlotContent {
  const found = KEY_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown key preset "${id}"`);
  return contentFromPreset(found);
}

export function generateDefaultDeckConfig(workspaces: Workspace[]): DeckConfig {
  const workspaceKeys = workspaces.slice(0, SLOTS_PER_PAGE).map(contentFromWorkspace);

  const stepKeys = workspaces
    .flatMap((w) => w.actions.map((a) => contentFromWorkspaceStep(a, w.id)))
    .slice(0, SLOTS_PER_PAGE);

  const mediaFolderId = 'folder-media';
  const systemKeys: SlotContent[] = [
    preset('show-desktop'),
    preset('screenshot'),
    preset('task-manager'),
    preset('lock-pc'),
    preset('media-mute'),
    { type: 'folder', targetId: mediaFolderId, label: 'Media', icon: 'Headphones', accentColor: 'amber' },
  ];

  const mediaFolder: DeckPage = buildPage(
    mediaFolderId,
    'Media',
    [
      { type: 'back', label: 'Back', icon: 'ArrowLeft' },
      preset('media-play_pause'),
      preset('media-prev_track'),
      preset('media-next_track'),
      preset('media-volume_down'),
      preset('media-volume_up'),
      preset('media-mute'),
    ],
    'system'
  );

  return {
    version: 2,
    gridDimension: '2x3',
    activePageId: 'workspaces',
    pages: [
      buildPage('workspaces', 'Workspaces', workspaceKeys),
      buildPage('quick_actions', 'Quick Actions', stepKeys),
      buildPage('system', 'System', systemKeys),
      mediaFolder,
    ],
    updatedAt: new Date().toISOString(),
  };
}
