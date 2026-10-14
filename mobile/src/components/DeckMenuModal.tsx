import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, ChevronRight, LogOut, SlidersHorizontal, Settings2 } from 'lucide-react-native';
import { useTheme, THEMES, type DeckThemeMode } from '../utils/themeContext';
import { AppText, Segmented, Sheet, StatusPill } from '../ui/primitives';
import { colors, fonts, withAlpha } from '../ui/tokens';
import { HAPTIC_OPTIONS, Haptics, useHapticLevel } from '../services/haptics';

interface DeckMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onCloseDeck: () => void;
  isConnected: boolean;
}

export const DeckMenuModal: React.FC<DeckMenuModalProps> = ({
  visible,
  onClose,
  onOpenSettings,
  onCloseDeck,
  isConnected,
}) => {
  const { themeMode, setThemeMode } = useTheme();
  const [hapticLevel, setHapticLevel] = useHapticLevel();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Deck options"
      icon={SlidersHorizontal}
      accessory={<StatusPill tone={isConnected ? 'live' : 'offline'} label={isConnected ? 'Live' : 'Offline'} />}
      maxWidth={460}
    >
      <View style={styles.section}>
        <AppText variant="eyebrow">Deck theme</AppText>
        <View style={styles.themeRow}>
          {(Object.keys(THEMES) as DeckThemeMode[]).map((mode) => {
            const t = THEMES[mode];
            const selected = themeMode === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${t.label} theme`}
                onPress={() => {
                  if (selected) return;
                  setThemeMode(mode);
                  Haptics.tick();
                }}
                style={({ pressed }) => [
                  styles.themeCard,
                  {
                    backgroundColor: t.canvas,
                    borderColor: selected ? colors.brand : t.isLight ? 'rgba(0,0,0,0.12)' : colors.lineStrong,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                {/* Two tiny keys preview the theme's key face */}
                <View style={styles.swatchRow}>
                  {['#818cf8', '#fbbf24'].map((accent) => (
                    <View
                      key={accent}
                      style={[
                        styles.swatchKey,
                        { backgroundColor: t.keyTop, borderColor: withAlpha(accent, t.isLight ? 0.45 : 0.4) },
                      ]}
                    >
                      <View style={[styles.swatchGlyph, { backgroundColor: accent }]} />
                    </View>
                  ))}
                </View>
                <AppText style={[styles.themeLabel, { color: t.ink }]}>{t.label}</AppText>
                {selected && (
                  <View style={styles.checkBadge}>
                    <Check size={10} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="eyebrow">Haptic feedback</AppText>
        <Segmented value={hapticLevel} options={HAPTIC_OPTIONS} onChange={setHapticLevel} />
      </View>

      <View style={styles.actions}>
        <MenuRow
          icon={Settings2}
          title="Connection & settings"
          subtitle="PC address, pairing code, keep-awake"
          onPress={() => {
            onClose();
            onOpenSettings();
          }}
        />
        <View style={styles.rowDivider} />
        <MenuRow
          icon={LogOut}
          title="Exit deck"
          subtitle="Back to the companion home screen"
          danger
          onPress={() => {
            onClose();
            onCloseDeck();
          }}
        />
      </View>
    </Sheet>
  );
};

const MenuRow: React.FC<{
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress: () => void;
}> = ({ icon: Icon, title, subtitle, danger, onPress }) => (
  <Pressable
    accessibilityRole="button"
    onPressIn={() => Haptics.tick()}
    onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }]}
  >
    <View
      style={[
        styles.rowIcon,
        { backgroundColor: danger ? withAlpha(colors.brand, 0.12) : 'rgba(255,255,255,0.05)' },
      ]}
    >
      <Icon size={16} color={danger ? colors.brandInk : colors.ink2} />
    </View>
    <View style={styles.rowText}>
      <AppText variant="sm" color={danger ? colors.brandInk : colors.ink}>
        {title}
      </AppText>
      <AppText variant="micro" color={colors.ink3}>
        {subtitle}
      </AppText>
    </View>
    {!danger && <ChevronRight size={16} color={colors.ink3} />}
  </Pressable>
);

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    height: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 5,
  },
  swatchKey: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchGlyph: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  themeLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.line,
  },
});
