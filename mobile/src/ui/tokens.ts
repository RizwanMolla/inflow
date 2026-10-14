import type { TextStyle } from 'react-native';

/**
 * Design tokens shared with the desktop app (src/index.css). Keep the two in sync
 * so the phone and the PC read as one product.
 */
export const colors = {
  canvas: '#0c0c0e',
  surface: '#141416',
  raised: '#19191c',
  field: '#202024',
  hover: '#26262b',
  line: 'rgba(255, 255, 255, 0.07)',
  lineStrong: 'rgba(255, 255, 255, 0.13)',

  ink: '#f4f4f5',
  ink2: '#b0b0b9',
  ink3: '#8a8a94',

  brand: '#ef4444',
  brandPressed: '#dc2626',
  brandInk: '#fca5a5',

  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
} as const;

/** Geist families loaded in App.tsx. Use the family for weight; don't combine with fontWeight. */
export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  mono: 'GeistMono_500Medium',
} as const;

export const type = {
  micro: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  ui: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  sm: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  base: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  title: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.66,
    textTransform: 'uppercase',
    color: colors.ink3,
  },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export const radius = {
  sm: 7,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

// --- Color helpers (React Native has no color-mix) ---

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `#rrggbb` at the given opacity. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Linear mix of two hex colors; `amount` is the share of `b`. */
export function mix(a: string, b: string, amount: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const out = ca.map((v, i) => Math.round(v + (cb[i] - v) * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
