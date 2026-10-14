import React from 'react';
import {
  AppWindow,
  ArrowLeft,
  Bell,
  BookOpen,
  Bookmark,
  Braces,
  Brain,
  Briefcase,
  Bug,
  Calculator,
  Calendar,
  Camera,
  ChartColumn,
  CircleStop,
  Clipboard,
  Clock,
  Cloud,
  Code2,
  Coffee,
  Command,
  Compass,
  Cpu,
  Database,
  Download,
  Dumbbell,
  Eye,
  Feather,
  FileText,
  Film,
  Flame,
  Folder,
  FolderClosed,
  FolderOpen,
  Gamepad2,
  GitBranch,
  Globe,
  GraduationCap,
  Hammer,
  Headphones,
  Heart,
  Hourglass,
  House,
  Image,
  Keyboard,
  Laptop,
  LayoutGrid,
  Layers,
  Leaf,
  Library,
  Lightbulb,
  Link,
  Lock,
  Mail,
  Map,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  MonitorUp,
  Moon,
  Music,
  Newspaper,
  Notebook,
  NotebookPen,
  Package,
  Palette,
  Pause,
  PenTool,
  Phone,
  Plane,
  Play,
  Plus,
  Podcast,
  Power,
  Radio,
  Rocket,
  ScreenShare,
  Search,
  Server,
  Settings,
  Shield,
  ShoppingCart,
  SkipBack,
  SkipForward,
  Smartphone,
  Sparkles,
  Square,
  Star,
  Sun,
  Target,
  Terminal,
  Timer,
  Trophy,
  Tv,
  Type,
  Upload,
  Users,
  Video,
  Volume1,
  Volume2,
  VolumeX,
  Wand,
  Webcam,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { AccentColor, ActionType, MediaKey, WorkspaceAction } from '../types/workspace';

/**
 * Icons selectable for keys and workspaces. The phone app ships the same names
 * (mobile/src/utils/theme.tsx), so keep both lists in sync when adding icons.
 */
export const ICON_LIBRARY: Record<string, LucideIcon> = {
  Zap, Layers, Sparkles, Rocket, Flame, Star, Target, Trophy, Lightbulb, Wand,
  Code2, Terminal, Braces, GitBranch, Bug, Database, Server, Cpu, Command, Keyboard,
  Globe, Link, Search, Compass, Map, Bookmark, Cloud, Download, Upload, Package,
  Briefcase, Calendar, Clock, Timer, Hourglass, Mail, MessageSquare, Phone, Users, Bell,
  BookOpen, GraduationCap, Library, Notebook, NotebookPen, Newspaper, FileText, Clipboard, Brain, Feather,
  Folder, FolderOpen, FolderClosed, AppWindow, LayoutGrid, Monitor, MonitorUp, ScreenShare, Laptop, Smartphone,
  Play, Pause, SkipForward, SkipBack, Square, CircleStop, Volume2, Volume1, VolumeX, Music,
  Headphones, Mic, MicOff, Radio, Podcast, Video, Webcam, Camera, Film, Tv,
  Image, Palette, PenTool, Type, Gamepad2, Coffee, Dumbbell, Leaf, Heart, Plane,
  House, ShoppingCart, Calculator, ChartColumn, Wrench, Hammer, Settings, Shield, Lock, Eye,
  Power, Moon, Sun, Plus, ArrowLeft,
};

export const PICKABLE_ICONS = Object.keys(ICON_LIBRARY).filter((k) => k !== 'Plus' && k !== 'ArrowLeft');

export function isLibraryIcon(name: string | undefined): boolean {
  return !!name && name in ICON_LIBRARY;
}

export function renderWorkspaceIcon(iconName: string, className = 'w-4 h-4') {
  const IconComponent = ICON_LIBRARY[iconName];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  // Anything that isn't a library icon is treated as an emoji glyph.
  return (
    <span className={`${className} inline-flex items-center justify-center leading-none`} style={{ fontSize: '1em' }}>
      {iconName}
    </span>
  );
}

// --- Accent colors ---

export interface AccentDef {
  id: AccentColor;
  label: string;
  /** Bright tone used for icons, glows and dots. */
  hex: string;
}

export const ACCENT_COLORS: AccentDef[] = [
  { id: 'indigo', label: 'Indigo', hex: '#818cf8' },
  { id: 'blue', label: 'Azure', hex: '#60a5fa' },
  { id: 'cyan', label: 'Cyan', hex: '#22d3ee' },
  { id: 'emerald', label: 'Emerald', hex: '#34d399' },
  { id: 'amber', label: 'Amber', hex: '#fbbf24' },
  { id: 'rose', label: 'Rose', hex: '#fb7185' },
  { id: 'violet', label: 'Violet', hex: '#a78bfa' },
  { id: 'slate', label: 'Slate', hex: '#94a3b8' },
];

export function getAccent(color?: AccentColor): AccentDef {
  return ACCENT_COLORS.find((c) => c.id === color) || ACCENT_COLORS[0];
}

/** Inline style that sets the `--accent` custom property consumed by key and chip styles. */
export function accentStyle(color?: AccentColor): React.CSSProperties {
  return { '--accent': getAccent(color).hex } as React.CSSProperties;
}

// --- Action types ---

export interface ActionTypeMeta {
  label: string;
  short: string;
  icon: LucideIcon;
  hex: string;
  placeholder: string;
  hint: string;
  defaultIcon: string;
  /** Runs natively through the Rust backend (keyboard simulation or process spawn). */
  native: boolean;
}

export const ACTION_TYPE_META: Record<ActionType, ActionTypeMeta> = {
  url: {
    label: 'Open website',
    short: 'URL',
    icon: Globe,
    hex: '#38bdf8',
    placeholder: 'https://github.com/notifications',
    hint: 'Opens in your default browser.',
    defaultIcon: 'Globe',
    native: false,
  },
  app: {
    label: 'Launch app',
    short: 'App',
    icon: AppWindow,
    hex: '#a78bfa',
    placeholder: 'code   or   C:\\Program Files\\Notion\\Notion.exe',
    hint: 'A command on PATH or the full path to an executable.',
    defaultIcon: 'AppWindow',
    native: false,
  },
  folder: {
    label: 'Open folder',
    short: 'Folder',
    icon: FolderOpen,
    hex: '#fbbf24',
    placeholder: 'D:\\Projects\\my-app',
    hint: 'Opens the folder in File Explorer.',
    defaultIcon: 'FolderOpen',
    native: false,
  },
  file: {
    label: 'Open file',
    short: 'File',
    icon: FileText,
    hex: '#34d399',
    placeholder: 'D:\\Docs\\Resume.pdf',
    hint: 'Opens with the default app for its file type.',
    defaultIcon: 'FileText',
    native: false,
  },
  command: {
    label: 'Run command',
    short: 'Command',
    icon: Terminal,
    hex: '#2dd4bf',
    placeholder: 'npm run dev   or   powershell -File backup.ps1',
    hint: 'Runs in the background through cmd, without a console window.',
    defaultIcon: 'Terminal',
    native: true,
  },
  hotkey: {
    label: 'Hotkey',
    short: 'Hotkey',
    icon: Keyboard,
    hex: '#f472b6',
    placeholder: 'Ctrl+Shift+M',
    hint: 'Sent to whichever window is focused on the PC.',
    defaultIcon: 'Keyboard',
    native: true,
  },
  text: {
    label: 'Type text',
    short: 'Text',
    icon: Type,
    hex: '#818cf8',
    placeholder: 'Thanks for reaching out! I will get back to you shortly.',
    hint: 'Typed into the focused window, like a text expander.',
    defaultIcon: 'Type',
    native: true,
  },
  media: {
    label: 'Media key',
    short: 'Media',
    icon: Headphones,
    hex: '#fb923c',
    placeholder: '',
    hint: 'Controls whatever is playing, and system volume.',
    defaultIcon: 'Music',
    native: true,
  },
  delay: {
    label: 'Delay',
    short: 'Delay',
    icon: Timer,
    hex: '#a1a1aa',
    placeholder: '1000',
    hint: 'Waits before the next step. Useful when an app needs time to open.',
    defaultIcon: 'Timer',
    native: false,
  },
};

export const ACTION_TYPE_ORDER: ActionType[] = [
  'url',
  'app',
  'folder',
  'file',
  'command',
  'hotkey',
  'text',
  'media',
  'delay',
];

export function getActionTypeMeta(type: ActionType): ActionTypeMeta {
  return ACTION_TYPE_META[type] || ACTION_TYPE_META.url;
}

/** Default target when switching an action to a type whose old target makes no sense. */
export function defaultTargetFor(type: ActionType): string {
  if (type === 'media') return 'play_pause';
  if (type === 'delay') return '1000';
  return '';
}

export const MEDIA_KEYS: { id: MediaKey; label: string; icon: string }[] = [
  { id: 'play_pause', label: 'Play / Pause', icon: 'Play' },
  { id: 'next_track', label: 'Next track', icon: 'SkipForward' },
  { id: 'prev_track', label: 'Previous track', icon: 'SkipBack' },
  { id: 'stop', label: 'Stop', icon: 'Square' },
  { id: 'volume_up', label: 'Volume up', icon: 'Volume2' },
  { id: 'volume_down', label: 'Volume down', icon: 'Volume1' },
  { id: 'mute', label: 'Mute', icon: 'VolumeX' },
];

export function describeAction(action: WorkspaceAction): string {
  switch (action.type) {
    case 'media':
      return MEDIA_KEYS.find((m) => m.id === action.target)?.label || action.target;
    case 'delay':
      return `${Number(action.target) || 0} ms`;
    case 'text':
      return `“${action.target.length > 40 ? `${action.target.slice(0, 40)}…` : action.target}”`;
    default:
      return action.target;
  }
}

// --- Built-in key presets (library "Built-in" section) ---

export interface KeyPreset {
  id: string;
  group: 'Media' | 'Keyboard' | 'System' | 'Open' | 'Navigation';
  label: string;
  icon: string;
  accentColor: AccentColor;
  /** Undefined for the folder preset, which creates a nested page instead of an action. */
  action?: Omit<WorkspaceAction, 'id'>;
}

export const KEY_PRESETS: KeyPreset[] = [
  ...MEDIA_KEYS.map<KeyPreset>((m) => ({
    id: `media-${m.id}`,
    group: 'Media',
    label: m.label,
    icon: m.icon,
    accentColor: 'amber',
    action: { type: 'media', label: m.label, target: m.id },
  })),
  { id: 'hotkey', group: 'Keyboard', label: 'Hotkey', icon: 'Keyboard', accentColor: 'rose', action: { type: 'hotkey', label: 'Hotkey', target: '' } },
  { id: 'text', group: 'Keyboard', label: 'Type text', icon: 'Type', accentColor: 'indigo', action: { type: 'text', label: 'Type text', target: '' } },
  { id: 'show-desktop', group: 'System', label: 'Show desktop', icon: 'Monitor', accentColor: 'slate', action: { type: 'hotkey', label: 'Show desktop', target: 'Win+D' } },
  { id: 'screenshot', group: 'System', label: 'Screenshot', icon: 'Camera', accentColor: 'slate', action: { type: 'hotkey', label: 'Screenshot', target: 'Win+Shift+S' } },
  { id: 'task-manager', group: 'System', label: 'Task Manager', icon: 'ChartColumn', accentColor: 'slate', action: { type: 'hotkey', label: 'Task Manager', target: 'Ctrl+Shift+Escape' } },
  { id: 'lock-pc', group: 'System', label: 'Lock PC', icon: 'Lock', accentColor: 'slate', action: { type: 'command', label: 'Lock PC', target: 'rundll32.exe user32.dll,LockWorkStation' } },
  { id: 'command', group: 'System', label: 'Run command', icon: 'Terminal', accentColor: 'cyan', action: { type: 'command', label: 'Run command', target: '' } },
  { id: 'website', group: 'Open', label: 'Website', icon: 'Globe', accentColor: 'blue', action: { type: 'url', label: 'Website', target: '' } },
  { id: 'app', group: 'Open', label: 'App', icon: 'AppWindow', accentColor: 'violet', action: { type: 'app', label: 'App', target: '' } },
  { id: 'open-folder', group: 'Open', label: 'Folder path', icon: 'FolderOpen', accentColor: 'amber', action: { type: 'folder', label: 'Folder', target: '' } },
  { id: 'deck-folder', group: 'Navigation', label: 'Deck folder', icon: 'FolderClosed', accentColor: 'slate' },
];
