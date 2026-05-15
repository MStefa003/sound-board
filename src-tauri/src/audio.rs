use std::collections::HashMap;
use std::io::BufReader;
use std::fs::File;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

// ── Mic passthrough ──────────────────────────────────────────────────────────

/// A rodio Source that feeds from a channel of f32 samples captured from the mic.
/// Rodio will resample it to match the cable device's sample rate automatically.
struct MicSource {
    rx: mpsc::Receiver<f32>,
    channels: u16,
    sample_rate: u32,
}

impl Iterator for MicSource {
    type Item = f32;
    fn next(&mut self) -> Option<f32> {
        // Return silence if mic data hasn't arrived yet — never return None so the sink lives forever
        Some(self.rx.try_recv().unwrap_or(0.0))
    }
}

impl Source for MicSource {
    fn current_frame_len(&self) -> Option<usize> { None }
    fn channels(&self) -> u16 { self.channels }
    fn sample_rate(&self) -> u32 { self.sample_rate }
    fn total_duration(&self) -> Option<Duration> { None }
}

/// Keeps the passthrough alive. Dropping it stops the passthrough thread.
pub struct MicPassthroughHandle {
    stop_tx: mpsc::SyncSender<()>,
}

impl Drop for MicPassthroughHandle {
    fn drop(&mut self) {
        let _ = self.stop_tx.try_send(());
    }
}

/// Starts a background thread that captures the real microphone and feeds it
/// into CABLE Input via a rodio Sink so Windows mixes it with sound playback.
pub fn start_mic_passthrough() -> Result<MicPassthroughHandle, String> {
    let host = cpal::default_host();

    // Real mic = any input device that is NOT a cable device
    let input_device = host
        .input_devices()
        .map_err(|e| e.to_string())?
        .find(|d| !d.name().unwrap_or_default().to_lowercase().contains("cable"))
        .ok_or_else(|| "No real microphone found".to_string())?;

    // CABLE Input = the virtual output device we write into
    let cable_device = host
        .output_devices()
        .map_err(|e| e.to_string())?
        .find(|d| d.name().unwrap_or_default().to_lowercase().contains("cable input"))
        .ok_or_else(|| "VB-Audio CABLE Input not found".to_string())?;

    let (stop_tx, stop_rx) = mpsc::sync_channel::<()>(1);

    thread::spawn(move || {
        if let Err(e) = run_mic_passthrough(input_device, cable_device, stop_rx) {
            eprintln!("Mic passthrough stopped: {e}");
        }
    });

    Ok(MicPassthroughHandle { stop_tx })
}

fn run_mic_passthrough(
    input_device: cpal::Device,
    cable_device: cpal::Device,
    stop_rx: mpsc::Receiver<()>,
) -> Result<(), String> {
    let in_supported = input_device
        .default_input_config()
        .map_err(|e| e.to_string())?;
    let in_channels   = in_supported.channels();
    let in_sample_rate = in_supported.sample_rate().0;
    let in_fmt        = in_supported.sample_format();
    let in_cfg: cpal::StreamConfig = in_supported.into();

    // Open CABLE Input via rodio — plays our mic source into the virtual cable
    let (cable_stream, cable_handle) = OutputStream::try_from_device(&cable_device)
        .map_err(|e| e.to_string())?;
    let sink = Sink::try_new(&cable_handle).map_err(|e| e.to_string())?;

    let (tx, rx) = mpsc::sync_channel::<f32>(32768);

    // Append mic source — rodio resamples to cable's native rate
    sink.append(MicSource { rx, channels: in_channels, sample_rate: in_sample_rate });

    // Build cpal input stream for the real mic
    let input_stream: cpal::Stream = match in_fmt {
        cpal::SampleFormat::F32 => {
            let tx = tx.clone();
            input_device.build_input_stream(
                &in_cfg,
                move |data: &[f32], _| { for &s in data { let _ = tx.try_send(s); } },
                |e| eprintln!("Mic input error: {e}"),
                None,
            ).map_err(|e| e.to_string())?
        }
        cpal::SampleFormat::I16 => {
            let tx = tx.clone();
            input_device.build_input_stream(
                &in_cfg,
                move |data: &[i16], _| {
                    for &s in data { let _ = tx.try_send(s as f32 / i16::MAX as f32); }
                },
                |e| eprintln!("Mic input error: {e}"),
                None,
            ).map_err(|e| e.to_string())?
        }
        _ => return Err("Unsupported microphone sample format".to_string()),
    };
    drop(tx); // Only the clone inside the closure needs it

    input_stream.play().map_err(|e| e.to_string())?;

    // Block until stop signal — everything stays alive until here
    let _ = stop_rx.recv();
    drop(input_stream);
    drop(sink);
    drop(cable_stream);
    Ok(())
}

// ── Existing audio engine ────────────────────────────────────────────────────
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SoundEvent {
    pub instance_id: String,
    pub sound_id: String,
}

pub enum AudioCmd {
    Play {
        instance_id: String,
        sound_id: String,
        path: String,
        volume: f32,
        devices: Vec<String>,
    },
    Stop {
        instance_id: String,
    },
    StopAll,
    Pause {
        instance_id: String,
    },
    Resume {
        instance_id: String,
    },
    SetMasterVolume {
        volume: f32,
    },
}

struct PlaybackInstance {
    sound_id: String,
    base_volume: f32,
    sinks: Vec<Sink>,
    _streams: Vec<OutputStream>,
}

fn get_output_stream(device_name: &str) -> Result<(OutputStream, OutputStreamHandle), String> {
    if device_name == "Default" {
        get_speakers_stream()
    } else {
        let host = cpal::default_host();
        let device = host
            .output_devices()
            .map_err(|e| e.to_string())?
            .find(|d| d.name().unwrap_or_default() == device_name)
            .ok_or_else(|| format!("Device not found: {}", device_name))?;
        OutputStream::try_from_device(&device).map_err(|e| e.to_string())
    }
}

/// Returns an output stream for the user's real speakers/headphones.
/// Skips cable virtual devices so we never accidentally route speakers to VB-Cable.
fn get_speakers_stream() -> Result<(OutputStream, OutputStreamHandle), String> {
    let host = cpal::default_host();
    // Try the system default first; if it is not a cable device, use it
    if let Some(dev) = host.default_output_device() {
        let name = dev.name().unwrap_or_default().to_lowercase();
        if !name.contains("cable") {
            if let Ok(r) = OutputStream::try_from_device(&dev) {
                return Ok(r);
            }
        }
    }
    // Fallback: first enumerated output device that is not a cable device
    let device = host
        .output_devices()
        .map_err(|e| e.to_string())?
        .find(|d| !d.name().unwrap_or_default().to_lowercase().contains("cable"))
        .ok_or_else(|| "No speaker/headphone output device found".to_string())?;
    OutputStream::try_from_device(&device).map_err(|e| e.to_string())
}

pub fn get_output_devices() -> Vec<String> {
    let mut devices = vec!["Default".to_string()];
    let host = cpal::default_host();
    if let Ok(output_devices) = host.output_devices() {
        for d in output_devices {
            if let Ok(name) = d.name() {
                if name != "Default" {
                    devices.push(name);
                }
            }
        }
    }
    devices
}

pub fn get_sound_duration(path: &str) -> Option<f32> {
    let file = File::open(path).ok()?;
    let source = Decoder::new(BufReader::new(file)).ok()?;
    source.total_duration().map(|d| d.as_secs_f32())
}

pub fn start_audio_thread(app_handle: AppHandle) -> mpsc::Sender<AudioCmd> {
    let (tx, rx) = mpsc::channel::<AudioCmd>();

    thread::spawn(move || {
        let mut instances: HashMap<String, PlaybackInstance> = HashMap::new();
        let mut master_volume: f32 = 1.0;

        loop {
            // Drain all pending commands
            loop {
                match rx.try_recv() {
                    Ok(AudioCmd::Play {
                        instance_id,
                        sound_id,
                        path,
                        volume,
                        devices,
                    }) => {
                        let mut sinks = Vec::new();
                        let mut streams = Vec::new();

                        let target_devices = if devices.is_empty() {
                            vec!["Default".to_string()]
                        } else {
                            devices.clone()
                        };

                        for device_name in &target_devices {
                            if let Ok((stream, handle)) = get_output_stream(device_name) {
                                if let Ok(sink) = Sink::try_new(&handle) {
                                    if let Ok(file) = File::open(&path) {
                                        if let Ok(source) = Decoder::new(BufReader::new(file)) {
                                            sink.set_volume(volume);
                                            sink.append(source);
                                            sinks.push(sink);
                                            streams.push(stream);
                                        }
                                    }
                                }
                            }
                        }

                        if !sinks.is_empty() {
                            instances.insert(
                                instance_id.clone(),
                                PlaybackInstance {
                                    sound_id: sound_id.clone(),
                                    base_volume: volume,
                                    sinks,
                                    _streams: streams,
                                },
                            );
                            let _ = app_handle.emit(
                                "sound-started",
                                SoundEvent {
                                    instance_id,
                                    sound_id,
                                },
                            );
                        } else {
                            // Emit error event so UI doesn't hang
                            let _ = app_handle.emit(
                                "sound-error",
                                serde_json::json!({
                                    "instanceId": instance_id,
                                    "soundId": sound_id,
                                    "error": "Failed to open audio device or file"
                                }),
                            );
                        }
                    }
                    Ok(AudioCmd::Stop { instance_id }) => {
                        if let Some(inst) = instances.remove(&instance_id) {
                            for s in inst.sinks {
                                s.stop();
                            }
                            let _ = app_handle.emit("sound-stopped", &instance_id);
                        }
                    }
                    Ok(AudioCmd::StopAll) => {
                        let ids: Vec<String> = instances.keys().cloned().collect();
                        instances.clear();
                        for id in ids {
                            let _ = app_handle.emit("sound-stopped", &id);
                        }
                    }
                    Ok(AudioCmd::Pause { instance_id }) => {
                        if let Some(inst) = instances.get(&instance_id) {
                            for s in &inst.sinks { s.pause(); }
                            let _ = app_handle.emit("sound-paused", &instance_id);
                        }
                    }
                    Ok(AudioCmd::Resume { instance_id }) => {
                        if let Some(inst) = instances.get(&instance_id) {
                            for s in &inst.sinks { s.play(); }
                            let _ = app_handle.emit("sound-resumed", &instance_id);
                        }
                    }
                    Ok(AudioCmd::SetMasterVolume { volume }) => {
                        master_volume = volume.clamp(0.0, 2.0);
                        for inst in instances.values() {
                            let v = (inst.base_volume * master_volume).clamp(0.0, 2.0);
                            for s in &inst.sinks { s.set_volume(v); }
                        }
                    }
                    Err(mpsc::TryRecvError::Empty) => break,
                    Err(mpsc::TryRecvError::Disconnected) => return,
                }
            }

            // Check for naturally finished sounds
            let finished: Vec<String> = instances
                .iter()
                .filter(|(_, inst)| inst.sinks.iter().all(|s| s.empty()))
                .map(|(id, _)| id.clone())
                .collect();

            for id in finished {
                if let Some(_inst) = instances.remove(&id) {
                    let _ = app_handle.emit("sound-stopped", &id);
                }
            }

            thread::sleep(Duration::from_millis(50));
        }
    });

    tx
}
