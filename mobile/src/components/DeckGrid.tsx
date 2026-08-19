import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { DeckSlot, GridDimension } from '../types/deck';
import { renderDeckIcon, ACCENT_PALETTE } from '../utils/theme';
import { useTheme } from '../utils/themeContext';

interface DeckGridProps {
  slots: DeckSlot[];
  gridDimension: GridDimension;
  activeWorkspaceId: string | null;
  onPressSlot: (slot: DeckSlot) => void;
}

export const DeckGrid: React.FC<DeckGridProps> = ({
  slots,
  gridDimension,
  activeWorkspaceId,
  onPressSlot,
}) => {
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number } | null>(null);
  const { theme } = useTheme();

  // Determine grid dimensions
  // e.g. 2x3 -> 2 rows, 3 cols (total 6)
  // e.g. 3x4 -> 3 rows, 4 cols (total 12)
  const is2x3 = gridDimension === '2x3';
  const numRows = is2x3 ? 2 : 3;
  const numCols = is2x3 ? 3 : 4;
  const totalCount = numRows * numCols;
  const activeSlots = slots.slice(0, totalCount);

  // If slots has fewer items than total, fill with empty slots
  const displaySlots: DeckSlot[] = [...activeSlots];
  while (displaySlots.length < totalCount) {
    displaySlots.push({
      id: `slot-filler-${displaySlots.length}`,
      type: 'empty',
      label: 'Empty Slot',
      icon: 'Plus',
    });
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerLayout({ width, height });
    }
  };

  // Compute maximum button size that fits strictly within container without scrolling
  let buttonWidth = 80;
  let buttonHeight = 80;
  const GAP = 10;

  if (containerLayout) {
    const availableWidth = containerLayout.width - (GAP * (numCols - 1)) - 8;
    const availableHeight = containerLayout.height - (GAP * (numRows - 1)) - 8;

    const calculatedWidth = Math.floor(availableWidth / numCols);
    const calculatedHeight = Math.floor(availableHeight / numRows);

    // Keep square aspect ratio or slight rectangular fit
    const optimalSize = Math.min(calculatedWidth, calculatedHeight);
    buttonWidth = Math.max(optimalSize, 50);
    buttonHeight = Math.max(optimalSize, 50);
  }

  // Partition into rows
  const rows: DeckSlot[][] = [];
  for (let r = 0; r < numRows; r++) {
    rows.push(displaySlots.slice(r * numCols, (r + 1) * numCols));
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {rows.map((rowSlots, rowIndex) => (
        <View key={`row-${rowIndex}`} style={[styles.row, { gap: GAP }]}>
          {rowSlots.map((slot, colIndex) => {
            const isSlotActive =
              slot.type === 'workspace' &&
              slot.targetId &&
              activeWorkspaceId === slot.targetId;

            return (
              <DeckButton
                key={slot.id || `cell-${rowIndex}-${colIndex}`}
                slot={slot}
                width={buttonWidth}
                height={buttonHeight}
                isActive={!!isSlotActive}
                onPress={() => onPressSlot(slot)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

interface DeckButtonProps {
  slot: DeckSlot;
  width: number;
  height: number;
  isActive: boolean;
  onPress: () => void;
}

const DeckButton: React.FC<DeckButtonProps> = ({
  slot,
  width,
  height,
  isActive,
  onPress,
}) => {
  const [pressed, setPressed] = useState(false);
  const { theme } = useTheme();
  const isEmpty = slot.type === 'empty';
  const palette = slot.accentColor ? ACCENT_PALETTE[slot.accentColor] : ACCENT_PALETTE.indigo;

  const handlePressIn = () => {
    setPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handlePressOut = () => {
    setPressed(false);
  };

  const lastPressRef = React.useRef(0);

  const handlePress = () => {
    if (isEmpty) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    const now = Date.now();
    if (now - lastPressRef.current < 800) {
      return;
    }
    lastPressRef.current = now;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    onPress();
  };

  // Determine icon & font scale based on button height
  const iconSize = height < 80 ? 18 : height < 110 ? 24 : 28;
  const fontSize = height < 80 ? 9.5 : height < 110 ? 11 : 12.5;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.buttonWrapper,
        {
          width,
          height,
          backgroundColor: isEmpty
            ? theme.deckButtonEmptyBg
            : isActive
            ? 'rgba(239, 68, 68, 0.25)'
            : theme.mode === 'white'
            ? '#ffffff'
            : palette.bg,
          borderColor: isActive
            ? '#ef4444'
            : isEmpty
            ? theme.deckButtonEmptyBorder
            : pressed
            ? palette.glow
            : palette.border,
        },
        isEmpty && styles.emptyButton,
        pressed && styles.buttonPressed,
        isActive && styles.activeGlow,
      ]}
    >
      {/* Accent Indicator Bar */}
      {!isEmpty && (
        <View
          style={[
            styles.accentBar,
            { backgroundColor: isActive ? '#ef4444' : palette.accentBar },
          ]}
        />
      )}

      {/* Icon */}
      <View
        pointerEvents="none"
        style={[
          styles.iconContainer,
          !isEmpty && {
            backgroundColor: theme.mode === 'white' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
            borderColor: theme.mode === 'white' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)',
          },
        ]}
      >
        {renderDeckIcon(
          slot.icon || (isEmpty ? 'Plus' : 'Zap'),
          iconSize,
          isEmpty
            ? theme.textSecondary
            : isActive
            ? '#ef4444'
            : theme.mode === 'white'
            ? '#09090b'
            : palette.text
        )}
      </View>

      {/* Label */}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.label,
          {
            color: isEmpty
              ? theme.textSecondary
              : theme.mode === 'white'
              ? '#18181b'
              : '#fafafa',
            fontSize,
          },
        ]}
      >
        {slot.label || (isEmpty ? 'Empty' : 'Button')}
      </Text>

      {/* Category Badge */}
      {!isEmpty && height >= 75 && (
        <Text
          style={[
            styles.badge,
            {
              color: theme.mode === 'white' ? '#52525b' : palette.text,
              backgroundColor: theme.badgeBg,
            },
          ]}
        >
          {slot.type === 'workspace' ? 'WORKFLOW' : 'ACTION'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  buttonWrapper: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  emptyButton: {
    borderStyle: 'dashed',
  },
  buttonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  activeGlow: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 2.5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  badge: {
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
