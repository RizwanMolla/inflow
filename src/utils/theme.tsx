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
    label: 'Indigo',
    gradient: 'from-[#16181D] via-[#16181D] to-transparent',
    border: 'hover:border-indigo-500/40',
    bgGlow: 'bg-indigo-500/10 text-indigo-300',
    button: 'bg-[#EDEDED] hover:bg-white text-black font-medium shadow-sm',
    badge: 'bg-white/[0.06] text-white/80 border-white/10',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    gradient: 'from-[#16181D] via-[#16181D] to-transparent',
    border: 'hover:border-emerald-500/40',
    bgGlow: 'bg-emerald-500/10 text-emerald-300',
    button: 'bg-[#EDEDED] hover:bg-white text-black font-medium shadow-sm',
    badge: 'bg-white/[0.06] text-white/80 border-white/10',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    gradient: 'from-[#16181D] via-[#16181D] to-transparent',
    border: 'hover:border-cyan-500/40',
    bgGlow: 'bg-cyan-500/10 text-cyan-300',
    button: 'bg-[#EDEDED] hover:bg-white text-black font-medium shadow-sm',
    badge: 'bg-white/[0.06] text-white/80 border-white/10',
  },
  {
    id: 'violet',
    label: 'Violet',
    gradient: 'from-[#16181D] via-[#16181D] to-transparent',
    border: 'hover:border-violet-500/40',
    bgGlow: 'bg-violet-500/10 text-violet-300',
    button: 'bg-[#EDEDED] hover:bg-white text-black font-medium shadow-sm',
    badge: 'bg-white/[0.06] text-white/80 border-white/10',
  },
  {
    id: 'amber',
    label: 'Amber',
    gradient: 'from-[#16181D] via-[#16181D] to-transparent',
    border: 'hover:border-amber-500/40',
    bgGlow: 'bg-amber-500/10 text-amber-300',
    button: 'bg-[#EDEDED] hover:bg-white text-black font-medium shadow-sm',
    badge: 'bg-white/[0.06] text-white/80 border-white/10',
  },
  {
    id: 'rose',
    label: 'Rose',
    gradient: 'from-[#16181D] via-[#16181D] to-transparent',
    border: 'hover:border-rose-500/40',
    bgGlow: 'bg-rose-500/10 text-rose-300',
    button: 'bg-[#EDEDED] hover:bg-white text-black font-medium shadow-sm',
    badge: 'bg-white/[0.06] text-white/80 border-white/10',
  },
  {
    id: 'blue',
    label: 'Azure',
    gradient: 'from-[#16181D] via-[#16181D] to-transparent',
    border: 'hover:border-blue-500/40',
    bgGlow: 'bg-blue-500/10 text-blue-300',
    button: 'bg-[#EDEDED] hover:bg-white text-black font-medium shadow-sm',
    badge: 'bg-white/[0.06] text-white/80 border-white/10',
  },
];

export function getAccentConfig(color?: AccentColor) {
  return ACCENT_COLORS.find((c) => c.id === color) || ACCENT_COLORS[0];
}

export function renderWorkspaceIcon(iconName: string, className = 'w-4 h-4') {
  const IconComponent = AVAILABLE_ICONS[iconName];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  return <span className={className} style={{ fontSize: '1rem', lineHeight: 1 }}>{iconName}</span>;
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
        colorClass: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
        placeholder: 'https://leetcode.com or https://github.com',
      };
    case 'folder':
      return {
        label: 'Folder Path',
        icon: Folder,
        colorClass: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
        placeholder: 'D:\\Projects\\DSA or C:\\Users\\Name\\Documents',
      };
    case 'file':
      return {
        label: 'File Path',
        icon: FileText,
        colorClass: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
        placeholder: 'D:\\Docs\\Resume.pdf or C:\\Notes\\todo.md',
      };
    case 'app':
      return {
        label: 'App / Command',
        icon: Terminal,
        colorClass: 'text-purple-300 bg-purple-400/10 border-purple-400/20',
        placeholder: 'code or C:\\Program Files\\Notion\\Notion.exe',
      };
  }
}