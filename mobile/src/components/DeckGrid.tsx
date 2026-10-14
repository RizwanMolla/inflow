import React, { useRef, useState } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import type { DeckSlot, GridDimension } from '../types/deck';
import { useTheme } from '../utils/themeContext';
import { DeckKey, type KeyResult } from '../ui/DeckKey';
import { Haptics } from '../services/haptics';
import { parseGrid } from '../utils/grid';

export type { KeyResult };

interface DeckGridProps {
  slots: DeckSlot[];
  gridDimension: GridDimension;
  activeWorkspaceId: string | null;
  onPressSlot: (slot: DeckSlot) => void;
  /** Recent run results reported by the PC, keyed by slot id. */
  results?: Record<string, KeyResult>;
  gap?: number;
  /** Non-interactive miniature (home screen preview). */
  preview?: boolean;
}

// A workspace opens a whole set of apps, so an accidental double tap is costly.
// Single actions (volume, media, hotkeys) must stay repeatable at tapping speed.
const WORKSPACE_REPEAT_GUARD_MS = 800;
const ACTION_REPEAT_GUARD_MS = 90;

export const DeckGrid: React.FC<DeckGridProps> = ({
  slots,
  gridDimension,
  activeWorkspaceId,
  onPressSlot,
  results = {},
  gap = 12,
  preview,
}) => {
  const { theme } = useTheme();
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const lastPress = useRef<Record<string, number>>({});

  const { rows, cols } = parseGrid(gridDimension);
  const total = rows * cols;
  const displaySlots: DeckSlot[] = slots.slice(0, total);
  while (displaySlots.length < total) {
    displaySlots.push({ id: `slot-filler-${displaySlots.length}`, type: 'empty', label: '', icon: 'Plus' });
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setLayout({ width, height });
  };

  // Largest square key that fits the container without scrolling.
  const keySize = layout
    ? Math.max(
        Math.floor(Math.min((layout.width - gap * (cols - 1)) / cols, (layout.height - gap * (rows - 1)) / rows)),
        40
      )
    : 0;

  const handlePress = (slot: DeckSlot) => {
    if (slot.type === 'empty') return;
    const now = Date.now();
    const guard = slot.type === 'workspace' ? WORKSPACE_REPEAT_GUARD_MS : ACTION_REPEAT_GUARD_MS;
    if (now - (lastPress.current[slot.id] ?? 0) < guard) return;
    lastPress.current[slot.id] = now;
    onPressSlot(slot);
  };

  const rowsOfSlots: DeckSlot[][] = [];
  for (let r = 0; r < rows; r++) rowsOfSlots.push(displaySlots.slice(r * cols, (r + 1) * cols));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {keySize > 0 && (
        <View style={{ gap }}>
          {rowsOfSlots.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={[styles.row, { gap }]}>
              {row.map((slot) => (
                <DeckKey
                  key={slot.id}
                  slot={slot}
                  size={keySize}
                  theme={theme}
                  disabled={preview}
                  active={slot.type === 'workspace' && !!slot.targetId && slot.targetId === activeWorkspaceId}
                  result={results[slot.id]}
                  onPressIn={() => {
                    // Feedback lands on touch-down, the moment the finger hits the key.
                    if (slot.type === 'empty') Haptics.empty();
                    else if (slot.type === 'folder' || slot.type === 'back') Haptics.navigate();
                    else Haptics.keyDown();
                  }}
                  onPressOut={() => {
                    if (slot.type !== 'empty' && slot.type !== 'folder' && slot.type !== 'back') Haptics.keyUp();
                  }}
                  onPress={() => handlePress(slot)}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
});
