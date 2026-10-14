import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Check, FolderClosed, Layers, Plus, X } from 'lucide-react-native';
import type { DeckSlot } from '../types/deck';
import { getAccentHex, renderDeckIcon } from '../utils/theme';
import type { ThemeColors } from '../utils/themeContext';
import { colors, fonts, mix, withAlpha } from './tokens';

export type KeyResult = { success: boolean; at: number };

interface DeckKeyProps {
  slot: DeckSlot;
  size: number;
  theme: ThemeColors;
  /** The workspace this key launches is the one currently running on the PC. */
  active?: boolean;
  result?: KeyResult;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onPress?: () => void;
  /** Preview keys (home screen) are not pressable. */
  disabled?: boolean;
}

const NEUTRAL = '#71717a';

/**
 * Phone version of the desktop `.deck-key`: dark gradient face, accent glow from the
 * top edge, icon at 26% of the key and a two-line title. Sizes scale with the key.
 */
export const DeckKey: React.FC<DeckKeyProps> = ({
  slot,
  size,
  theme,
  active,
  result,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
}) => {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const press = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  const isEmpty = slot.type === 'empty';
  const accent = slot.type === 'back' ? NEUTRAL : getAccentHex(slot.accentColor);
  const r = size * 0.22;

  // Ring pulse each time the PC reports a result for this key.
  const resultAt = result?.at;
  useEffect(() => {
    if (!resultAt) return;
    ring.setValue(1);
    Animated.timing(ring, {
      toValue: 0,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [resultAt, ring]);

  const animatePress = (to: number) =>
    Animated.spring(press, {
      toValue: to,
      useNativeDriver: true,
      speed: to ? 60 : 24,
      bounciness: to ? 0 : 8,
    }).start();

  const iconColor = isEmpty
    ? theme.isLight
      ? 'rgba(0,0,0,0.2)'
      : 'rgba(255,255,255,0.18)'
    : theme.isLight
    ? mix(accent, '#000000', 0.28)
    : mix(accent, '#ffffff', 0.3);
  const borderColor = isEmpty
    ? theme.keyEmptyBorder
    : active
    ? colors.brand
    : withAlpha(accent, theme.isLight ? 0.4 : 0.32);
  const titleSize = Math.min(Math.max(size * 0.095, 9), 13);
  const resultColor = result ? (result.success ? colors.success : colors.danger) : colors.success;

  return (
    <Pressable
      disabled={disabled}
      // Preview keys let touches fall through to the surrounding "open deck" area.
      style={disabled ? styles.passThrough : undefined}
      accessibilityRole="button"
      accessibilityLabel={isEmpty ? 'Empty key' : slot.label}
      onPressIn={() => {
        animatePress(1);
        onPressIn?.();
      }}
      onPressOut={() => {
        animatePress(0);
        onPressOut?.();
      }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.key,
          {
            width: size,
            height: size,
            borderRadius: r,
            borderColor,
            borderStyle: isEmpty ? 'dashed' : 'solid',
            backgroundColor: isEmpty ? theme.keyEmptyBg : theme.keyBottom,
            transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) }],
          },
          !isEmpty && styles.keyShadow,
          !isEmpty && theme.isLight && styles.keyShadowLight,
          active && { shadowColor: colors.brand, shadowOpacity: 0.7, shadowRadius: 12, elevation: 8 },
        ]}
      >
        {!isEmpty && (
          <Svg style={StyleSheet.absoluteFill} width={size} height={size} pointerEvents="none">
            <Defs>
              <LinearGradient id={`face${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.keyTop} />
                <Stop offset="1" stopColor={theme.keyBottom} />
              </LinearGradient>
              <RadialGradient id={`glow${gradientId}`} cx="50%" cy="0%" rx="120%" ry="90%" fx="50%" fy="0%">
                <Stop offset="0" stopColor={accent} stopOpacity={theme.isLight ? 0.16 : 0.24} />
                <Stop offset="0.62" stopColor={accent} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={size} height={size} rx={r} fill={`url(#face${gradientId})`} />
            <Rect width={size} height={size} rx={r} fill={`url(#glow${gradientId})`} />
          </Svg>
        )}

        {/* Top-edge highlight, like the desktop's inset shadow */}
        {!isEmpty && (
          <View
            pointerEvents="none"
            style={[
              styles.highlight,
              { left: r * 0.7, right: r * 0.7, backgroundColor: theme.isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.07)' },
            ]}
          />
        )}

        {/* Pressed: brighten the face */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: r,
              backgroundColor: theme.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
              opacity: press,
            },
          ]}
        />

        {slot.type === 'folder' && (
          <FolderClosed size={Math.max(size * 0.1, 9)} color={theme.ink3} style={[styles.badge, { top: size * 0.08, right: size * 0.08 }]} />
        )}
        {slot.type === 'workspace' && (
          <Layers size={Math.max(size * 0.1, 9)} color={theme.ink3} style={[styles.badge, { top: size * 0.08, right: size * 0.08 }]} />
        )}

        {/* Wrapped in a View so it stacks above the absolutely positioned face on web too */}
        <View pointerEvents="none">
          {isEmpty ? (
            <Plus size={size * 0.16} color={iconColor} />
          ) : (
            renderDeckIcon(slot.icon || 'Zap', Math.round(size * 0.26), iconColor)
          )}
        </View>

        {!isEmpty && !!slot.label && (
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              {
                marginTop: size * 0.07,
                fontSize: titleSize,
                lineHeight: Math.round(titleSize * 1.22),
                color: theme.ink,
              },
            ]}
          >
            {slot.label}
          </Text>
        )}

        {/* Result from the PC: ring pulse plus a small check / cross */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              borderRadius: r + 3,
              borderColor: resultColor,
              shadowColor: resultColor,
              opacity: ring,
            },
          ]}
        />
        {result && (
          <View style={[styles.resultBadge, { backgroundColor: resultColor, top: size * 0.07, left: size * 0.07 }]}>
            {result.success ? <Check size={11} color="#052e1c" strokeWidth={3} /> : <X size={11} color="#3b0a0a" strokeWidth={3} />}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  passThrough: {
    pointerEvents: 'none',
  },
  key: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'visible',
  },
  keyShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  keyShadowLight: {
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    height: 1,
  },
  badge: {
    position: 'absolute',
  },
  title: {
    maxWidth: '88%',
    textAlign: 'center',
    fontFamily: fonts.medium,
    letterSpacing: -0.05,
  },
  ring: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  resultBadge: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
