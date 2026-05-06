mod commands;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|err| anyhow::anyhow!("failed to resolve app data dir: {err}"))?;
            std::fs::create_dir_all(&app_data_dir)
                .map_err(|err| anyhow::anyhow!("failed to create app data dir: {err}"))?;
            app.manage(AppState::new(app_data_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_data_dir,
            commands::load_provider_config,
            commands::load_provider_configs,
            commands::save_provider_config,
            commands::delete_provider_config,
            commands::clear_provider_api_key,
            commands::test_provider,
            commands::send_chat_message,
            commands::send_chat_message_stream,
            commands::generate_images,
            commands::load_generated_images,
            commands::delete_generated_image,
            commands::load_image_settings,
            commands::save_image_settings,
            commands::load_conversations,
            commands::save_conversation,
            commands::delete_conversation,
            commands::export_conversation_markdown,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MuseDock Open");
}
