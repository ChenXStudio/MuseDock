use std::path::PathBuf;

pub struct AppState {
    pub app_data_dir: PathBuf,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self { app_data_dir }
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
}
