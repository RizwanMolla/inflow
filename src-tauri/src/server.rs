use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::{Method, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use futures_util::{SinkExt, StreamExt};
use local_ip_address::local_ip;
use mdns_sd::{ServiceDaemon, ServiceInfo};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::sync::broadcast;
use tower_http::cors::CorsLayer;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct LaunchPayload {
    pub workspace_id: String,
    #[serde(default)]
    pub action_id: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ServerStatusResponse {
    pub ip: String,
    pub port: u16,
    pub connected_clients: usize,
    pub active_workspace_id: Option<String>,
    pub server_version: String,
}

#[derive(Clone)]
pub struct AppState {
    pub app_handle: AppHandle,
    pub active_workspace_id: Arc<Mutex<Option<String>>>,
    pub deck_config: Arc<Mutex<serde_json::Value>>,
    pub tx: broadcast::Sender<String>,
    pub client_count: Arc<Mutex<usize>>,
    pub local_ip: String,
    pub port: u16,
}

pub fn start_server(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let port: u16 = 8080;
        let local_ipv4 = match local_ip() {
            Ok(ip) => ip.to_string(),
            Err(e) => {
                eprintln!("[InFlow Server] Warning: Could not detect local IPv4 ({:?}), defaulting to 127.0.0.1", e);
                "127.0.0.1".to_string()
            }
        };

        println!("[InFlow Server] Local IPv4 detected: {}", local_ipv4);

        // Start mDNS Service Advertisement in background
        start_mdns_advertiser(&local_ipv4, port);

        let (tx, _rx) = broadcast::channel::<String>(100);

        let state = AppState {
            app_handle: app_handle.clone(),
            active_workspace_id: Arc::new(Mutex::new(None)),
            deck_config: Arc::new(Mutex::new(serde_json::Value::Null)),
            tx: tx.clone(),
            client_count: Arc::new(Mutex::new(0)),
            local_ip: local_ipv4.clone(),
            port,
        };

        // Permissive CORS for local mobile apps and dev simulators
        let cors = CorsLayer::new()
            .allow_origin(tower_http::cors::Any)
            .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::AUTHORIZATION,
                axum::http::header::ACCEPT,
            ]);

        let app = Router::new()
            .route("/api/launch", post(launch_handler))
            .route("/api/status", get(status_handler))
            .route("/api/deck", get(get_deck_handler).post(update_deck_handler))
            .route("/ws", get(ws_handler))
            .layer(cors)
            .with_state(state.clone());

        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        println!("[InFlow Server] Binding dual HTTP/WS server on http://0.0.0.0:{}", port);

        match tokio::net::TcpListener::bind(addr).await {
            Ok(listener) => {
                if let Err(e) = axum::serve(listener, app.into_make_service()).await {
                    eprintln!("[InFlow Server] Server error: {:?}", e);
                }
            }
            Err(e) => {
                eprintln!("[InFlow Server] Failed to bind port {}: {:?}", port, e);
            }
        }
    });
}

fn start_mdns_advertiser(local_ip_str: &str, port: u16) {
    let local_ip_str = local_ip_str.to_string();
    std::thread::spawn(move || {
        match ServiceDaemon::new() {
            Ok(mdns) => {
                let service_type = "_inflow._tcp.local.";
                let instance_name = "inflow-desktop";
                let host_name = "inflow-host.local.";
                let mut properties = HashMap::new();
                properties.insert("version".to_string(), "1.0.0".to_string());
                properties.insert("protocol".to_string(), "http-ws".to_string());
                properties.insert("ip".to_string(), local_ip_str.clone());
                properties.insert("port".to_string(), port.to_string());

                match ServiceInfo::new(
                    service_type,
                    instance_name,
                    host_name,
                    &local_ip_str,
                    port,
                    properties,
                ) {
                    Ok(service_info) => {
                        if let Err(err) = mdns.register(service_info) {
                            eprintln!("[InFlow mDNS] Failed to register service: {:?}", err);
                        } else {
                            println!("[InFlow mDNS] Advertising service _inflow._tcp on port {} ({})", port, local_ip_str);
                        }
                    }
                    Err(err) => {
                        eprintln!("[InFlow mDNS] Failed to create ServiceInfo: {:?}", err);
                    }
                }
            }
            Err(err) => {
                eprintln!("[InFlow mDNS] Failed to initialize mDNS daemon: {:?}", err);
            }
        }
    });
}

// REST Handlers
async fn launch_handler(
    State(state): State<AppState>,
    Json(payload): Json<LaunchPayload>,
) -> impl IntoResponse {
    if payload.workspace_id.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "error": "workspace_id cannot be empty"
            })),
        );
    }

    println!("[InFlow Server] Received remote launch trigger for: {}", payload.workspace_id);

    // Update active workspace state
    {
        let mut active = state.active_workspace_id.lock().unwrap();
        *active = Some(payload.workspace_id.clone());
    }

    // Broadcast active workspace update over WebSocket to all mobile clients
    let ws_msg = serde_json::json!({
        "type": "ACTIVE_WORKSPACE_CHANGE",
        "payload": {
            "activeWorkspaceId": payload.workspace_id.clone(),
            "actionId": payload.action_id.clone()
        }
    });
    let _ = state.tx.send(ws_msg.to_string());

    // Emit Tauri event to React Desktop UI to trigger LauncherService execution
    let emit_res = state.app_handle.emit(
        "remote-launch-trigger",
        serde_json::json!({
            "workspaceId": payload.workspace_id,
            "actionId": payload.action_id
        }),
    );

    if let Err(e) = emit_res {
        eprintln!("[InFlow Server] Failed to emit Tauri event: {:?}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "error": format!("Failed to dispatch to desktop launcher: {:?}", e)
            })),
        );
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "workspace_id": payload.workspace_id,
            "message": "Launch sequence initiated on desktop"
        })),
    )
}

async fn status_handler(State(state): State<AppState>) -> impl IntoResponse {
    let clients = *state.client_count.lock().unwrap();
    let active_ws = state.active_workspace_id.lock().unwrap().clone();

    let response = ServerStatusResponse {
        ip: state.local_ip.clone(),
        port: state.port,
        connected_clients: clients,
        active_workspace_id: active_ws,
        server_version: "1.0.0".to_string(),
    };

    (StatusCode::OK, Json(response))
}

async fn get_deck_handler(State(state): State<AppState>) -> impl IntoResponse {
    let deck = state.deck_config.lock().unwrap().clone();
    (StatusCode::OK, Json(deck))
}

async fn update_deck_handler(
    State(state): State<AppState>,
    Json(deck_json): Json<serde_json::Value>,
) -> impl IntoResponse {
    {
        let mut deck = state.deck_config.lock().unwrap();
        *deck = deck_json.clone();
    }

    // Broadcast updated deck to all connected mobile clients
    let ws_msg = serde_json::json!({
        "type": "DECK_CONFIG_UPDATE",
        "payload": deck_json
    });
    let _ = state.tx.send(ws_msg.to_string());

    (StatusCode::OK, Json(serde_json::json!({ "success": true })))
}

// WebSocket Handler
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    // Increment client counter
    {
        let mut count = state.client_count.lock().unwrap();
        *count += 1;
        println!("[InFlow WS] Client connected. Total active clients: {}", *count);
    }

    // Send initial handshake with current state and deck config
    let initial_deck = state.deck_config.lock().unwrap().clone();
    let active_ws = state.active_workspace_id.lock().unwrap().clone();
    let init_msg = serde_json::json!({
        "type": "CLIENT_CONNECTED",
        "payload": {
            "serverVersion": "1.0.0",
            "activeWorkspaceId": active_ws,
            "deckConfig": initial_deck
        }
    });

    if let Ok(init_txt) = serde_json::to_string(&init_msg) {
        let _ = sender.send(Message::Text(init_txt.into())).await;
    }

    let state_clone = state.clone();

    // Task for sending broadcasts to this WebSocket client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Task for receiving messages from this WebSocket client
    let state_for_recv = state.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                    if let Some(msg_type) = parsed.get("type").and_then(|t| t.as_str()) {
                        match msg_type {
                            "TRIGGER_LAUNCH" => {
                                if let Some(payload) = parsed.get("payload") {
                                    if let Some(ws_id) = payload.get("workspaceId").and_then(|s| s.as_str()) {
                                        let action_id = payload.get("actionId").and_then(|s| s.as_str()).map(|s| s.to_string());
                                        
                                        // Update active state
                                        {
                                            let mut active = state_for_recv.active_workspace_id.lock().unwrap();
                                            *active = Some(ws_id.to_string());
                                        }

                                        // Emit event to React desktop UI
                                        let _ = state_for_recv.app_handle.emit(
                                            "remote-launch-trigger",
                                            serde_json::json!({
                                                "workspaceId": ws_id,
                                                "actionId": action_id
                                            }),
                                        );

                                        // Broadcast active state change
                                        let broadcast_active = serde_json::json!({
                                            "type": "ACTIVE_WORKSPACE_CHANGE",
                                            "payload": {
                                                "activeWorkspaceId": ws_id,
                                                "actionId": action_id
                                            }
                                        });
                                        let _ = state_for_recv.tx.send(broadcast_active.to_string());
                                    }
                                }
                            }
                            "PING" => {
                                let pong = serde_json::json!({ "type": "PONG", "payload": { "time": chrono_timestamp() } });
                                let _ = state_for_recv.tx.send(pong.to_string());
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }

    // Decrement client counter on disconnect
    {
        let mut count = state_clone.client_count.lock().unwrap();
        if *count > 0 {
            *count -= 1;
        }
        println!("[InFlow WS] Client disconnected. Active clients: {}", *count);
    }
}

fn chrono_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
