import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoHaptics from 'expo-haptics';

/**
 * One place for every vibration the app makes, so each gesture has a single,
 * consistent feel.
 *
 *  off    — no haptics at all
 *  crisp  — system haptic engine (Android `performHapticFeedback`, iOS Taptic Engine).
 *           Short, precise clicks like the keyboard. Respects Android's "Touch feedback" setting.
 *  strong — heavier taps. On Android this uses the vibration motor, which works even on
 *           phones whose haptic engine is weak or has touch feedback switched off.
 */
export type HapticLevel = 'off' | 'crisp' | 'strong';

const STORAGE_KEY = 'inflow_mobile_haptics_v1';
const isAndroid = Platform.OS === 'android';
const { AndroidHaptics, ImpactFeedbackStyle, NotificationFeedbackType } = ExpoHaptics;

let level: HapticLevel = 'crisp';
const listeners = new Set<(level: HapticLevel) => void>();

/**
 * Newer Android constants (CONFIRM, REJECT, TOGGLE_ON…) only exist on API 30–34+, and the
 * native module rejects them on older phones. Fall back to one that every device supports.
 */
function android(preferred: ExpoHaptics.AndroidHaptics, fallback?: ExpoHaptics.AndroidHaptics) {
  ExpoHaptics.performAndroidHapticsAsync(preferred).catch(() => {
    if (fallback) ExpoHaptics.performAndroidHapticsAsync(fallback).catch(() => {});
  });
}

function impact(style: ExpoHaptics.ImpactFeedbackStyle) {
  ExpoHaptics.impactAsync(style).catch(() => {});
}

function notify(type: ExpoHaptics.NotificationFeedbackType) {
  ExpoHaptics.notificationAsync(type).catch(() => {});
}

const on = () => level !== 'off';
const strong = () => level === 'strong';

export const Haptics = {
  async load(): Promise<HapticLevel> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'off' || saved === 'crisp' || saved === 'strong') level = saved;
    } catch {
      // keep the default
    }
    listeners.forEach((fn) => fn(level));
    return level;
  },

  getLevel: (): HapticLevel => level,

  setLevel(next: HapticLevel) {
    level = next;
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    listeners.forEach((fn) => fn(level));
  },

  subscribe(fn: (level: HapticLevel) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Finger lands on a deck key: the one main "click" of a press. */
  keyDown() {
    if (!on()) return;
    if (isAndroid) {
      if (strong()) impact(ImpactFeedbackStyle.Heavy);
      else android(AndroidHaptics.Virtual_Key);
    } else {
      impact(strong() ? ImpactFeedbackStyle.Heavy : ImpactFeedbackStyle.Rigid);
    }
  },

  /** Finger lifts: a faint release on Android gives keys a physical, two-stage feel. */
  keyUp() {
    if (!on() || strong() || !isAndroid) return;
    android(AndroidHaptics.Virtual_Key_Release);
  },

  /** Pressed a key with nothing assigned. */
  empty() {
    if (!on()) return;
    if (isAndroid) android(AndroidHaptics.Keyboard_Tap);
    else impact(ImpactFeedbackStyle.Soft);
  },

  /** Selection changes: page switch, theme pick, segmented controls, menu buttons. */
  tick() {
    if (!on()) return;
    if (isAndroid) android(AndroidHaptics.Segment_Tick, AndroidHaptics.Clock_Tick);
    else ExpoHaptics.selectionAsync().catch(() => {});
  },

  /** Moving into or out of a folder. */
  navigate() {
    if (!on()) return;
    if (isAndroid) android(AndroidHaptics.Context_Click);
    else impact(strong() ? ImpactFeedbackStyle.Medium : ImpactFeedbackStyle.Light);
  },

  toggle(value: boolean) {
    if (!on()) return;
    if (isAndroid) android(value ? AndroidHaptics.Toggle_On : AndroidHaptics.Toggle_Off, AndroidHaptics.Clock_Tick);
    else ExpoHaptics.selectionAsync().catch(() => {});
  },

  /** The PC finished running a key. Kept silent on "crisp" so a press is one click, not two. */
  success() {
    if (!strong()) return;
    if (isAndroid) android(AndroidHaptics.Confirm, AndroidHaptics.Context_Click);
    else notify(NotificationFeedbackType.Success);
  },

  /** The PC reported a failure, or the press never reached it. Always felt unless haptics are off. */
  error() {
    if (!on()) return;
    if (isAndroid) android(AndroidHaptics.Reject, AndroidHaptics.Long_Press);
    else notify(NotificationFeedbackType.Error);
  },

  /** Bigger moments: entering the deck, a successful pairing. */
  emphasis() {
    if (!on()) return;
    if (isAndroid) android(AndroidHaptics.Confirm, AndroidHaptics.Long_Press);
    else notify(NotificationFeedbackType.Success);
  },
};

export const HAPTIC_OPTIONS: { id: HapticLevel; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'crisp', label: 'Crisp' },
  { id: 'strong', label: 'Strong' },
];

/** Keeps a component in sync with the saved haptic level. */
export function useHapticLevel(): [HapticLevel, (level: HapticLevel) => void] {
  const [current, setCurrent] = useState<HapticLevel>(Haptics.getLevel());
  useEffect(() => Haptics.subscribe(setCurrent), []);
  return [current, Haptics.setLevel];
}
