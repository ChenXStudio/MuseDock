use std::path::PathBuf;
use std::{collections::HashSet, sync::Arc};
use tokio::sync::Mutex;

pub struct AppState {
    pub app_data_dir: PathBuf,
    pub cancelled_chat_streams: Arc<Mutex<HashSet<String>>>,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            cancelled_chat_streams: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    pub fn provider_config_path(&self) -> PathBuf {
        self.app_data_dir.join("provider.json")
    }

    pub fn provider_configs_path(&self) -> PathBuf {
        self.app_data_dir.join("providers.json")
    }

    pub fn conversations_path(&self) -> PathBuf {
        self.app_data_dir.join("conversations.json")
    }

    pub fn generated_images_path(&self) -> PathBuf {
        self.app_data_dir.join("generated-images.json")
    }

    pub fn image_settings_path(&self) -> PathBuf {
        self.app_data_dir.join("image-settings.json")
    }

    pub fn exports_dir(&self) -> PathBuf {
        self.app_data_dir.join("exports")
    }
}
