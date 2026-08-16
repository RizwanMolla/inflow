import type { Workspace } from '../types/workspace';

export const PRESET_TEMPLATES: Workspace[] = [
  {
    id: 'template-dsa-prep',
    name: 'DSA & LeetCode Prep',
    icon: 'Code2',
    description: 'Jump straight into daily problem solving, curated sheets, and code workspace.',
    accentColor: 'indigo',
    actions: [
      {
        id: 'tpl-dsa-1',
        type: 'url',
        label: 'LeetCode Problem of the Day',
        target: 'https://leetcode.com/problemset/all/',
      },
      {
        id: 'tpl-dsa-2',
        type: 'url',
        label: 'NeetCode 150 Roadmap',
        target: 'https://neetcode.io/practice',
      },
      {
        id: 'tpl-dsa-3',
        type: 'folder',
        label: 'DSA Practice Folder',
        target: 'D:\\Career\\DSA-Practice',
      },
      {
        id: 'tpl-dsa-4',
        type: 'app',
        label: 'Visual Studio Code',
        target: 'code',
      },
    ],
  },
  {
    id: 'template-job-hunting',
    name: 'Job Hunting & Career',
    icon: 'Briefcase',
    description: 'One click to check top job boards, track applications, and open tailored resumes.',
    accentColor: 'emerald',
    actions: [
      {
        id: 'tpl-job-1',
        type: 'url',
        label: 'LinkedIn Tech Jobs',
        target: 'https://www.linkedin.com/jobs/search/?keywords=Software%20Engineer',
      },
      {
        id: 'tpl-job-2',
        type: 'url',
        label: 'Wellfound Tech Startups',
        target: 'https://wellfound.com/jobs',
      },
      {
        id: 'tpl-job-3',
        type: 'file',
        label: 'Master Resume Document',
        target: 'D:\\Career\\Resume_Master.pdf',
      },
      {
        id: 'tpl-job-4',
        type: 'url',
        label: 'Job Application Tracker',
        target: 'https://docs.google.com/spreadsheets',
      },
    ],
  },
  {
    id: 'template-fullstack-dev',
    name: 'Full-Stack Dev Mode',
    icon: 'Terminal',
    description: 'Spin up GitHub notifications, local project workspace, and docs in one click.',
    accentColor: 'cyan',
    actions: [
      {
        id: 'tpl-dev-1',
        type: 'url',
        label: 'GitHub PRs & Notifications',
        target: 'https://github.com/notifications',
      },
      {
        id: 'tpl-dev-2',
        type: 'folder',
        label: 'Projects Directory',
        target: 'D:\\CV Projects',
      },
      {
        id: 'tpl-dev-3',
        type: 'url',
        label: 'Documentation & Reference',
        target: 'https://tailwindcss.com/docs',
      },
      {
        id: 'tpl-dev-4',
        type: 'app',
        label: 'Terminal / CLI',
        target: 'wt',
      },
    ],
  },
  {
    id: 'template-deep-focus',
    name: 'Deep Focus & Study',
    icon: 'Coffee',
    description: 'Minimal distraction environment with ambient focus audio, Notion, and notes.',
    accentColor: 'violet',
    actions: [
      {
        id: 'tpl-focus-1',
        type: 'url',
        label: 'Lofi Girl / Focus Audio',
        target: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      },
      {
        id: 'tpl-focus-2',
        type: 'url',
        label: 'Notion Workspace',
        target: 'https://www.notion.so',
      },
      {
        id: 'tpl-focus-3',
        type: 'file',
        label: 'Daily Task Log',
        target: 'D:\\Notes\\daily-tasks.md',
      },
    ],
  },
  {
    id: 'template-content-creator',
    name: 'Content & Design Mode',
    icon: 'Sparkles',
    description: 'Open Figma design board, asset folders, and inspirations simultaneously.',
    accentColor: 'rose',
    actions: [
      {
        id: 'tpl-create-1',
        type: 'url',
        label: 'Figma Dashboard',
        target: 'https://www.figma.com',
      },
      {
        id: 'tpl-create-2',
        type: 'folder',
        label: 'Design Assets Folder',
        target: 'D:\\Design\\Assets',
      },
      {
        id: 'tpl-create-3',
        type: 'url',
        label: 'Dribbble / Design Inspo',
        target: 'https://dribbble.com',
      },
    ],
  },
];

export const DEFAULT_WORKSPACES: Workspace[] = [];
