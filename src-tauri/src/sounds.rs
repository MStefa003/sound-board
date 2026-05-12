use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sound {
    pub id: String,
    pub name: String,
    pub path: String,
    pub hotkey: Option<String>,
    pub volume: f32,
    pub color: String,
    pub duration: Option<f32>,
    pub category: Option<String>,
}

pub struct SoundsStore {
    pub sounds: Vec<Sound>,
    config_path: PathBuf,
}

impl SoundsStore {
    pub fn load() -> Self {
        let config_dir = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("SoundPad");
        std::fs::create_dir_all(&config_dir).ok();
        let config_path = config_dir.join("sounds.json");

        let sounds = if config_path.exists() {
            std::fs::read_to_string(&config_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            vec![]
        };

        SoundsStore {
            sounds,
            config_path,
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let json = serde_json::to_string_pretty(&self.sounds).map_err(|e| e.to_string())?;
        std::fs::write(&self.config_path, json).map_err(|e| e.to_string())
    }
}
