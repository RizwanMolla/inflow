//! Native key actions that the webview cannot perform on its own:
//! keyboard shortcuts, typed text snippets, media/system keys and shell commands.

use enigo::{Direction, Enigo, Key, Keyboard, Settings};

fn function_key(n: u8) -> Option<Key> {
    Some(match n {
        1 => Key::F1,
        2 => Key::F2,
        3 => Key::F3,
        4 => Key::F4,
        5 => Key::F5,
        6 => Key::F6,
        7 => Key::F7,
        8 => Key::F8,
        9 => Key::F9,
        10 => Key::F10,
        11 => Key::F11,
        12 => Key::F12,
        13 => Key::F13,
        14 => Key::F14,
        15 => Key::F15,
        16 => Key::F16,
        17 => Key::F17,
        18 => Key::F18,
        19 => Key::F19,
        20 => Key::F20,
        _ => return None,
    })
}

/// Maps a single token of a shortcut string ("Ctrl", "Shift", "K", "F5", "Space") to a key.
fn parse_key(token: &str) -> Result<Key, String> {
    let lower = token.trim().to_ascii_lowercase();
    let key = match lower.as_str() {
        "ctrl" | "control" => Key::Control,
        "shift" => Key::Shift,
        "alt" | "option" => Key::Alt,
        "win" | "windows" | "meta" | "cmd" | "super" => Key::Meta,
        "tab" => Key::Tab,
        "enter" | "return" => Key::Return,
        "space" => Key::Space,
        "esc" | "escape" => Key::Escape,
        "backspace" => Key::Backspace,
        "delete" | "del" => Key::Delete,
        "home" => Key::Home,
        "end" => Key::End,
        "pageup" | "pgup" => Key::PageUp,
        "pagedown" | "pgdn" => Key::PageDown,
        "up" | "arrowup" => Key::UpArrow,
        "down" | "arrowdown" => Key::DownArrow,
        "left" | "arrowleft" => Key::LeftArrow,
        "right" | "arrowright" => Key::RightArrow,
        "capslock" => Key::CapsLock,
        #[cfg(target_os = "windows")]
        "insert" | "ins" => Key::Insert,
        #[cfg(target_os = "windows")]
        "printscreen" | "prtsc" => Key::PrintScr,
        #[cfg(target_os = "windows")]
        "pause" => Key::Pause,
        _ => {
            if let Some(key) = lower
                .strip_prefix('f')
                .and_then(|n| n.parse::<u8>().ok())
                .and_then(function_key)
            {
                key
            } else {
                let mut chars = token.trim().chars();
                match (chars.next(), chars.next()) {
                    (Some(c), None) => Key::Unicode(c.to_ascii_lowercase()),
                    _ => return Err(format!("Unknown key \"{}\"", token.trim())),
                }
            }
        }
    };
    Ok(key)
}

fn is_modifier(key: &Key) -> bool {
    matches!(key, Key::Control | Key::Shift | Key::Alt | Key::Meta)
}

fn new_enigo() -> Result<Enigo, String> {
    Enigo::new(&Settings::default()).map_err(|e| format!("Input simulation unavailable: {e}"))
}

/// Presses a combination such as "Ctrl+Shift+M": modifiers are held, the
/// remaining keys are clicked in order, then modifiers are released in reverse.
pub fn send_hotkey(combo: &str) -> Result<(), String> {
    let keys = combo
        .split('+')
        .filter(|t| !t.trim().is_empty())
        .map(parse_key)
        .collect::<Result<Vec<_>, _>>()?;
    if keys.is_empty() {
        return Err("Shortcut is empty".into());
    }

    let (modifiers, main): (Vec<Key>, Vec<Key>) = keys.into_iter().partition(is_modifier);
    let mut enigo = new_enigo()?;

    let mut result = Ok(());
    for m in &modifiers {
        if let Err(e) = enigo.key(*m, Direction::Press) {
            result = Err(e.to_string());
            break;
        }
    }
    if result.is_ok() {
        // A shortcut made only of modifiers (e.g. "Win") is a press-and-release of those keys.
        for k in &main {
            if let Err(e) = enigo.key(*k, Direction::Click) {
                result = Err(e.to_string());
                break;
            }
        }
    }
    for m in modifiers.iter().rev() {
        let _ = enigo.key(*m, Direction::Release);
    }
    result
}

pub fn type_text(text: &str) -> Result<(), String> {
    if text.is_empty() {
        return Err("Text snippet is empty".into());
    }
    new_enigo()?.text(text).map_err(|e| e.to_string())
}

pub fn send_media_key(id: &str) -> Result<(), String> {
    let key = match id {
        "play_pause" => Key::MediaPlayPause,
        "next_track" => Key::MediaNextTrack,
        "prev_track" => Key::MediaPrevTrack,
        #[cfg(target_os = "windows")]
        "stop" => Key::MediaStop,
        "volume_up" => Key::VolumeUp,
        "volume_down" => Key::VolumeDown,
        "mute" => Key::VolumeMute,
        other => return Err(format!("Unknown media key \"{other}\"")),
    };
    new_enigo()?
        .key(key, Direction::Click)
        .map_err(|e| e.to_string())
}

/// Spawns a shell command without a console window and without waiting for it,
/// so long-running scripts never block the deck.
pub fn run_command(command: &str) -> Result<(), String> {
    let command = command.trim();
    if command.is_empty() {
        return Err("Command is empty".into());
    }

    #[cfg(target_os = "windows")]
    let mut cmd = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let mut c = std::process::Command::new("cmd");
        c.raw_arg("/C").raw_arg(command).creation_flags(CREATE_NO_WINDOW);
        c
    };
    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let mut c = std::process::Command::new("sh");
        c.arg("-c").arg(command);
        c
    };

    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to start command: {e}"))
}

#[tauri::command]
pub async fn run_native_action(kind: String, payload: String) -> Result<(), String> {
    // Input simulation is synchronous and may sleep between events; keep it off the async runtime.
    tauri::async_runtime::spawn_blocking(move || match kind.as_str() {
        "hotkey" => send_hotkey(&payload),
        "text" => type_text(&payload),
        "media" => send_media_key(&payload),
        "command" => run_command(&payload),
        other => Err(format!("Unsupported native action \"{other}\"")),
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_modifiers_and_named_keys() {
        assert!(matches!(parse_key("Ctrl"), Ok(Key::Control)));
        assert!(matches!(parse_key(" shift "), Ok(Key::Shift)));
        assert!(matches!(parse_key("Win"), Ok(Key::Meta)));
        assert!(matches!(parse_key("Escape"), Ok(Key::Escape)));
        assert!(matches!(parse_key("Up"), Ok(Key::UpArrow)));
        assert!(matches!(parse_key("F5"), Ok(Key::F5)));
        assert!(matches!(parse_key("f12"), Ok(Key::F12)));
    }

    #[test]
    fn single_characters_become_lowercase_unicode_keys() {
        assert!(matches!(parse_key("M"), Ok(Key::Unicode('m'))));
        assert!(matches!(parse_key("/"), Ok(Key::Unicode('/'))));
    }

    #[test]
    fn rejects_unknown_keys() {
        assert!(parse_key("Hyper").is_err());
        assert!(parse_key("F99").is_err());
    }

    #[test]
    fn empty_inputs_fail_before_touching_the_keyboard() {
        assert!(send_hotkey("").is_err());
        assert!(send_hotkey(" + ").is_err());
        assert!(type_text("").is_err());
        assert!(run_command("   ").is_err());
        assert!(send_media_key("rewind").is_err());
    }
}
