use std::path::PathBuf;
use std::sync::{mpsc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
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
pub fn seek_sound(state: State<AppState>, instance_id: String, position_secs: f32) -> Result<(), String> {
    state
        .audio_tx
        .lock()
        .map_err(|e| e.to_string())?
        .send(AudioCmd::Seek { instance_id, position_secs })
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

// ── Audio downloader (yt-dlp) ─────────────────────────────────────────────

/// Ensure yt-dlp.exe is present in the app data dir, downloading it from
/// GitHub releases on first run. Returns the path to the binary.
fn get_or_download_ytdlp(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let ytdlp = data_dir.join("yt-dlp.exe");
    if ytdlp.exists() {
        return Ok(ytdlp);
    }
    let dest = ytdlp.to_string_lossy().to_string();
    let _ = app.emit(
        "download-progress",
        format!("Downloading yt-dlp (first time only)… saving to: {dest}"),
    );
    // curl.exe is built into Windows 10/11 and handles GitHub redirects reliably.
    let output = std::process::Command::new("curl")
        .args([
            "-L",
            "--output", &dest,
            "--show-error",
            "--fail",
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
        ])
        .output()
        .map_err(|e| format!("curl not found or failed to start: {e}. Try placing yt-dlp.exe manually at: {dest}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "curl failed to download yt-dlp.exe: {stderr}\nYou can download it manually from https://github.com/yt-dlp/yt-dlp/releases/latest and place it at: {dest}"
        ));
    }
    if !ytdlp.exists() {
        return Err(format!(
            "yt-dlp.exe was not written to disk after download. Expected path: {dest}"
        ));
    }
    Ok(ytdlp)
}

/// Ensure ffmpeg.exe is present in the app data dir, downloading and extracting
/// from yt-dlp's official FFmpeg builds on first run.
fn get_or_download_ffmpeg(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let ffmpeg = data_dir.join("ffmpeg.exe");
    if ffmpeg.exists() {
        return Ok(ffmpeg);
    }

    let _ = app.emit("download-progress", "Downloading ffmpeg (first time only, ~90 MB)…");

    let zip_path = data_dir.join("ffmpeg-download.zip");
    let zip_str  = zip_path.to_string_lossy().to_string();
    let ffmpeg_str = ffmpeg.to_string_lossy().to_string();

    let dl = std::process::Command::new("curl")
        .args([
            "-L", "--output", &zip_str, "--show-error", "--fail",
            "https://github.com/yt-dlp/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip",
        ])
        .output()
        .map_err(|e| format!("curl error: {e}"))?;

    if !dl.status.success() || !zip_path.exists() {
        let stderr = String::from_utf8_lossy(&dl.stderr);
        return Err(format!("Failed to download ffmpeg: {stderr}"));
    }

    let _ = app.emit("download-progress", "Extracting ffmpeg…");

    let tmp_dir = data_dir.join("ffmpeg-extract-tmp");
    let tmp_str = tmp_dir.to_string_lossy().to_string();

    // Extract the zip, find the largest ffmpeg.exe (the real one), copy it out,
    // then clean up the temp directory and zip.
    let ps_cmd = format!(
        "New-Item -ItemType Directory -Force -Path '{tmp}' | Out-Null; \
         Expand-Archive -Path '{zip}' -DestinationPath '{tmp}' -Force; \
         $f = Get-ChildItem -Recurse -Filter 'ffmpeg.exe' '{tmp}' | \
              Sort-Object Length -Descending | Select-Object -First 1; \
         if ($f) {{ Copy-Item $f.FullName '{ff}' }}; \
         Remove-Item -Recurse -Force '{tmp}'",
        tmp = tmp_str,
        zip = zip_str,
        ff  = ffmpeg_str,
    );

    std::process::Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &ps_cmd])
        .output()
        .map_err(|e| format!("PowerShell extraction error: {e}"))?;

    let _ = std::fs::remove_file(&zip_path);

    if !ffmpeg.exists() {
        return Err(
            "ffmpeg.exe was not found after extraction. \
             You can install ffmpeg manually and add it to your PATH.".into()
        );
    }
    Ok(ffmpeg)
}

/// Start an audio download in a background thread. Emits Tauri events:
///   "download-progress"  – String status message while working
///   "download-complete"  – JSON { filePath, title } on success
///   "download-error"     – String error message on failure
#[tauri::command]
pub fn start_download(app_handle: AppHandle, url: String) -> Result<(), String> {
    // Basic URL validation – args are not shell-expanded, but reject obviously
    // invalid input early so the user gets a quick error.
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL must start with http:// or https://".into());
    }

    std::thread::spawn(move || {
        // Step 1 – obtain yt-dlp
        let ytdlp = match get_or_download_ytdlp(&app_handle) {
            Ok(p) => p,
            Err(e) => { let _ = app_handle.emit("download-error", e); return; }
        };

        // Step 2 – obtain ffmpeg (needed for -x / audio extraction to MP3)
        let ffmpeg = match get_or_download_ffmpeg(&app_handle) {
            Ok(p) => p,
            Err(e) => { let _ = app_handle.emit("download-error", e); return; }
        };
        let ffmpeg_dir = ffmpeg.parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        // Step 3 – resolve output directory.
        // We use AppData (not Music/Documents) to avoid Windows Defender
        // Controlled Folder Access blocking writes to protected folders.
        let data_dir = match app_handle.path().app_data_dir() {
            Ok(d) => d,
            Err(e) => { let _ = app_handle.emit("download-error", e.to_string()); return; }
        };
        let dl_dir = data_dir.join("downloads");
        if let Err(e) = std::fs::create_dir_all(&dl_dir) {
            let _ = app_handle.emit("download-error", format!("Cannot create downloads folder: {e}"));
            return;
        }

        let _ = app_handle.emit("download-progress", format!("Downloading audio… (saving to {})", dl_dir.to_string_lossy()));

        // Output template – yt-dlp sanitises the title for the OS automatically.
        let out_template = format!(
            "{}{}%(title)s.%(ext)s",
            dl_dir.to_string_lossy(),
            std::path::MAIN_SEPARATOR
        );

        // Record the time just before downloading so we can identify the output file
        // by its modification timestamp rather than by name — this handles re-downloads
        // of the same title and avoids all filename/encoding issues with --print.
        let before_download = std::time::SystemTime::now();

        let result = std::process::Command::new(&ytdlp)
            .args([
                "--no-playlist",
                "--force-overwrites",     // always write fresh file so mtime is current
                "-x",
                "--audio-format", "mp3",
                "--audio-quality", "5",   // VBR ~130 kbps – good quality, small files
                "--ffmpeg-location", &ffmpeg_dir,
                "-o", &out_template,
                "--no-warnings",
                "--no-progress",
                &url,
            ])
            .output();

        match result {
            Ok(out) if out.status.success() => {
                // Find the MP3 whose mtime is >= the timestamp we took before downloading.
                // We pick the newest one in case multiple files qualify.
                let new_mp3 = std::fs::read_dir(&dl_dir).ok().and_then(|rd| {
                    let mut candidates: Vec<(std::time::SystemTime, std::path::PathBuf)> = rd
                        .filter_map(|e| e.ok())
                        .filter(|e| {
                            e.path()
                                .extension()
                                .map_or(false, |x| x.eq_ignore_ascii_case("mp3"))
                        })
                        .filter_map(|e| {
                            let mtime = e.metadata().ok()?.modified().ok()?;
                            if mtime >= before_download {
                                Some((mtime, e.path()))
                            } else {
                                None
                            }
                        })
                        .collect();
                    candidates.sort_by(|a, b| b.0.cmp(&a.0)); // newest first
                    candidates.into_iter().next().map(|(_, p)| p)
                });

                match new_mp3 {
                    Some(path) => {
                        let file_path = path.to_string_lossy().to_string();
                        let title = path
                            .file_stem()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();
                        let payload = serde_json::json!({ "filePath": file_path, "title": title });
                        let _ = app_handle.emit("download-complete", payload);
                    }
                    None => {
                        let _ = app_handle.emit(
                            "download-error",
                            "Download succeeded but the output MP3 file could not be located.",
                        );
                    }
                }
            }
            Ok(out) => {
                let msg = {
                    let s = String::from_utf8_lossy(&out.stderr).to_string();
                    if s.trim().is_empty() {
                        String::from_utf8_lossy(&out.stdout).to_string()
                    } else {
                        s
                    }
                };
                let _ = app_handle.emit("download-error", msg.trim().to_string());
            }
            Err(e) => { let _ = app_handle.emit("download-error", e.to_string()); }
        }
    });

    Ok(())
}

/// Open Windows Explorer with the given file highlighted ("Show in folder").
#[tauri::command]
pub fn show_in_explorer(path: String) -> Result<(), String> {
    // Use raw_arg so the embedded quotes are NOT re-escaped by Rust's
    // CreateProcess quoting logic — explorer.exe parses /select,"path"
    // itself and needs the literal quote characters.
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let arg = format!("/select,\"{}\"", path.replace('"', ""));
        std::process::Command::new("explorer.exe")
            .raw_arg(arg)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {e}"))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let folder = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or(path);
        std::process::Command::new("open")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {e}"))?;
    }
    Ok(())
}
