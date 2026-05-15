use std::sync::{mpsc, Mutex};
use tauri::State;
use uuid::Uuid;

use crate::audio::{self, AudioCmd};
use crate::sounds::{Sound, SoundsStore};

pub struct AppState {
    pub audio_tx: Mutex<mpsc::Sender<AudioCmd>>,
    pub sounds: Mutex<SoundsStore>,
    pub selected_devices: Mutex<Vec<String>>,
    pub master_volume: Mutex<f32>,
    pub mic_passthrough: Mutex<Option<audio::MicPassthroughHandle>>,
}

/// Check whether VB-Audio Virtual Cable is installed by looking for a device
/// whose name contains "CABLE" in the system's audio output devices.
#[tauri::command]
pub fn check_vbcable_installed() -> bool {
    let devices = audio::get_output_devices();
    devices.iter().any(|d| d.to_lowercase().contains("cable"))
}

/// Download VB-Audio Virtual Cable from the official server, extract it and
/// launch the installer with UAC elevation.  The installer itself is not
/// silent — Windows will show a UAC prompt and then the setup UI, just like
/// any driver installer.  Returns Ok(()) once the installer *process* has
/// been launched (not after it finishes, since we can't wait for an elevated
/// child without blocking the UI thread).
#[tauri::command]
pub fn install_vbcable() -> Result<(), String> {
    // PowerShell script: download ZIP → extract → launch installer elevated
    let script = r#"
$ErrorActionPreference = 'Stop'
$zip = Join-Path $env:TEMP 'vbcable_driver.zip'
$dir = Join-Path $env:TEMP 'vbcable_install'
$url = 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip'

Write-Host 'Downloading VB-Audio Virtual Cable...'
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

Write-Host 'Extracting...'
if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $dir

$exe = Get-ChildItem -Path $dir -Filter 'VBCABLE_Setup_x64.exe' -Recurse |
       Select-Object -First 1
if (-not $exe) {
    $exe = Get-ChildItem -Path $dir -Filter 'VBCABLE_Setup.exe' -Recurse |
           Select-Object -First 1
}
if (-not $exe) { throw 'Installer executable not found in archive.' }

Write-Host "Launching $($exe.FullName) ..."
Start-Process -FilePath $exe.FullName -Verb RunAs
"#;

    std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .spawn()
        .map_err(|e| format!("Failed to launch PowerShell: {e}"))?;

    Ok(())
}

/// Reboot the system after a short delay so the caller has time to display a
/// confirmation message in the UI.
#[tauri::command]
pub fn reboot_system() -> Result<(), String> {
    std::process::Command::new("shutdown")
        .args(["/r", "/t", "5", "/c", "SoundPad: VB-Audio driver installed – rebooting"])
        .spawn()
        .map_err(|e| format!("Failed to schedule reboot: {e}"))?;
    Ok(())
}


#[tauri::command]
pub fn get_audio_devices() -> Vec<String> {
    audio::get_output_devices()
}

#[tauri::command]
pub fn start_mic_passthrough(state: State<AppState>) -> Result<(), String> {
    let handle = audio::start_mic_passthrough()?;
    *state.mic_passthrough.lock().map_err(|e| e.to_string())? = Some(handle);
    Ok(())
}

#[tauri::command]
pub fn stop_mic_passthrough(state: State<AppState>) -> Result<(), String> {
    *state.mic_passthrough.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

#[tauri::command]
pub fn play_sound(
    state: State<AppState>,
    sound_id: String,
    path: String,
    volume: f32,
) -> Result<String, String> {
    let instance_id = Uuid::new_v4().to_string();
    let devices = state
        .selected_devices
        .lock()
        .map_err(|e| e.to_string())?
        .clone();
    let master_vol = *state.master_volume.lock().map_err(|e| e.to_string())?;
    let final_volume = (volume * master_vol).clamp(0.0, 2.0);

    state
        .audio_tx
        .lock()
        .map_err(|e| e.to_string())?
        .send(AudioCmd::Play {
            instance_id: instance_id.clone(),
            sound_id,
            path,
            volume: final_volume,
            devices,
        })
        .map_err(|e| e.to_string())?;

    Ok(instance_id)
}

#[tauri::command]
pub fn stop_sound(state: State<AppState>, instance_id: String) -> Result<(), String> {
    state
        .audio_tx
        .lock()
        .map_err(|e| e.to_string())?
        .send(AudioCmd::Stop { instance_id })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stop_all_sounds(state: State<AppState>) -> Result<(), String> {
    state
        .audio_tx
        .lock()
        .map_err(|e| e.to_string())?
        .send(AudioCmd::StopAll)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pause_sound(state: State<AppState>, instance_id: String) -> Result<(), String> {
    state
        .audio_tx
        .lock()
        .map_err(|e| e.to_string())?
        .send(AudioCmd::Pause { instance_id })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resume_sound(state: State<AppState>, instance_id: String) -> Result<(), String> {
    state
        .audio_tx
        .lock()
        .map_err(|e| e.to_string())?
        .send(AudioCmd::Resume { instance_id })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_sound_duration(path: String) -> Option<f32> {
    audio::get_sound_duration(&path)
}

#[tauri::command]
pub fn load_sounds(state: State<AppState>) -> Result<Vec<Sound>, String> {
    Ok(state
        .sounds
        .lock()
        .map_err(|e| e.to_string())?
        .sounds
        .clone())
}

#[tauri::command]
pub fn save_sounds(state: State<AppState>, sounds: Vec<Sound>) -> Result<(), String> {
    let mut store = state.sounds.lock().map_err(|e| e.to_string())?;
    store.sounds = sounds;
    store.save()
}

#[tauri::command]
pub fn set_selected_devices(state: State<AppState>, devices: Vec<String>) -> Result<(), String> {
    let mut selected = state.selected_devices.lock().map_err(|e| e.to_string())?;
    *selected = devices;
    Ok(())
}

#[tauri::command]
pub fn set_master_volume(state: State<AppState>, volume: f32) -> Result<(), String> {
    let clamped = volume.clamp(0.0, 2.0);
    *state.master_volume.lock().map_err(|e| e.to_string())? = clamped;
    state
        .audio_tx
        .lock()
        .map_err(|e| e.to_string())?
        .send(AudioCmd::SetMasterVolume { volume: clamped })
        .map_err(|e| e.to_string())
}
