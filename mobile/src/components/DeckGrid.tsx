import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { DeckSlot, GridDimension } from '../types/deck';
import { renderDeckIcon, ACCENT_PALETTE } from '../utils/theme';

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
  const is2x3 = gridDimension === '2x3';
  const totalCount = is2x3 ? 6 : 12;
  const numColumns = is2x3 ? 3 : 4;
  const activeSlots = slots.slice(0, totalCount);

  return (
    <View style={styles.container}>
      <View style={[styles.grid, { flexWrap: 'wrap', flexDirection: 'row' }]}>
        {activeSlots.map((slot, index) => {
          const isSlotActive =
            slot.type === 'workspace' &&
            slot.targetId &&
            activeWorkspaceId === slot.targetId;

          return (
            <DeckButton
              key={slot.id || index}
              slot={slot}
              numColumns={numColumns}
              isActive={!!isSlotActive}
              onPress={() => onPressSlot(slot)}
            />
          );
        })}
      </View>
    </View>
  );
};

interface DeckButtonProps {
  slot: DeckSlot;
  numColumns: number;
  isActive: boolean;
  onPress: () => void;
}

const DeckButton: React.FC<DeckButtonProps> = ({
  slot,
  numColumns,
  isActive,
  onPress,
}) => {
  const [pressed, setPressed] = useState(false);
  const isEmpty = slot.type === 'empty';
  const palette = slot.accentColor ? ACCENT_PALETTE[slot.accentColor] : ACCENT_PALETTE.indigo;

  const handlePressIn = () => {
    setPressed(true);
    // Tactile mechanical physical feedback
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
      return; // Debounce rapid multi-touch triggers
    }
    lastPressRef.current = now;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    onPress();
  };

  const itemWidthPercent = numColumns === 3 ? '31.3%' : '23.5%';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.buttonWrapper,
        { width: itemWidthPercent as any },
        isEmpty && styles.emptyButton,
        !isEmpty && {
          backgroundColor: isActive ? 'rgba(239, 68, 68, 0.2)' : palette.bg,
          borderColor: isActive ? '#ef4444' : pressed ? palette.glow : palette.border,
        },
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
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
          },
        ]}
      >
        {renderDeckIcon(
          slot.icon || (isEmpty ? 'Plus' : 'Zap'),
          numColumns === 3 ? 24 : 18,
          isEmpty ? '#52525b' : isActive ? '#f87171' : palette.text
        )}
      </View>

      {/* Label */}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.label,
          { color: isEmpty ? '#71717a' : '#fafafa' },
          numColumns === 4 && { fontSize: 10 },
        ]}
      >
        {slot.label || (isEmpty ? 'Empty' : 'Button')}
      </Text>

      {/* Category Badge */}
      {!isEmpty && (
        <Text style={[styles.badge, { color: palette.text }]}>
          {slot.type === 'workspace' ? 'WORKFLOW' : 'ACTION'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    width: '100%',
    justifyContent: 'space-between',
    gap: 8,
  },
  buttonWrapper: {
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyButton: {
    backgroundColor: 'rgba(20, 20, 24, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    left: 14,
    right: 14,
    height: 2.5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  badge: {
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.75,
    marginTop: 2,
  },
});
