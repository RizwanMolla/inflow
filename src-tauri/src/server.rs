use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    http::{HeaderMap, Method, StatusCode},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use futures_util::{SinkExt, StreamExt};
use local_ip_address::local_ip;
use mdns_sd::{ServiceDaemon, ServiceInfo};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::sync::{broadcast, mpsc};
use tower_http::cors::CorsLayer;

pub const SERVER_VERSION: &str = "2.0.0";
const PREFERRED_PORT: u16 = 8080;
const PORT_ATTEMPTS: u16 = 10;
// Unambiguous alphabet (no 0/O, 1/I) so the code can be typed by hand from the pairing screen.
const TOKEN_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_LEN: usize = 8;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct LaunchPayload {
    #[serde(default)]
    pub workspace_id: Option<String>,
    #[serde(default)]
    pub action_id: Option<String>,
    #[serde(default)]
    pub slot_id: Option<String>,
    #[serde(default)]
    pub page_id: Option<String>,
}

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatus {
    pub online: bool,
    pub ip: String,
    pub port: u16,
    pub connected_clients: usize,
    pub active_workspace_id: Option<String>,
    pub server_version: String,
    pub error: Option<String>,
}

#[derive(Clone)]
pub struct AppState {
    pub app_handle: AppHandle,
    pub active_workspace_id: Arc<Mutex<Option<String>>>,
    pub deck_config: Arc<Mutex<serde_json::Value>>,
    pub tx: broadcast::Sender<String>,
    pub client_count: Arc<AtomicUsize>,
    pub local_ip: String,
    pub port: Arc<AtomicU16>,
    pub online: Arc<AtomicBool>,
    pub last_error: Arc<Mutex<Option<String>>>,
    pub token: Arc<Mutex<String>>,
    /// Bumped whenever the pairing token is regenerated; sockets opened under an
    /// older epoch close themselves so revoked phones are disconnected immediately.
    pub token_epoch: Arc<AtomicU64>,
    token_path: Option<PathBuf>,
}

impl AppState {
    pub fn new(app_handle: AppHandle, data_dir: Option<PathBuf>) -> Self {
        let local_ipv4 = match local_ip() {
            Ok(ip) => ip.to_string(),
            Err(e) => {
                eprintln!("[InFlow Server] Could not detect local IPv4 ({e:?}), using 127.0.0.1");
                "127.0.0.1".to_string()
            }
        };
        let token_path = data_dir.map(|d| d.join("pairing.json"));
        let token = token_path
            .as_ref()
            .and_then(|p| std::fs::read_to_string(p).ok())
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|v| v.get("token").and_then(|t| t.as_str()).map(str::to_string))
            .filter(|t| t.len() == TOKEN_LEN)
            .unwrap_or_else(generate_token);

        let (tx, _rx) = broadcast::channel::<String>(128);
        let state = Self {
            app_handle,
            active_workspace_id: Arc::new(Mutex::new(None)),
            deck_config: Arc::new(Mutex::new(serde_json::Value::Null)),
            tx,
            client_count: Arc::new(AtomicUsize::new(0)),
            local_ip: local_ipv4,
            port: Arc::new(AtomicU16::new(PREFERRED_PORT)),
            online: Arc::new(AtomicBool::new(false)),
            last_error: Arc::new(Mutex::new(None)),
            token: Arc::new(Mutex::new(token)),
            token_epoch: Arc::new(AtomicU64::new(0)),
            token_path,
        };
        state.persist_token();
        state
    }

    pub fn token(&self) -> String {
        self.token.lock().unwrap().clone()
    }

    fn persist_token(&self) {
        if let Some(path) = &self.token_path {
            if let Some(dir) = path.parent() {
                let _ = std::fs::create_dir_all(dir);
            }
            let body = serde_json::json!({ "token": self.token() }).to_string();
            if let Err(e) = std::fs::write(path, body) {
                eprintln!("[InFlow Server] Failed to persist pairing token: {e:?}");
            }
        }
    }

    /// Issues a new pairing token and disconnects every phone paired with the old one.
    pub fn regenerate_token(&self) -> String {
        let fresh = generate_token();
        *self.token.lock().unwrap() = fresh.clone();
        self.persist_token();
        self.token_epoch.fetch_add(1, Ordering::SeqCst);
        self.broadcast("PAIRING_REVOKED", serde_json::json!({}));
        fresh
    }

    pub fn status(&self) -> ServerStatus {
        ServerStatus {
            online: self.online.load(Ordering::SeqCst),
            ip: self.local_ip.clone(),
            port: self.port.load(Ordering::SeqCst),
            connected_clients: self.client_count.load(Ordering::SeqCst),
            active_workspace_id: self.active_workspace_id.lock().unwrap().clone(),
            server_version: SERVER_VERSION.to_string(),
            error: self.last_error.lock().unwrap().clone(),
        }
    }

    pub fn emit_status(&self) {
        let _ = self.app_handle.emit("server-status", self.status());
    }

    pub fn broadcast(&self, kind: &str, payload: serde_json::Value) {
        let msg = serde_json::json!({ "type": kind, "payload": payload });
        let _ = self.tx.send(msg.to_string());
    }

    pub fn set_deck_config(&self, deck: serde_json::Value) {
        *self.deck_config.lock().unwrap() = deck.clone();
        self.broadcast("DECK_CONFIG_UPDATE", deck);
    }

    /// Forwards a key press from a phone to the desktop UI, which owns the
    /// workspace data and performs the actual launch.
    fn dispatch_trigger(&self, payload: &LaunchPayload, source: &str) -> Result<(), String> {
        let has_target = payload.workspace_id.as_deref().is_some_and(|s| !s.is_empty())
            || payload.slot_id.as_deref().is_some_and(|s| !s.is_empty());
        if !has_target {
            return Err("workspace_id or slot_id is required".into());
        }

        self.app_handle
            .emit(
                "remote-launch-trigger",
                serde_json::json!({
                    "workspaceId": payload.workspace_id,
                    "actionId": payload.action_id,
                    "slotId": payload.slot_id,
                    "pageId": payload.page_id,
                    "source": source,
                }),
            )
            .map_err(|e| format!("Failed to dispatch to desktop launcher: {e:?}"))
    }
}

fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    (0..TOKEN_LEN)
        .map(|_| TOKEN_ALPHABET[rng.gen_range(0..TOKEN_ALPHABET.len())] as char)
        .collect()
}

/// Accepts "ABCD-EFGH", "abcd efgh" etc. so manually typed codes still match.
fn normalize_token(raw: &str) -> String {
    raw.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

fn token_matches(expected: &str, provided: &str) -> bool {
    let provided = normalize_token(provided);
    let (a, b) = (expected.as_bytes(), provided.as_bytes());
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

fn is_authorized(state: &AppState, headers: &HeaderMap, query: &HashMap<String, String>) -> bool {
    let from_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));
    let provided = from_header.or_else(|| query.get("token").map(String::as_str));
    provided.is_some_and(|p| token_matches(&state.token(), p))
}

fn unauthorized() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(serde_json::json!({
            "success": false,
            "error": "Pairing required. Scan the QR code shown in InFlow on your PC."
        })),
    )
        .into_response()
}

pub fn start_server(state: AppState) {
    tauri::async_runtime::spawn(async move {
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
            .route("/api/deck", get(get_deck_handler))
            .route("/ws", get(ws_handler))
            .layer(cors)
            .with_state(state.clone());

        // Fall back to the next free port if 8080 is taken; the QR code carries the real port.
        let mut listener = None;
        let mut last_bind_error = None;
        for port in PREFERRED_PORT..PREFERRED_PORT + PORT_ATTEMPTS {
            match tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).await {
                Ok(l) => {
                    state.port.store(port, Ordering::SeqCst);
                    listener = Some(l);
                    break;
                }
                Err(e) => last_bind_error = Some(format!("Port {port}: {e}")),
            }
        }

        let Some(listener) = listener else {
            let msg = format!(
                "Could not bind ports {}-{} ({})",
                PREFERRED_PORT,
                PREFERRED_PORT + PORT_ATTEMPTS - 1,
                last_bind_error.unwrap_or_default()
            );
            eprintln!("[InFlow Server] {msg}");
            *state.last_error.lock().unwrap() = Some(msg);
            state.emit_status();
            return;
        };

        let port = state.port.load(Ordering::SeqCst);
        println!("[InFlow Server] Listening on http://0.0.0.0:{port} ({})", state.local_ip);
        start_mdns_advertiser(&state.local_ip, port);
        state.online.store(true, Ordering::SeqCst);
        state.emit_status();

        if let Err(e) = axum::serve(listener, app.into_make_service()).await {
            eprintln!("[InFlow Server] Server error: {e:?}");
            state.online.store(false, Ordering::SeqCst);
            *state.last_error.lock().unwrap() = Some(e.to_string());
            state.emit_status();
        }
    });
}

fn start_mdns_advertiser(local_ip_str: &str, port: u16) {
    let local_ip_str = local_ip_str.to_string();
    std::thread::spawn(move || match ServiceDaemon::new() {
        Ok(mdns) => {
            let mut properties = HashMap::new();
            properties.insert("version".to_string(), SERVER_VERSION.to_string());
            properties.insert("protocol".to_string(), "http-ws".to_string());
            properties.insert("auth".to_string(), "token".to_string());

            match ServiceInfo::new(
                "_inflow._tcp.local.",
                "inflow-desktop",
                "inflow-host.local.",
                &local_ip_str,
                port,
                properties,
            ) {
                Ok(info) => match mdns.register(info) {
                    Ok(_) => println!("[InFlow mDNS] Advertising _inflow._tcp on {local_ip_str}:{port}"),
                    Err(err) => eprintln!("[InFlow mDNS] Failed to register service: {err:?}"),
                },
                Err(err) => eprintln!("[InFlow mDNS] Failed to create ServiceInfo: {err:?}"),
            }
        }
        Err(err) => eprintln!("[InFlow mDNS] Failed to initialize mDNS daemon: {err:?}"),
    });
}

// --- REST handlers ---

async fn launch_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    Json(payload): Json<LaunchPayload>,
) -> Response {
    if !is_authorized(&state, &headers, &query) {
        return unauthorized();
    }
    match state.dispatch_trigger(&payload, "phone") {
        Ok(()) => (
            StatusCode::OK,
            Json(serde_json::json!({ "success": true, "message": "Launch sequence initiated on desktop" })),
        )
            .into_response(),
        Err(error) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "success": false, "error": error })),
        )
            .into_response(),
    }
}

/// Public so phones can probe reachability; `authorized` tells them whether their token is valid.
async fn status_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let status = state.status();
    Json(serde_json::json!({
        "server_version": status.server_version,
        "connected_clients": status.connected_clients,
        "auth_required": true,
        "authorized": is_authorized(&state, &headers, &query),
    }))
    .into_response()
}

async fn get_deck_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    if !is_authorized(&state, &headers, &query) {
        return unauthorized();
    }
    let deck = state.deck_config.lock().unwrap().clone();
    (StatusCode::OK, Json(deck)).into_response()
}

// --- WebSocket ---

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    if !is_authorized(&state, &headers, &query) {
        return unauthorized();
    }
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();
    let epoch = state.token_epoch.load(Ordering::SeqCst);
    // Replies meant only for this client (e.g. PONG) bypass the broadcast channel.
    let (direct_tx, mut direct_rx) = mpsc::unbounded_channel::<String>();

    let count = state.client_count.fetch_add(1, Ordering::SeqCst) + 1;
    println!("[InFlow WS] Client connected. Active clients: {count}");
    state.emit_status();

    let init_msg = serde_json::json!({
        "type": "CLIENT_CONNECTED",
        "payload": {
            "serverVersion": SERVER_VERSION,
            "activeWorkspaceId": state.active_workspace_id.lock().unwrap().clone(),
            "deckConfig": state.deck_config.lock().unwrap().clone(),
        }
    });
    let _ = sender.send(Message::Text(init_msg.to_string().into())).await;

    let epoch_ref = state.token_epoch.clone();
    let mut send_task = tokio::spawn(async move {
        loop {
            let msg = tokio::select! {
                msg = rx.recv() => match msg {
                    Ok(m) => m,
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(_) => break,
                },
                msg = direct_rx.recv() => match msg {
                    Some(m) => m,
                    None => break,
                },
            };
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
            if epoch_ref.load(Ordering::SeqCst) != epoch {
                let _ = sender.send(Message::Close(None)).await;
                break;
            }
        }
    });

    let state_for_recv = state.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            let Message::Text(text) = msg else { continue };
            let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) else { continue };
            match parsed.get("type").and_then(|t| t.as_str()) {
                Some("TRIGGER_LAUNCH") => {
                    let p = parsed.get("payload").cloned().unwrap_or_default();
                    let field = |k: &str| p.get(k).and_then(|v| v.as_str()).map(str::to_string);
                    let payload = LaunchPayload {
                        workspace_id: field("workspaceId"),
                        action_id: field("actionId"),
                        slot_id: field("slotId"),
                        page_id: field("pageId"),
                    };
                    if let Err(e) = state_for_recv.dispatch_trigger(&payload, "phone") {
                        eprintln!("[InFlow WS] Ignored trigger: {e}");
                    }
                }
                Some("PING") => {
                    let pong = serde_json::json!({ "type": "PONG", "payload": { "time": now_millis() } });
                    let _ = direct_tx.send(pong.to_string());
                }
                _ => {}
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }

    let remaining = state
        .client_count
        .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |c| Some(c.saturating_sub(1)))
        .map(|prev| prev.saturating_sub(1))
        .unwrap_or(0);
    println!("[InFlow WS] Client disconnected. Active clients: {remaining}");
    state.emit_status();
}

fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_tokens_use_the_unambiguous_alphabet() {
        for _ in 0..50 {
            let t = generate_token();
            assert_eq!(t.len(), TOKEN_LEN);
            assert!(t.bytes().all(|b| TOKEN_ALPHABET.contains(&b)));
        }
    }

    #[test]
    fn manual_codes_are_normalized_before_matching() {
        assert!(token_matches("ABCD2345", "ABCD2345"));
        assert!(token_matches("ABCD2345", "abcd-2345"));
        assert!(token_matches("ABCD2345", " abcd 2345 "));
        assert!(!token_matches("ABCD2345", "ABCD2346"));
        assert!(!token_matches("ABCD2345", "ABCD234"));
        assert!(!token_matches("ABCD2345", ""));
    }
}
