import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, fonts, radius, type, withAlpha } from './tokens';
import { Haptics } from '../services/haptics';

// --- Text ---

type Variant = keyof typeof type;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  weight?: keyof typeof fonts;
  align?: TextStyle['textAlign'];
}

export const AppText: React.FC<AppTextProps> = ({ variant = 'ui', color, weight, align, style, ...rest }) => (
  <Text
    style={[
      { color: colors.ink },
      type[variant],
      weight && { fontFamily: fonts[weight] },
      color !== undefined && { color },
      align && { textAlign: align },
      style,
    ]}
    {...rest}
  />
);

// --- Buttons ---

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string; fill?: string }>;
  iconFill?: boolean;
  variant?: ButtonVariant;
  size?: 'md' | 'sm' | 'lg';
  style?: StyleProp<ViewStyle>;
  /** Skip the built-in tick, e.g. when the caller plays its own haptic. */
  silent?: boolean;
}

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; bgPressed: string; border: string; text: string }> = {
  primary: { bg: colors.brand, bgPressed: colors.brandPressed, border: 'transparent', text: '#ffffff' },
  secondary: { bg: 'rgba(255,255,255,0.05)', bgPressed: 'rgba(255,255,255,0.1)', border: colors.lineStrong, text: colors.ink },
  ghost: { bg: 'transparent', bgPressed: 'rgba(255,255,255,0.07)', border: 'transparent', text: colors.ink2 },
  danger: { bg: withAlpha(colors.brand, 0.1), bgPressed: withAlpha(colors.brand, 0.2), border: withAlpha(colors.brand, 0.3), text: colors.brandInk },
};

const BUTTON_SIZES = {
  sm: { height: 32, paddingHorizontal: 12, fontSize: 12, icon: 14, radius: 8 },
  md: { height: 40, paddingHorizontal: 14, fontSize: 13, icon: 15, radius: 10 },
  lg: { height: 50, paddingHorizontal: 18, fontSize: 15, icon: 17, radius: 12 },
};

export const Button: React.FC<ButtonProps> = ({
  label,
  icon: Icon,
  iconFill,
  variant = 'secondary',
  size = 'md',
  style,
  silent,
  disabled,
  onPressIn,
  ...rest
}) => {
  const c = BUTTON_COLORS[variant];
  const s = BUTTON_SIZES[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={(e) => {
        if (!silent) Haptics.tick();
        onPressIn?.(e);
      }}
      style={({ pressed }) => [
        styles.button,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.radius,
          backgroundColor: pressed ? c.bgPressed : c.bg,
          borderColor: c.border,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'primary' && styles.primaryShadow,
        style,
      ]}
      {...rest}
    >
      {Icon && <Icon size={s.icon} color={c.text} fill={iconFill ? c.text : 'none'} />}
      <Text style={[styles.buttonLabel, { color: c.text, fontSize: s.fontSize }]}>{label}</Text>
    </Pressable>
  );
};

interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  size?: number;
  color?: string;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  size = 40,
  color = colors.ink2,
  bordered = true,
  style,
  onPressIn,
  children,
  ...rest
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={6}
    onPressIn={(e) => {
      Haptics.tick();
      onPressIn?.(e);
    }}
    style={({ pressed }) => [
      styles.iconButton,
      {
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : bordered ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderWidth: bordered ? 1 : 0,
        transform: [{ scale: pressed ? 0.95 : 1 }],
      },
      style,
    ]}
    {...rest}
  >
    <Icon size={Math.round(size * 0.4)} color={color} />
    {children}
  </Pressable>
);

// --- Segmented control ---

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  light,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  light?: boolean;
}) {
  return (
    <View style={[styles.segmented, light && styles.segmentedLight]} accessibilityRole="radiogroup">
      {options.map((opt) => {
        const selected = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              onChange(opt.id);
              // After onChange, so a haptics-level picker previews the newly chosen strength.
              Haptics.tick();
            }}
            style={[styles.segment, selected && (light ? styles.segmentSelectedLight : styles.segmentSelected)]}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: selected ? (light ? '#18181b' : colors.ink) : light ? '#52525b' : colors.ink2 },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// --- Status pill (same tones as the desktop header) ---

export type StatusTone = 'live' | 'idle' | 'offline' | 'warning';

const TONES: Record<StatusTone, { dot: string; text: string }> = {
  live: { dot: colors.success, text: '#a7f3d0' },
  idle: { dot: colors.warning, text: colors.ink2 },
  warning: { dot: colors.warning, text: '#fde68a' },
  offline: { dot: colors.brand, text: colors.brandInk },
};

export const StatusPill: React.FC<{ tone: StatusTone; label: string }> = ({ tone, label }) => (
  <View style={styles.pill}>
    <View
      style={[
        styles.pillDot,
        { backgroundColor: TONES[tone].dot },
        tone === 'live' && { shadowColor: TONES[tone].dot, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
      ]}
    />
    <Text style={[styles.pillText, { color: TONES[tone].text }]}>{label}</Text>
  </View>
);

// --- Sheet (modal panel matching the desktop .modal) ---

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  accessory?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  /** Body scrolls when content is taller than the screen (e.g. landscape). */
  scroll?: boolean;
  animation?: 'fade' | 'slide';
}

export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  title,
  icon: Icon,
  accessory,
  footer,
  children,
  maxWidth = 400,
  scroll = true,
  animation = 'fade',
}) => (
  <Modal visible={visible} transparent animationType={animation} onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { maxWidth }]}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleRow}>
            {Icon && <Icon size={16} color={colors.brandInk} />}
            <AppText variant="base">{title}</AppText>
            {accessory}
          </View>
          <IconButton icon={X} label="Close" size={34} bordered={false} onPress={onClose} />
        </View>
        {scroll ? (
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} bounces={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={styles.sheetBody}>{children}</View>
        )}
        {footer && <View style={styles.sheetFooter}>{footer}</View>}
      </View>
    </View>
  </Modal>
);

// --- Panel ---

export const Panel: React.FC<{ style?: StyleProp<ViewStyle>; children: React.ReactNode }> = ({ style, children }) => (
  <View style={[styles.panel, style]}>{children}</View>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  primaryShadow: {
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonLabel: {
    fontFamily: fonts.semibold,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.line,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    gap: 3,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentedLight: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderColor: 'rgba(0,0,0,0.08)',
  },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  segmentSelectedLight: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 28,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignSelf: 'flex-start',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxHeight: '100%',
    backgroundColor: '#18181b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 10,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sheetScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sheetBody: {
    padding: 18,
    gap: 16,
  },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
