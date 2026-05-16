mod audio;
mod sounds;
mod commands;

use commands::AppState;
use sounds::SoundsStore;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    use tauri_plugin_global_shortcut::ShortcutState;
                    if event.state() == ShortcutState::Pressed {
                        let _ = app.emit("hotkey-pressed", shortcut.to_string());
                    }
                })
                .build(),
        )
        .setup(|app| {
            let tx = audio::start_audio_thread(app.handle().clone());
            let sounds_store = SoundsStore::load();
            app.manage(AppState {
                audio_tx: Mutex::new(tx),
                sounds: Mutex::new(sounds_store),
                selected_devices: Mutex::new(vec!["Default".to_string()]),
                master_volume: Mutex::new(1.0),
                mic_passthrough: Mutex::new(None),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_audio_devices,
            commands::play_sound,
            commands::stop_sound,
            commands::stop_all_sounds,
            commands::pause_sound,
            commands::resume_sound,
            commands::get_sound_duration,
            commands::load_sounds,
            commands::save_sounds,
            commands::set_selected_devices,
            commands::set_master_volume,
            commands::check_vbcable_installed,
            commands::install_vbcable,
            commands::reboot_system,
            commands::start_mic_passthrough,
            commands::stop_mic_passthrough,
            commands::start_download,
            commands::show_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
