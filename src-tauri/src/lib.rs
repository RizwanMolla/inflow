#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod server;

use local_ip_address::local_ip;

#[tauri::command]
fn get_server_connection_info() -> Result<serde_json::Value, String> {
    let local_ipv4 = match local_ip() {
        Ok(ip) => ip.to_string(),
        Err(_) => "127.0.0.1".to_string(),
    };

    Ok(serde_json::json!({
        "ip": local_ipv4,
        "port": 8080,
        "mdnsService": "_inflow._tcp.local."
    }))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![get_server_connection_info])
        .setup(|app| {
            let handle = app.handle().clone();
            server::start_server(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running InFlow application");
}
