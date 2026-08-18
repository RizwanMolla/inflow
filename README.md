# InFlow ⚡

> **One-Click Multi-Target Workspace Automation Launcher & Stream-Deck Mobile Platform**  
> Built with **Tauri v2**, **Rust (Axum + Tokio + mDNS)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **React Native (Expo)**.

InFlow transforms your daily startup routines (browser tabs, local folders, documentation files, and desktop applications) into single-click triggers. With the embedded local server and mobile deck platform, your smartphone acts as a **wireless Stream Deck** to trigger full workspaces directly on your connected PC.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INFLOW TAURI DESKTOP                               │
│                                                                                 │
│  ┌─────────────────────────┐     IPC Events     ┌────────────────────────────┐  │
│  │   React Desktop UI      │ ◄────────────────► │  Rust Backend (Tauri v2)   │  │
│  │  - Mobile Deck Builder  │                    │  - Axum Server (0.0.0.0)   │  │
│  │  - QR Pairing Modal     │                    │  - mDNS Advertiser         │  │
│  │  - LauncherService      │                    │  - Store & Shell Plugins   │  │
│  └─────────────────────────┘                    └──────────────┬─────────────┘  │
└────────────────────────────────────────────────────────────────┼────────────────┘
                                                                 │
                                          Local Wi-Fi Network    │  HTTP / WS
                                          (mDNS / Port 8080)     ▼
                                                ┌─────────────────────────────────┐
                                                │          INFLOW MOBILE          │
                                                │   (Stream Deck Style Companion) │
                                                │   - Tap Button → Run on PC      │
                                                │   - Real-time Glow & Sync       │
                                                │   - Haptics & Desk-Dock Mode    │
                                                └─────────────────────────────────┘
```

---

## 🖥️ PC Desktop Features

### 1. Dual-Protocol Embedded Server & Execution Bridge (Rust)
- **Embedded Web Server (`src-tauri/src/server.rs`)**: Runs inside a background Tokio thread listening on `0.0.0.0:8080` with CORS support (`tower-http`).
- **REST Endpoints**:
  - `POST /api/launch`: Accepts `{ "workspace_id": "...", "action_id": "..." }` and dispatches execution to the desktop via Tauri IPC.
  - `GET /api/status`: Returns current host IP, port, connected client count, and active workspace state.
  - `GET / POST /api/deck`: Reads and updates the custom mobile deck configuration.
- **WebSocket Gateway (`/ws`)**: Full-duplex connection for instant button triggers and real-time state synchronization (`DECK_CONFIG_UPDATE`, `ACTIVE_WORKSPACE_CHANGE`).
- **mDNS Auto-Discovery (`mdns-sd`)**: Automatically broadcasts `_inflow._tcp` on local Wi-Fi for zero-configuration mobile pairing.

### 2. Desktop UI & Mobile Deck Configurator (React)
- **Direct-Click Workspace Cards**: Entire card operates as a direct launch button with keyboard navigation and isolated sub-action controls.
- **Mobile Deck Visual Editor**:
  - **Single Source of Truth**: All mobile buttons, icons, targets, labels, and colors are configured solely from the PC.
  - Interactive phone mockup with live visual previews.
  - Grid dimension switching: **2×3 (6 Keys)** and **3×4 (12 Keys)**.
  - Dual-Page Manager: **Workspaces Deck** and **Quick Actions Deck**.
  - Customization: Button labels, Lucide icons, and WCAG-compliant accent glow palettes.
  - Desktop Test Trigger: Test-fire workflows directly from the configurator.
- **QR Pairing Modal**: Generates dynamic QR codes (`inflow://<ip>:<port>`) for instant camera scanning and displays live connection diagnostics.
- **Persistent Storage**: Saves workflows and deck setups to `@tauri-apps/plugin-store` and `localStorage`, with full JSON import/export capability.

---

## 📱 Mobile App (Stream Deck Companion in `mobile/`)

The companion mobile app turns any smartphone into a wireless macro pad for your PC.

### 🎯 Features Implemented:
1. **Dynamic PC-Driven Touch Grid**:
   - Renders the exact button layout configured on the PC (2×3 or 3×4).
   - Tapping a button triggers the workspace launch sequence on the connected PC.
   - Dual-page navigation: **Workspaces** vs **Quick Actions**.
2. **Tactile Mechanical Haptics (`expo-haptics`)**:
   - Physical tactile click on button press.
3. **Desk-Dock Mode (`expo-keep-awake`)**:
   - Keeps screen awake when docked beside your monitor.
4. **Camera QR Pairing (`expo-camera`)**:
   - Instant pairing by scanning the QR code displayed in the desktop app.
5. **Real-time Live Sync (`WebSocket` + `REST fallback`)**:
   - Pushes live configuration changes and renders pulsing active states when a workspace is running on the PC.

---

## 🛠️ Tech Stack

- **Desktop Framework**: [Tauri v2](https://v2.tauri.app/) (Rust + React 19)
- **Backend (Rust)**: [Axum](https://github.com/tokio-rs/axum), [Tokio](https://tokio.rs/), [Tower-HTTP](https://github.com/tower-rs/tower-http), [mdns-sd](https://crates.io/crates/mdns-sd), [local-ip-address](https://crates.io/crates/local-ip-address)
- **Desktop UI**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Mobile Stack**: [Expo / React Native](https://expo.dev/), `expo-camera`, `expo-haptics`, `expo-keep-awake`, `lucide-react-native`, `react-native-svg`

---

## 🚀 Running the Apps

### 1. Run PC Desktop Application
```bash
# Web simulator mode (browser only):
npm run dev

# Native Tauri desktop mode (launches Rust server on port 8080):
npm run tauri dev
```

### 2. Run Mobile Companion App (Expo)
```bash
# In the root repository:
npm run mobile:start

# Or navigate directly into the mobile directory:
cd mobile
npm install
npm run start
```
Scan the Expo QR code with **Expo Go** (Android/iOS) to run the Stream Deck companion on your phone!

---

## 📄 License

MIT License. Built for seamless workflow automation.
