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
} from 'lucide-react';
import type { ActionType, AccentColor } from '../types/workspace';

// Available Lucide icon keys for user picker
export const AVAILABLE_ICONS: { [key: string]: React.ComponentType<{ className?: string }> } = {
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
};

export const ACCENT_COLORS: {
  id: AccentColor;
  label: string;
  gradient: string;
  border: string;
  bgGlow: string;
  button: string;
  badge: string;
}[] = [
  {
    id: 'indigo',
    label: 'Electric Indigo',
    gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
    border: 'hover:border-indigo-500/50',
    bgGlow: 'bg-indigo-500/10 text-indigo-400',
    button: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'emerald',
    label: 'Emerald Green',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    border: 'hover:border-emerald-500/50',
    bgGlow: 'bg-emerald-500/10 text-emerald-400',
    button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'cyan',
    label: 'Cyber Cyan',
    gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    border: 'hover:border-cyan-500/50',
    bgGlow: 'bg-cyan-500/10 text-cyan-400',
    button: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/25',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'violet',
    label: 'Neon Violet',
    gradient: 'from-violet-500/20 via-fuchsia-500/10 to-transparent',
    border: 'hover:border-violet-500/50',
    bgGlow: 'bg-violet-500/10 text-violet-400',
    button: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/25',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  {
    id: 'amber',
    label: 'Solar Amber',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    border: 'hover:border-amber-500/50',
    bgGlow: 'bg-amber-500/10 text-amber-400',
    button: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/25',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'rose',
    label: 'Hyper Rose',
    gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
    border: 'hover:border-rose-500/50',
    bgGlow: 'bg-rose-500/10 text-rose-400',
    button: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/25',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  {
    id: 'blue',
    label: 'Deep Azure',
    gradient: 'from-blue-500/20 via-sky-500/10 to-transparent',
    border: 'hover:border-blue-500/50',
    bgGlow: 'bg-blue-500/10 text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
];

export function getAccentConfig(color?: AccentColor) {
  return ACCENT_COLORS.find((c) => c.id === color) || ACCENT_COLORS[0];
}

export function renderWorkspaceIcon(iconName: string, className = 'w-6 h-6') {
  const IconComponent = AVAILABLE_ICONS[iconName];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  // If it's an emoji or custom text
  return <span className={className} style={{ fontSize: '1.25rem', lineHeight: 1 }}>{iconName}</span>;
}

export function getActionTypeMeta(type: ActionType): {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  placeholder: string;
} {
  switch (type) {
    case 'url':
      return {
        label: 'URL / Website',
        icon: Globe,
        colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        placeholder: 'https://leetcode.com or https://github.com',
      };
    case 'folder':
      return {
        label: 'Folder Path',
        icon: Folder,
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        placeholder: 'D:\\Projects\\DSA or C:\\Users\\Name\\Documents',
      };
    case 'file':
      return {
        label: 'File Path',
        icon: FileText,
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        placeholder: 'D:\\Docs\\Resume.pdf or C:\\Notes\\todo.md',
      };
    case 'app':
      return {
        label: 'App Executable / Command',
        icon: Terminal,
        colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        placeholder: 'code or C:\\Program Files\\Notion\\Notion.exe',
      };
  }
}
