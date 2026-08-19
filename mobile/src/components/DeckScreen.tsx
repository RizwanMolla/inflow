import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { Menu, ChevronUp, ChevronDown, Layers, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { DeckConfig, DeckSlot } from '../types/deck';
import { DeckGrid } from './DeckGrid';
import { DeckMenuModal } from './DeckMenuModal';
import { useTheme } from '../utils/themeContext';

interface DeckScreenProps {
  deckConfig: DeckConfig;
  activeWorkspaceId: string | null;
  isConnected: boolean;
  onPressSlot: (slot: DeckSlot) => void;
  onCloseDeck: () => void;
  onOpenSettings: () => void;
}

export const DeckScreen: React.FC<DeckScreenProps> = ({
  deckConfig,
  activeWorkspaceId,
  isConnected,
  onPressSlot,
  onCloseDeck,
  onOpenSettings,
}) => {
  const { theme } = useTheme();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 1. Force Landscape & Immersive full screen on mount, unlock on unmount
  useEffect(() => {
    async function lockLandscapeAndImmersive() {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('hidden');
        }
      } catch (err) {
        console.warn('Failed to lock landscape orientation:', err);
      }
    }

    lockLandscapeAndImmersive();

    return () => {
      // Revert to portrait & restore navigation bar
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      }
    };
  }, []);

  const totalPages = Math.max(deckConfig.pages.length, 1);
  const validIndex = Math.min(Math.max(currentPageIndex, 0), totalPages - 1);
  const activePage = deckConfig.pages[validIndex] || deckConfig.pages[0];

  const handlePrevPage = () => {
    if (validIndex > 0) {
      Haptics.selectionAsync().catch(() => {});
      setCurrentPageIndex(validIndex - 1);
    }
  };

  const handleNextPage = () => {
    if (validIndex < totalPages - 1) {
      Haptics.selectionAsync().catch(() => {});
      setCurrentPageIndex(validIndex + 1);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Hide status bar for total immersive experience */}
      <StatusBar hidden={true} />

      {/* Main Screen Layout: Main Deck Grid (Left/Center) + Right Sidebar (Right) */}
      <View style={styles.mainRow}>
        {/* Main Grid Viewport - Fits 100% with zero scrolling */}
        <View style={styles.gridContainer}>
          <DeckGrid
            slots={activePage.slots}
            gridDimension={deckConfig.gridDimension}
            activeWorkspaceId={activeWorkspaceId}
            onPressSlot={onPressSlot}
          />
        </View>

        {/* Right Side: Vertical Page / Deck Switcher + Integrated Hamburger Menu */}
        <View style={[styles.rightSidebar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {/* Top: 3-Line Hamburger Menu */}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setIsMenuOpen(true);
            }}
            style={[styles.menuIconButton, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}
            activeOpacity={0.7}
          >
            <Menu size={18} color={theme.text} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Up Arrow */}
          <TouchableOpacity
            onPress={handlePrevPage}
            disabled={validIndex === 0}
            style={[
              styles.arrowButton,
              validIndex === 0 && styles.arrowButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            <ChevronUp
              size={20}
              color={validIndex === 0 ? theme.border : theme.text}
            />
          </TouchableOpacity>

          {/* Current Page Tag & Indicators */}
          <View style={styles.pageInfoContainer}>
            {activePage.id === 'workspaces' ? (
              <Layers size={16} color={theme.accent} />
            ) : (
              <Zap size={16} color={theme.accent} />
            )}
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.pageTitleVertical, { color: theme.text }]}
            >
              {activePage.title || `Deck ${validIndex + 1}`}
            </Text>
            <View style={styles.pageIndexBadge}>
              <Text style={[styles.pageIndexText, { color: theme.textSecondary }]}>
                {validIndex + 1}/{totalPages}
              </Text>
            </View>
          </View>

          {/* Down Arrow */}
          <TouchableOpacity
            onPress={handleNextPage}
            disabled={validIndex === totalPages - 1}
            style={[
              styles.arrowButton,
              validIndex === totalPages - 1 && styles.arrowButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            <ChevronDown
              size={20}
              color={validIndex === totalPages - 1 ? theme.border : theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overlay Hamburger Menu */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingLeft: 12, // extra left padding to safely clear any punch-hole or notch
    gap: 8,
  },
  gridContainer: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSidebar: {
    width: 62,
    height: '96%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  menuIconButton: {
    width: 44,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 36,
    height: 1,
    marginVertical: 2,
    opacity: 0.7,
  },
  arrowButton: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonDisabled: {
    opacity: 0.25,
  },
  pageInfoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  pageTitleVertical: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 2,
  },
  pageIndexBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 2,
  },
  pageIndexText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
});
