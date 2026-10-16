# InFlow ⚡

> **Turn your phone into a Stream Deck for your PC.**
> Design a grid of keys on the desktop, pair your phone once, and every tap runs on your PC: whole workspaces, single apps, hotkeys, typed snippets, media keys or shell commands.

Built with **Tauri v2**, **Rust (Axum, Tokio, enigo, mDNS)**, **React 19**, **TypeScript**, **Tailwind CSS v4** and **React Native (Expo)**.

---

## ✨ Highlights

| | |
|---|---|
| **Multi-action workspaces** | One key opens sites, folders, files and apps in sequence, with delays and hotkeys between steps. |
| **9 action types** | Website · App · Folder · File · Run command · Hotkey · Type text · Media key · Delay |
| **Stream Deck editing** | Drag keys to rearrange, right-click for copy/paste/duplicate/clear, keyboard shortcuts, 5 grid sizes. |
| **Folders** | Nest pages of keys behind a folder key, with an automatic Back key, exactly like a Stream Deck. |
| **Built-in actions** | Media controls, Show desktop, Screenshot, Task Manager, Lock PC, ready to drag onto a key. |
| **Live feedback** | Keys pressed on the phone flash on the desktop, the result (✓/✗) flashes back on the phone, and everything lands in the Activity log. |
| **Command bar** | `Ctrl K` to launch any workspace, run any key or jump into any folder. |
| **Secure pairing** | QR pairing with a per-PC token; devices without it get `401` on every endpoint. |
| **System tray** | Closing the window keeps the deck server running; launch workspaces straight from the tray menu. |

---

## 🏛️ Architecture

```
┌──────────────────────────────── InFlow Desktop (Tauri) ────────────────────────────────┐
│                                                                                       │
│  React UI (deck studio)                         Rust backend                          │
│  ├─ DeckCanvas / KeyInspector / Library  ◄────► ├─ actions.rs  hotkeys, text, media   │
│  ├─ LauncherService (runs workspaces)    invoke │               keys (enigo), commands│
│  └─ deckOps (pure deck editing helpers)  events ├─ server.rs   Axum HTTP + WebSocket  │
│                                                 │               token auth, mDNS      │
│                                                 └─ lib.rs      commands, system tray  │
└───────────────────────────────────────────────────────────────┬───────────────────────┘
                                                                │  Wi-Fi · port 8080
                                                                │  Bearer / ?token=
                                                                ▼
                                          ┌──────────────── InFlow Companion (Expo) ─────┐
                                          │  Landscape deck · folders · haptics          │
                                          │  QR pairing · result flashes · keep-awake    │
                                          └──────────────────────────────────────────────┘
```

**How a key press travels**

1. The phone sends `TRIGGER_LAUNCH { slotId, pageId }` over the WebSocket.
2. The Rust server checks the pairing token and emits a `remote-launch-trigger` event to the UI.
3. The UI looks the key up **in its own deck** (the phone never decides what runs), executes it, and flashes the key.
4. The UI calls `report_launch_result`; the server broadcasts `LAUNCH_RESULT` and the phone key flashes green or red.

### Server API

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/status` | public | Reachability probe; reports `authorized` for the supplied token |
| `GET /api/deck` | token | Current deck layout |
| `POST /api/launch` | token | `{ slot_id, page_id }` or legacy `{ workspace_id, action_id }` |
| `GET /ws?token=…` | token | Live sync: `CLIENT_CONNECTED`, `DECK_CONFIG_UPDATE`, `ACTIVE_WORKSPACE_CHANGE`, `LAUNCH_RESULT`, `PAIRING_REVOKED`, `PONG` |

The token is an 8-character code (unambiguous alphabet), stored in the app data folder and embedded in the pairing QR code. **Reset pairing code** in the pairing dialog disconnects every phone immediately. If port 8080 is busy, the server falls back to 8081–8089; the QR code always carries the real port.

---

## ⌨️ Desktop shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl K` | Command bar |
| `← ↑ → ↓` | Move between keys |
| `Enter` | Test-run the key / open the folder |
| `Delete` | Clear the key |
| `Ctrl C` / `Ctrl V` / `Ctrl D` | Copy, paste, duplicate |
| `Esc` | Leave the current folder |
| Double-click a page tab | Rename it |

Hotkey and Type-text keys wait 3 seconds when test-run from the desktop, so you can focus the target window first.

---

## 📱 Mobile companion (`mobile/`)

Shares the desktop's design tokens (`mobile/src/ui/tokens.ts` mirrors `src/index.css`) and Geist typography, so keys look identical on both screens.

- Renders the exact grid designed on the PC (2×3 up to 3×6) in an immersive landscape console, with the same key faces: accent glow, gradient, two-line titles.
- Folder keys open nested pages; the first key of a folder goes back.
- Green/red result ring on each key, reported back by the PC.
- **Haptics tuned per gesture** (`mobile/src/services/haptics.ts`): a single crisp click on touch-down, light ticks for navigation, a distinct pattern for failures. On Android it uses the system haptic engine (`performAndroidHapticsAsync`) instead of the buzzy vibration motor. *Off / Crisp / Strong* levels in Settings.
- Studio, Graphite and Daylight deck themes; desk-dock mode keeps the screen awake.
- QR pairing (`expo-camera`) or manual entry of address + pairing code.

---

## 🛠️ Tech stack

- **Desktop:** [Tauri v2](https://v2.tauri.app/), React 19, TypeScript, Tailwind CSS v4, Geist & Geist Mono (bundled, works offline)
- **Backend:** [Axum](https://github.com/tokio-rs/axum), [Tokio](https://tokio.rs/), [enigo](https://crates.io/crates/enigo) (input simulation), [mdns-sd](https://crates.io/crates/mdns-sd), tower-http
- **Mobile:** [Expo](https://expo.dev/) / React Native, `expo-haptics`, `expo-camera`, `expo-keep-awake`, `react-native-svg`, Geist via `@expo-google-fonts`

---

## 🚀 Running

```bash
# Desktop app (starts the deck server on your LAN)
npm install
npm run tauri dev

# Browser simulator (UI only, no server or native actions)
npm run dev

# Mobile companion
npm run mobile:start

# Mobile UI in a browser (layout preview; no camera or haptics)
npm --prefix mobile run web
```

Then click **Pair phone** in the desktop app and scan the QR code from the companion app.

### Showcase website (`website/`)

React + Vite + GSAP landing page with download links. Links live in `website/src/config.ts`; they open the latest GitHub release until you point them at the uploaded installer/APK.

```bash
cd website
npm install
npm run dev      # http://localhost:5180
npm run build    # static site in website/dist (works on GitHub Pages or any host)
```

### Checks

```bash
npm run build                      # type-check + production bundle
npm run lint                       # oxlint
cd src-tauri && cargo test         # hotkey parsing & pairing token tests
```

---

## 📄 License

MIT License.
