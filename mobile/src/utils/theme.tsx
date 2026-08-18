import React from 'react';
import {
  Code2,
  Briefcase,
  Terminal,
  Layers,
  Sparkles,
  BookOpen,
  Cpu,
  Gamepad2,
  Globe,
  Music,
  Folder,
  FileText,
  Play,
  Compass,
  Coffee,
  Flame,
  Zap,
  Plus,
} from 'lucide-react-native';
import type { AccentColor } from '../types/deck';

export const ICONS_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Code2,
  Briefcase,
  Terminal,
  Layers,
  Sparkles,
  BookOpen,
  Cpu,
  Gamepad2,
  Globe,
  Music,
  Folder,
  FileText,
  Play,
  Compass,
  Coffee,
  Flame,
  Zap,
  Plus,
};

export const ACCENT_PALETTE: Record<
  AccentColor,
  {
    bg: string;
    border: string;
    glow: string;
    text: string;
    accentBar: string;
  }
> = {
  indigo: {
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(129, 140, 248, 0.45)',
    glow: '#818cf8',
    text: '#c7d2fe',
    accentBar: '#6366f1',
  },
  emerald: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(52, 211, 153, 0.45)',
    glow: '#34d399',
    text: '#a7f3d0',
    accentBar: '#10b981',
  },
  cyan: {
    bg: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(34, 211, 238, 0.45)',
    glow: '#22d3ee',
    text: '#a5f3fc',
    accentBar: '#06b6d4',
  },
  violet: {
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(167, 139, 250, 0.45)',
    glow: '#a78bfa',
    text: '#ddd6fe',
    accentBar: '#8b5cf6',
  },
  amber: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(251, 191, 36, 0.45)',
    glow: '#fbbf24',
    text: '#fde68a',
    accentBar: '#f59e0b',
  },
  rose: {
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(251, 113, 133, 0.45)',
    glow: '#fb7185',
    text: '#fecdd3',
    accentBar: '#f43f5e',
  },
  blue: {
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(96, 165, 250, 0.45)',
    glow: '#60a5fa',
    text: '#bfdbfe',
    accentBar: '#3b82f6',
  },
};

export function renderDeckIcon(iconName: string, size = 22, color = '#FFFFFF') {
  const IconComponent = ICONS_MAP[iconName] || ICONS_MAP.Zap || Zap;
  return <IconComponent size={size} color={color} />;
}
