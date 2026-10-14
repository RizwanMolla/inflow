import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Platform, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { Menu, ChevronUp, ChevronDown, Layers, LayoutGrid, FolderOpen } from 'lucide-react-native';

import type { DeckConfig, DeckSlot } from '../types/deck';
import { DeckGrid, type KeyResult } from './DeckGrid';
import { DeckMenuModal } from './DeckMenuModal';
import { useTheme } from '../utils/themeContext';
import { AppText } from '../ui/primitives';
import { colors, fonts } from '../ui/tokens';
import { Haptics } from '../services/haptics';

interface DeckScreenProps {
  deckConfig: DeckConfig;
  activeWorkspaceId: string | null;
  isConnected: boolean;
  results: Record<string, KeyResult>;
  /** Called for keys that run something on the PC; folder navigation is handled here. */
  onTriggerSlot: (slot: DeckSlot, pageId: string) => void;
  onCloseDeck: () => void;
  onOpenSettings: () => void;
}

export const DeckScreen: React.FC<DeckScreenProps> = ({
  deckConfig,
  activeWorkspaceId,
  isConnected,
  results,
  onTriggerSlot,
  onCloseDeck,
  onOpenSettings,
}) => {
  const { theme } = useTheme();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [folderStack, setFolderStack] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Landscape + immersive while the deck is open; restore portrait on exit.
  useEffect(() => {
    (async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') await NavigationBar.setVisibilityAsync('hidden');
      } catch (err) {
        console.warn('Failed to lock landscape orientation:', err);
      }
    })();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      if (Platform.OS === 'android') NavigationBar.setVisibilityAsync('visible').catch(() => {});
    };
  }, []);

  // Folder pages are only reachable through their folder key, so the switcher cycles top-level pages.
  const topPages = deckConfig.pages.filter((p) => !p.parentId);
  const pages = topPages.length > 0 ? topPages : deckConfig.pages;
  const totalPages = Math.max(pages.length, 1);
  const validIndex = Math.min(Math.max(currentPageIndex, 0), totalPages - 1);
  const rootPage = pages[validIndex] || deckConfig.pages[0];
  const folderId = folderStack[folderStack.length - 1];
  const folderPage = folderId ? deckConfig.pages.find((p) => p.id === folderId) : undefined;
  const activePage = folderPage || rootPage;

  // If the PC deletes the folder we're in, fall back to the top-level page.
  useEffect(() => {
    if (folderId && !folderPage) setFolderStack([]);
  }, [folderId, folderPage]);

  const goToPage = (index: number) => {
    if (index < 0 || index >= totalPages || index === validIndex) return;
    Haptics.tick();
    setFolderStack([]);
    setCurrentPageIndex(index);
  };

  const handlePressSlot = (slot: DeckSlot) => {
    if (slot.type === 'folder') {
      if (slot.targetId && deckConfig.pages.some((p) => p.id === slot.targetId)) {
        setFolderStack((stack) => [...stack, slot.targetId!]);
      }
    } else if (slot.type === 'back') {
      setFolderStack((stack) => stack.slice(0, -1));
    } else if (slot.type !== 'empty') {
      onTriggerSlot(slot, activePage.id);
    }
  };

  const PageIcon = folderPage ? FolderOpen : activePage.id === 'workspaces' ? Layers : LayoutGrid;
  const canPrev = validIndex > 0;
  const canNext = validIndex < totalPages - 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      <StatusBar hidden />

      <View style={styles.mainRow}>
        <View style={styles.gridContainer}>
          <DeckGrid
            slots={activePage.slots}
            gridDimension={deckConfig.gridDimension}
            activeWorkspaceId={activeWorkspaceId}
            results={results}
            onPressSlot={handlePressSlot}
          />
        </View>

        <View style={[styles.sidebar, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <SidebarButton
            label="Deck options"
            theme={theme}
            onPress={() => {
              Haptics.tick();
              setIsMenuOpen(true);
            }}
          >
            <Menu size={18} color={theme.ink} />
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: isConnected ? colors.success : colors.brand, borderColor: theme.surface },
              ]}
            />
          </SidebarButton>

          <View style={[styles.divider, { backgroundColor: theme.line }]} />

          <SidebarButton label="Previous page" theme={theme} disabled={!canPrev} onPress={() => goToPage(validIndex - 1)}>
            <ChevronUp size={20} color={canPrev ? theme.ink : theme.ink3} />
          </SidebarButton>

          <View style={styles.pageInfo}>
            <PageIcon size={16} color={colors.brand} />
            <AppText
              numberOfLines={2}
              style={[styles.pageTitle, { color: theme.ink }]}
            >
              {activePage.title || `Page ${validIndex + 1}`}
            </AppText>
            <View style={[styles.pageIndex, { backgroundColor: theme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)' }]}>
              <AppText style={[styles.pageIndexText, { color: theme.ink2 }]}>
                {validIndex + 1}/{totalPages}
              </AppText>
            </View>
          </View>

          <SidebarButton label="Next page" theme={theme} disabled={!canNext} onPress={() => goToPage(validIndex + 1)}>
            <ChevronDown size={20} color={canNext ? theme.ink : theme.ink3} />
          </SidebarButton>
        </View>
      </View>

      <DeckMenuModal
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpenSettings={onOpenSettings}
        onCloseDeck={onCloseDeck}
        isConnected={isConnected}
      />
    </View>
  );
};

const SidebarButton: React.FC<{
  label: string;
  theme: ReturnType<typeof useTheme>['theme'];
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}> = ({ label, theme, disabled, onPress, children }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    disabled={disabled}
    onPress={onPress}
    hitSlop={4}
    style={({ pressed }) => [
      styles.sidebarButton,
      {
        backgroundColor: pressed
          ? theme.isLight
            ? 'rgba(0,0,0,0.08)'
            : 'rgba(255,255,255,0.1)'
          : theme.isLight
          ? 'rgba(0,0,0,0.04)'
          : 'rgba(255,255,255,0.05)',
        opacity: disabled ? 0.35 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      },
    ]}
  >
    {children}
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 18, // clears punch-hole cameras in landscape
    paddingRight: 10,
    gap: 12,
  },
  gridContainer: {
    flex: 1,
    height: '100%',
  },
  sidebar: {
    width: 68,
    height: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarButton: {
    width: 48,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionDot: {
    position: 'absolute',
    top: 7,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  divider: {
    width: 32,
    height: 1,
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  pageTitle: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  pageIndex: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pageIndexText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 14,
  },
});
