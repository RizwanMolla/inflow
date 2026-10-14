import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../ui/tokens';

/** Stored ids are kept from v1 so saved preferences survive the redesign. */
export type DeckThemeMode = 'black' | 'gray' | 'white';

export interface ThemeColors {
  mode: DeckThemeMode;
  label: string;
  isLight: boolean;
  canvas: string;
  surface: string;
  raised: string;
  line: string;
  lineStrong: string;
  ink: string;
  ink2: string;
  ink3: string;
  /** Key face gradient, top to bottom. */
  keyTop: string;
  keyBottom: string;
  keyEmptyBg: string;
  keyEmptyBorder: string;
  /** Hardware frame around the key grid. */
  frameTop: string;
  frameBottom: string;
}

export const THEMES: Record<DeckThemeMode, ThemeColors> = {
  // Identical to the desktop app.
  black: {
    mode: 'black',
    label: 'Studio',
    isLight: false,
    canvas: colors.canvas,
    surface: colors.surface,
    raised: colors.raised,
    line: colors.line,
    lineStrong: colors.lineStrong,
    ink: colors.ink,
    ink2: colors.ink2,
    ink3: colors.ink3,
    keyTop: '#1f1f24',
    keyBottom: '#141417',
    keyEmptyBg: 'rgba(255, 255, 255, 0.015)',
    keyEmptyBorder: 'rgba(255, 255, 255, 0.1)',
    frameTop: '#0f0f11',
    frameBottom: '#09090a',
  },
  gray: {
    mode: 'gray',
    label: 'Graphite',
    isLight: false,
    canvas: '#18181b',
    surface: '#1f1f23',
    raised: '#26262b',
    line: 'rgba(255, 255, 255, 0.08)',
    lineStrong: 'rgba(255, 255, 255, 0.15)',
    ink: colors.ink,
    ink2: colors.ink2,
    ink3: '#9a9aa4',
    keyTop: '#2b2b31',
    keyBottom: '#1f1f24',
    keyEmptyBg: 'rgba(255, 255, 255, 0.025)',
    keyEmptyBorder: 'rgba(255, 255, 255, 0.12)',
    frameTop: '#141417',
    frameBottom: '#101012',
  },
  white: {
    mode: 'white',
    label: 'Daylight',
    isLight: true,
    canvas: '#ececef',
    surface: '#ffffff',
    raised: '#f6f6f8',
    line: 'rgba(0, 0, 0, 0.08)',
    lineStrong: 'rgba(0, 0, 0, 0.14)',
    ink: '#18181b',
    ink2: '#52525b',
    ink3: '#6b6b75',
    keyTop: '#ffffff',
    keyBottom: '#f1f1f4',
    keyEmptyBg: 'rgba(0, 0, 0, 0.02)',
    keyEmptyBorder: 'rgba(0, 0, 0, 0.12)',
    frameTop: '#dcdce1',
    frameBottom: '#d2d2d8',
  },
};

const THEME_STORAGE_KEY = 'inflow_mobile_theme_mode';

interface ThemeContextType {
  theme: ThemeColors;
  themeMode: DeckThemeMode;
  setThemeMode: (mode: DeckThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.black,
  themeMode: 'black',
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<DeckThemeMode>('black');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'black' || saved === 'gray' || saved === 'white') {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = (mode: DeckThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeMode], themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
