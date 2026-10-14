#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod actions;
mod server;

use serde::Deserialize;
use std::sync::atomic::Ordering;
use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, Wry};

use server::{AppState, ServerStatus};

const TRAY_ID: &str = "inflow-tray";
const TRAY_LAUNCH_PREFIX: &str = "launch:";

#[tauri::command]
fn get_server_connection_info(state: State<'_, AppState>) -> serde_json::Value {
    serde_json::json!({
        "ip": state.local_ip,
        "port": state.port.load(Ordering::SeqCst),
        "mdnsService": "_inflow._tcp.local.",
        "token": state.token(),
    })
}

#[tauri::command]
fn get_server_status(state: State<'_, AppState>) -> ServerStatus {
    state.status()
}

#[tauri::command]
fn regenerate_pairing_token(state: State<'_, AppState>) -> String {
    let token = state.regenerate_token();
    state.emit_status();
    token
}

/// Replaces the deck layout served to phones and pushes it to every connected client.
#[tauri::command]
fn sync_deck_config(state: State<'_, AppState>, config: serde_json::Value) {
    state.set_deck_config(config);
}

/// Called by the desktop UI once a triggered key has finished running, so the
/// phone can flash the key green or red.
#[tauri::command]
fn report_launch_result(
    state: State<'_, AppState>,
    slot_id: Option<String>,
    workspace_id: Option<String>,
    success: bool,
    message: Option<String>,
) {
    if let Some(ws) = workspace_id.as_ref().filter(|w| !w.is_empty()) {
        *state.active_workspace_id.lock().unwrap() = Some(ws.clone());
        state.broadcast(
            "ACTIVE_WORKSPACE_CHANGE",
            serde_json::json!({ "activeWorkspaceId": ws }),
        );
    }
    state.broadcast(
        "LAUNCH_RESULT",
        serde_json::json!({
            "slotId": slot_id,
            "workspaceId": workspace_id,
            "success": success,
            "message": message,
        }),
    );
}

#[derive(Deserialize)]
struct TrayWorkspace {
    id: String,
    name: String,
}

fn build_tray_menu(app: &AppHandle, workspaces: &[TrayWorkspace]) -> tauri::Result<Menu<Wry>> {
    let open = MenuItem::with_id(app, "open", "Open InFlow", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit InFlow", true, None::<&str>)?;
    let sep_a = PredefinedMenuItem::separator(app)?;
    let sep_b = PredefinedMenuItem::separator(app)?;

    let launch_items = workspaces
        .iter()
        .take(20)
        .map(|w| {
            MenuItem::with_id(
                app,
                format!("{TRAY_LAUNCH_PREFIX}{}", w.id),
                &w.name,
                true,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<Vec<_>>>()?;
    let empty = MenuItem::with_id(app, "none", "No workspaces yet", false, None::<&str>)?;
    let launch_refs: Vec<&dyn IsMenuItem<Wry>> = if launch_items.is_empty() {
        vec![&empty]
    } else {
        launch_items.iter().map(|i| i as &dyn IsMenuItem<Wry>).collect()
    };
    let launch = Submenu::with_items(app, "Launch workspace", true, &launch_refs)?;

    Menu::with_items(app, &[&open, &sep_a, &launch, &sep_b, &quit])
}

#[tauri::command]
fn update_tray_workspaces(app: AppHandle, workspaces: Vec<TrayWorkspace>) -> Result<(), String> {
    let menu = build_tray_menu(&app, &workspaces).map_err(|e| e.to_string())?;
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_tray_menu(app, &[])?;
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("InFlow: deck server running")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main_window(app),
            "quit" => app.exit(0),
            id => {
                if let Some(ws_id) = id.strip_prefix(TRAY_LAUNCH_PREFIX) {
                    let _ = app.emit(
                        "remote-launch-trigger",
                        serde_json::json!({ "workspaceId": ws_id, "source": "tray" }),
                    );
                }
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_server_connection_info,
            get_server_status,
            regenerate_pairing_token,
            sync_deck_config,
            report_launch_result,
            update_tray_workspaces,
            actions::run_native_action,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let state = AppState::new(handle.clone(), app.path().app_data_dir().ok());
            app.manage(state.clone());
            server::start_server(state);
            setup_tray(&handle)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // The deck server must outlive the window, so closing hides to the tray instead of quitting.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running InFlow application");
}
