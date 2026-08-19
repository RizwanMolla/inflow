import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DeckThemeMode = 'black' | 'gray' | 'white';

export interface ThemeColors {
  mode: DeckThemeMode;
  bg: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  topbarBg: string;
  deckButtonEmptyBg: string;
  deckButtonEmptyBorder: string;
  deckButtonDefaultBg: string;
  deckButtonDefaultBorder: string;
  badgeBg: string;
}

export const THEMES: Record<DeckThemeMode, ThemeColors> = {
  black: {
    mode: 'black',
    bg: '#000000',
    cardBg: '#0d0d0f',
    text: '#ffffff',
    textSecondary: '#a1a1aa',
    border: 'rgba(255, 255, 255, 0.12)',
    accent: '#ef4444',
    topbarBg: 'rgba(10, 10, 12, 0.85)',
    deckButtonEmptyBg: 'rgba(18, 18, 20, 0.6)',
    deckButtonEmptyBorder: 'rgba(255, 255, 255, 0.08)',
    deckButtonDefaultBg: '#111114',
    deckButtonDefaultBorder: 'rgba(255, 255, 255, 0.14)',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
  },
  gray: {
    mode: 'gray',
    bg: '#18181b',
    cardBg: '#27272a',
    text: '#ffffff',
    textSecondary: '#a1a1aa',
    border: 'rgba(255, 255, 255, 0.15)',
    accent: '#ef4444',
    topbarBg: 'rgba(24, 24, 27, 0.85)',
    deckButtonEmptyBg: 'rgba(39, 39, 42, 0.6)',
    deckButtonEmptyBorder: 'rgba(255, 255, 255, 0.12)',
    deckButtonDefaultBg: '#27272a',
    deckButtonDefaultBorder: 'rgba(255, 255, 255, 0.18)',
    badgeBg: 'rgba(255, 255, 255, 0.1)',
  },
  white: {
    mode: 'white',
    bg: '#f4f4f5',
    cardBg: '#ffffff',
    text: '#18181b',
    textSecondary: '#71717a',
    border: 'rgba(0, 0, 0, 0.12)',
    accent: '#ef4444',
    topbarBg: 'rgba(244, 244, 245, 0.9)',
    deckButtonEmptyBg: 'rgba(228, 228, 231, 0.6)',
    deckButtonEmptyBorder: 'rgba(0, 0, 0, 0.12)',
    deckButtonDefaultBg: '#ffffff',
    deckButtonDefaultBorder: 'rgba(0, 0, 0, 0.16)',
    badgeBg: 'rgba(0, 0, 0, 0.06)',
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
      if (saved && (saved === 'black' || saved === 'gray' || saved === 'white')) {
        setThemeModeState(saved as DeckThemeMode);
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
