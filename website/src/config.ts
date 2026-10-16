export const REPO_URL = 'https://github.com/RizwanMolla/inflow';
export const RELEASES_URL = `${REPO_URL}/releases/latest`;

/**
 * Download targets. They open the latest GitHub release page for now.
 * Once the files are attached to a release, point them straight at the asset so the
 * button downloads immediately, e.g.
 *   `${REPO_URL}/releases/latest/download/InFlow_2.0.0_x64-setup.exe`
 * (the filename must match the uploaded asset exactly).
 */
export const DOWNLOADS = {
  windows: {
    url: RELEASES_URL,
    label: 'Download for Windows',
    meta: 'Windows 10 & 11 · 64-bit installer',
  },
  android: {
    url: RELEASES_URL,
    label: 'Download for Android',
    meta: 'Android 8.0+ · APK',
  },
} as const;

export const VERSION = '2.0.0';
