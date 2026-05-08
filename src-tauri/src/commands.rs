use crate::state::AppState;
use base64::{engine::general_purpose, Engine};
use futures_util::StreamExt;
use keyring::Entry;
use reqwest::{header, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};

const KEYCHAIN_SERVICE: &str = "app.musedock.open";
const LEGACY_KEYCHAIN_ACCOUNT: &str = "default-provider-api-key";

fn default_provider_id() -> String {
    "default".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    #[serde(default = "default_provider_id")]
    pub id: String,
    pub name: String,
    pub base_url: String,
    #[serde(default)]
    pub api_key: String,
    pub chat_model: String,
    #[serde(default)]
    pub has_api_key: bool,
    #[serde(default)]
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredProviderConfig {
    #[serde(default = "default_provider_id")]
    id: String,
    name: String,
    base_url: String,
    chat_model: String,
    #[serde(default)]
    is_default: bool,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            id: default_provider_id(),
            name: "OpenAI Compatible".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: String::new(),
            chat_model: "gpt-4.1-mini".to_string(),
            has_api_key: false,
            is_default: true,
        }
    }
}

impl From<ProviderConfig> for StoredProviderConfig {
    fn from(config: ProviderConfig) -> Self {
        Self {
            id: normalize_provider_id(&config.id),
            name: config.name,
            base_url: config.base_url,
            chat_model: config.chat_model,
            is_default: config.is_default,
        }
    }
}

impl StoredProviderConfig {
    fn into_public(self, has_api_key: bool) -> ProviderConfig {
        ProviderConfig {
            id: normalize_provider_id(&self.id),
            name: self.name,
            base_url: self.base_url,
            api_key: String::new(),
            chat_model: self.chat_model,
            has_api_key,
            is_default: self.is_default,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub messages: Vec<PersistedMessage>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub reply: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStreamEvent {
    pub request_id: String,
    pub delta: String,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateImageRequest {
    pub provider_id: String,
    pub prompt: String,
    pub model: String,
    pub size: String,
    #[serde(default = "default_image_count")]
    pub n: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedImage {
    pub id: String,
    pub path: String,
    pub file_name: String,
    pub mime_type: String,
    pub prompt: String,
    pub model: String,
    pub size: String,
    pub provider_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportedFile {
    pub path: String,
    pub file_name: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ImageSettings {
    #[serde(default)]
    pub save_dir: String,
    #[serde(default)]
    pub using_default_dir: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct LocalBackup {
    version: String,
    exported_at: String,
    providers: Vec<StoredProviderConfig>,
    conversations: Vec<Conversation>,
    generated_images: Vec<GeneratedImage>,
    image_settings: ImageSettings,
    #[serde(default)]
    notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupImportSummary {
    pub providers: usize,
    pub conversations: usize,
    pub generated_images: usize,
    pub image_settings_imported: bool,
}

fn default_image_count() -> u8 {
    1
}

#[tauri::command]
pub fn get_app_data_dir(state: State<AppState>) -> String {
    state.app_data_dir.to_string_lossy().to_string()
}

#[tauri::command]
pub async fn get_exports_dir(state: State<'_, AppState>) -> Result<String, String> {
    tokio::fs::create_dir_all(state.exports_dir())
        .await
        .map_err(|err| format!("创建导出目录失败: {err}"))?;
    Ok(state.exports_dir().to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_local_path(path: String) -> Result<(), String> {
    let path = path.trim();
    if path.is_empty() {
        return Err("路径不能为空".to_string());
    }

    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(path).spawn();

    #[cfg(target_os = "windows")]
    let result = Command::new("explorer").arg(path).spawn();

    #[cfg(all(unix, not(target_os = "macos")))]
    let result = Command::new("xdg-open").arg(path).spawn();

    result
        .map(|_| ())
        .map_err(|err| format!("打开路径失败: {err}"))
}

#[tauri::command]
pub async fn load_provider_config(state: State<'_, AppState>) -> Result<ProviderConfig, String> {
    let providers = load_provider_configs(state).await?;
    Ok(default_provider_from(providers))
}

#[tauri::command]
pub async fn load_provider_configs(
    state: State<'_, AppState>,
) -> Result<Vec<ProviderConfig>, String> {
    let stored = read_stored_provider_configs(state.inner()).await?;
    Ok(stored
        .into_iter()
        .map(|provider| {
            let id = normalize_provider_id(&provider.id);
            let has_api_key = stored_api_key(&id).is_ok();
            provider.into_public(has_api_key)
        })
        .collect())
}

#[tauri::command]
pub async fn save_provider_config(
    state: State<'_, AppState>,
    config: ProviderConfig,
) -> Result<ProviderConfig, String> {
    let mut config = config;
    config.id = normalize_provider_id(&config.id);
    validate_provider_metadata(&config)?;
    if !config.api_key.trim().is_empty() {
        save_api_key(&config.id, config.api_key.trim())?;
    }

    let saved_id = config.id.clone();
    let mut providers = read_stored_provider_configs(state.inner()).await?;
    let stored = StoredProviderConfig::from(config);

    if let Some(existing) = providers.iter_mut().find(|item| item.id == saved_id) {
        *existing = stored;
    } else {
        providers.push(stored);
    }

    if providers
        .iter()
        .any(|item| item.id == saved_id && item.is_default)
    {
        for provider in &mut providers {
            provider.is_default = provider.id == saved_id;
        }
    }
    normalize_stored_providers(&mut providers);
    write_stored_provider_configs(state.inner(), &providers).await?;

    let saved = providers
        .into_iter()
        .find(|item| item.id == saved_id)
        .ok_or_else(|| "保存 Provider 后未找到配置".to_string())?;
    Ok(saved.into_public(stored_api_key(&saved_id).is_ok()))
}

#[tauri::command]
pub async fn delete_provider_config(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<(), String> {
    let provider_id = normalize_provider_id(&provider_id);
    let mut providers = read_stored_provider_configs(state.inner()).await?;
    if !providers.iter().any(|item| item.id == provider_id) {
        return Ok(());
    }
    if providers.len() <= 1 {
        return Err("至少保留一个 Provider".to_string());
    }
    let removed_default = providers
        .iter()
        .any(|item| item.id == provider_id && item.is_default);
    providers.retain(|item| item.id != provider_id);
    if removed_default {
        if let Some(first) = providers.first_mut() {
            first.is_default = true;
        }
    }
    normalize_stored_providers(&mut providers);
    write_stored_provider_configs(state.inner(), &providers).await?;
    let _ = delete_api_key(&provider_id);
    Ok(())
}

#[tauri::command]
pub fn clear_provider_api_key(provider_id: String) -> Result<(), String> {
    delete_api_key(&provider_id)
}

fn delete_api_key(provider_id: &str) -> Result<(), String> {
    match keychain_entry(provider_id)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(format!("清除 API Key 失败: {err}")),
    }
}

#[tauri::command]
pub async fn test_provider(config: ProviderConfig) -> Result<String, String> {
    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Reply with exactly: OK".to_string(),
    }];
    let _ = call_chat_completions(&config, &messages).await?;
    Ok("Provider 连接成功".to_string())
}

#[tauri::command]
pub async fn send_chat_message(
    state: State<'_, AppState>,
    provider_id: Option<String>,
    messages: Vec<ChatMessage>,
) -> Result<ChatResponse, String> {
    if messages.is_empty() {
        return Err("消息不能为空".to_string());
    }
    let config = select_provider_config(state.inner(), provider_id).await?;
    let reply = call_chat_completions(&config, &messages).await?;
    Ok(ChatResponse { reply })
}

#[tauri::command]
pub async fn send_chat_message_stream(
    app: AppHandle,
    state: State<'_, AppState>,
    request_id: String,
    provider_id: String,
    messages: Vec<ChatMessage>,
) -> Result<(), String> {
    if request_id.trim().is_empty() {
        return Err("请求 ID 不能为空".to_string());
    }
    if messages.is_empty() {
        return Err("消息不能为空".to_string());
    }
    let config = select_provider_config(state.inner(), Some(provider_id)).await?;
    call_chat_completions_stream(&app, &request_id, &config, &messages).await
}

#[tauri::command]
pub async fn generate_images(
    state: State<'_, AppState>,
    request: GenerateImageRequest,
) -> Result<Vec<GeneratedImage>, String> {
    validate_image_request(&request)?;
    let config = select_provider_config(state.inner(), Some(request.provider_id.clone())).await?;
    let images = call_image_generation(state.inner(), &config, &request).await?;
    let mut history = read_generated_images(&state).await?;
    history.splice(0..0, images.clone());
    write_generated_images(&state, &history).await?;
    Ok(images)
}

#[tauri::command]
pub async fn load_generated_images(
    state: State<'_, AppState>,
) -> Result<Vec<GeneratedImage>, String> {
    read_generated_images(&state).await
}

#[tauri::command]
pub async fn delete_generated_image(
    state: State<'_, AppState>,
    image_id: String,
) -> Result<(), String> {
    let mut images = read_generated_images(&state).await?;
    let Some(image) = images.iter().find(|item| item.id == image_id).cloned() else {
        return Ok(());
    };
    images.retain(|item| item.id != image_id);
    write_generated_images(&state, &images).await?;
    match tokio::fs::remove_file(&image.path).await {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(format!("删除图片文件失败: {err}")),
    }
}

#[tauri::command]
pub async fn clear_generated_images(
    state: State<'_, AppState>,
    delete_files: bool,
) -> Result<(), String> {
    let images = read_generated_images(&state).await?;
    write_generated_images(&state, &[]).await?;
    if delete_files {
        for image in images {
            match tokio::fs::remove_file(&image.path).await {
                Ok(()) => {}
                Err(err) if err.kind() == std::io::ErrorKind::NotFound => {}
                Err(err) => return Err(format!("删除图片文件失败: {err}")),
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn load_image_settings(state: State<'_, AppState>) -> Result<ImageSettings, String> {
    let mut settings = read_image_settings(&state).await?;
    if settings.save_dir.trim().is_empty() {
        settings.save_dir = default_image_dir(state.inner())
            .to_string_lossy()
            .to_string();
        settings.using_default_dir = true;
    }
    Ok(settings)
}

#[tauri::command]
pub async fn save_image_settings(
    state: State<'_, AppState>,
    mut settings: ImageSettings,
) -> Result<ImageSettings, String> {
    settings.save_dir = settings.save_dir.trim().to_string();
    settings.using_default_dir = settings.save_dir.is_empty();
    let target_dir = if settings.using_default_dir {
        default_image_dir(state.inner())
    } else {
        settings.save_dir.clone().into()
    };
    tokio::fs::create_dir_all(&target_dir)
        .await
        .map_err(|err| format!("创建图片保存目录失败: {err}"))?;
    write_image_settings(&state, &settings).await?;
    load_image_settings(state).await
}

#[tauri::command]
pub async fn load_conversations(state: State<'_, AppState>) -> Result<Vec<Conversation>, String> {
    read_conversations(&state).await
}

#[tauri::command]
pub async fn save_conversation(
    state: State<'_, AppState>,
    conversation: Conversation,
) -> Result<(), String> {
    if conversation.id.trim().is_empty() {
        return Err("会话 ID 不能为空".to_string());
    }
    let mut conversations = read_conversations(&state).await?;
    if let Some(existing) = conversations
        .iter_mut()
        .find(|item| item.id == conversation.id)
    {
        *existing = conversation;
    } else {
        conversations.push(conversation);
    }
    conversations.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    write_conversations(&state, &conversations).await
}

#[tauri::command]
pub async fn delete_conversation(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<(), String> {
    let mut conversations = read_conversations(&state).await?;
    conversations.retain(|item| item.id != conversation_id);
    write_conversations(&state, &conversations).await
}

#[tauri::command]
pub async fn clear_conversations(state: State<'_, AppState>) -> Result<(), String> {
    write_conversations(&state, &[]).await
}

#[tauri::command]
pub async fn export_conversation_markdown(
    state: State<'_, AppState>,
    conversation: Conversation,
) -> Result<ExportedFile, String> {
    if conversation.id.trim().is_empty() {
        return Err("会话 ID 不能为空".to_string());
    }
    tokio::fs::create_dir_all(state.exports_dir())
        .await
        .map_err(|err| format!("创建导出目录失败: {err}"))?;
    let file_name = format!(
        "{}-{}.md",
        sanitize_file_stem(&conversation.title),
        sanitize_file_stem(&conversation.id)
    );
    let path = state.exports_dir().join(&file_name);
    let content = render_conversation_markdown(&conversation);
    tokio::fs::write(&path, content)
        .await
        .map_err(|err| format!("导出会话失败: {err}"))?;
    Ok(ExportedFile {
        path: path.to_string_lossy().to_string(),
        file_name,
    })
}

#[tauri::command]
pub async fn export_local_backup(
    state: State<'_, AppState>,
    path: String,
) -> Result<ExportedFile, String> {
    let path = path.trim();
    if path.is_empty() {
        return Err("备份路径不能为空".to_string());
    }

    let target = PathBuf::from(path);
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|err| format!("创建备份目录失败: {err}"))?;
        }
    }

    let backup = LocalBackup {
        version: "1".to_string(),
        exported_at: unix_millis()?.to_string(),
        providers: read_stored_provider_configs(state.inner()).await?,
        conversations: read_conversations(&state).await?,
        generated_images: read_generated_images(&state).await?,
        image_settings: read_image_settings(&state).await?,
        notes: vec!["API keys are stored in the system keychain and are not included.".to_string()],
    };
    let content =
        serde_json::to_string_pretty(&backup).map_err(|err| format!("序列化备份失败: {err}"))?;
    tokio::fs::write(&target, content)
        .await
        .map_err(|err| format!("写入备份失败: {err}"))?;

    let file_name = target
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("musedock-backup.json")
        .to_string();
    Ok(ExportedFile {
        path: target.to_string_lossy().to_string(),
        file_name,
    })
}

#[tauri::command]
pub async fn import_local_backup(
    state: State<'_, AppState>,
    path: String,
) -> Result<BackupImportSummary, String> {
    let path = path.trim();
    if path.is_empty() {
        return Err("备份路径不能为空".to_string());
    }

    let content = tokio::fs::read_to_string(path)
        .await
        .map_err(|err| format!("读取备份失败: {err}"))?;
    let mut backup: LocalBackup =
        serde_json::from_str(&content).map_err(|err| format!("解析备份失败: {err}"))?;
    if backup.version != "1" {
        return Err(format!("不支持的备份版本: {}", backup.version));
    }

    normalize_stored_providers(&mut backup.providers);
    let summary = BackupImportSummary {
        providers: backup.providers.len(),
        conversations: backup.conversations.len(),
        generated_images: backup.generated_images.len(),
        image_settings_imported: true,
    };

    write_stored_provider_configs(state.inner(), &backup.providers).await?;
    write_conversations(&state, &backup.conversations).await?;
    write_generated_images(&state, &backup.generated_images).await?;
    write_image_settings(&state, &backup.image_settings).await?;

    Ok(summary)
}

fn validate_provider_metadata(config: &ProviderConfig) -> Result<(), String> {
    if config.name.trim().is_empty() {
        return Err("Provider 名称不能为空".to_string());
    }
    if config.base_url.trim().is_empty() {
        return Err("Base URL 不能为空".to_string());
    }
    if !config.base_url.starts_with("https://") && !config.base_url.starts_with("http://localhost")
    {
        return Err("Base URL 需要使用 HTTPS，或本机 localhost 调试地址".to_string());
    }
    if config.chat_model.trim().is_empty() {
        return Err("聊天模型不能为空".to_string());
    }
    Ok(())
}

fn render_conversation_markdown(conversation: &Conversation) -> String {
    let mut content = String::new();
    content.push_str(&format!("# {}\n\n", conversation.title.trim()));
    content.push_str(&format!("- Created: `{}`\n", conversation.created_at));
    content.push_str(&format!("- Updated: `{}`\n\n", conversation.updated_at));

    for message in &conversation.messages {
        let role = match message.role.as_str() {
            "user" => "User",
            "assistant" => "Assistant",
            other => other,
        };
        content.push_str(&format!("## {role}\n\n"));
        content.push_str(message.content.trim());
        content.push_str("\n\n");
    }

    content
}

fn sanitize_file_stem(value: &str) -> String {
    let mut sanitized = String::new();
    for ch in value.chars() {
        if ch.is_ascii_alphanumeric() {
            sanitized.push(ch.to_ascii_lowercase());
        } else if ch.is_whitespace() || matches!(ch, '-' | '_' | '.') {
            sanitized.push('-');
        }
    }
    let sanitized = sanitized
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if sanitized.is_empty() {
        "conversation".to_string()
    } else {
        sanitized.chars().take(64).collect()
    }
}

fn normalize_provider_id(id: &str) -> String {
    let id = id.trim();
    if id.is_empty() {
        default_provider_id()
    } else {
        id.to_string()
    }
}

fn default_provider_from(providers: Vec<ProviderConfig>) -> ProviderConfig {
    providers
        .iter()
        .find(|item| item.is_default)
        .cloned()
        .or_else(|| providers.first().cloned())
        .unwrap_or_default()
}

async fn select_provider_config(
    state: &AppState,
    provider_id: Option<String>,
) -> Result<ProviderConfig, String> {
    let providers = read_stored_provider_configs(state).await?;
    let selected_id = provider_id.map(|id| normalize_provider_id(&id));
    let stored = match selected_id {
        Some(id) => providers
            .into_iter()
            .find(|item| normalize_provider_id(&item.id) == id)
            .ok_or_else(|| "未找到选中的 Provider".to_string())?,
        None => providers
            .iter()
            .find(|item| item.is_default)
            .cloned()
            .or_else(|| providers.first().cloned())
            .ok_or_else(|| "Provider 配置为空".to_string())?,
    };
    let id = normalize_provider_id(&stored.id);
    Ok(stored.into_public(stored_api_key(&id).is_ok()))
}

async fn read_stored_provider_configs(
    state: &AppState,
) -> Result<Vec<StoredProviderConfig>, String> {
    let providers_path = state.provider_configs_path();
    if providers_path.exists() {
        let content = tokio::fs::read_to_string(providers_path)
            .await
            .map_err(|err| format!("读取 Provider 配置失败: {err}"))?;
        if content.trim().is_empty() {
            return Ok(vec![StoredProviderConfig::from(ProviderConfig::default())]);
        }
        let mut providers: Vec<StoredProviderConfig> = serde_json::from_str(&content)
            .map_err(|err| format!("解析 Provider 配置失败: {err}"))?;
        normalize_stored_providers(&mut providers);
        return Ok(providers);
    }

    let legacy_path = state.provider_config_path();
    if legacy_path.exists() {
        let content = tokio::fs::read_to_string(legacy_path)
            .await
            .map_err(|err| format!("读取旧 Provider 配置失败: {err}"))?;
        if !content.trim().is_empty() {
            let mut legacy: StoredProviderConfig = serde_json::from_str(&content)
                .map_err(|err| format!("解析旧 Provider 配置失败: {err}"))?;
            legacy.id = default_provider_id();
            legacy.is_default = true;
            return Ok(vec![legacy]);
        }
    }

    Ok(vec![StoredProviderConfig::from(ProviderConfig::default())])
}

async fn write_stored_provider_configs(
    state: &AppState,
    providers: &[StoredProviderConfig],
) -> Result<(), String> {
    let path = state.provider_configs_path();
    let content = serde_json::to_string_pretty(providers)
        .map_err(|err| format!("序列化 Provider 配置失败: {err}"))?;
    tokio::fs::write(path, content)
        .await
        .map_err(|err| format!("保存 Provider 配置失败: {err}"))
}

fn normalize_stored_providers(providers: &mut Vec<StoredProviderConfig>) {
    if providers.is_empty() {
        providers.push(StoredProviderConfig::from(ProviderConfig::default()));
    }

    let mut seen_default = false;
    for provider in providers.iter_mut() {
        provider.id = normalize_provider_id(&provider.id);
        if provider.is_default {
            if seen_default {
                provider.is_default = false;
            } else {
                seen_default = true;
            }
        }
    }

    if !seen_default {
        if let Some(first) = providers.first_mut() {
            first.is_default = true;
        }
    }
}

fn validate_image_request(request: &GenerateImageRequest) -> Result<(), String> {
    if request.prompt.trim().is_empty() {
        return Err("图片提示词不能为空".to_string());
    }
    if request.model.trim().is_empty() {
        return Err("图片模型不能为空".to_string());
    }
    if request.size.trim().is_empty() {
        return Err("图片尺寸不能为空".to_string());
    }
    if request.n == 0 || request.n > 4 {
        return Err("一次最多生成 4 张图片".to_string());
    }
    Ok(())
}

async fn call_chat_completions(
    config: &ProviderConfig,
    messages: &[ChatMessage],
) -> Result<String, String> {
    validate_provider_metadata(config)?;
    let api_key = resolve_api_key(config)?;
    let url = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
    let payload = json!({
        "model": config.chat_model,
        "messages": messages,
        "temperature": 0.7,
        "stream": false
    });

    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|err| format!("请求 Provider 失败: {err}"))?;

    let status = response.status();
    let value: serde_json::Value = response
        .json()
        .await
        .map_err(|err| format!("解析 Provider 响应失败: {err}"))?;

    if status != StatusCode::OK {
        let message = value
            .pointer("/error/message")
            .and_then(|v| v.as_str())
            .unwrap_or("Provider 返回错误");
        return Err(format!("Provider 请求失败 ({status}): {message}"));
    }

    value
        .pointer("/choices/0/message/content")
        .and_then(|v| v.as_str())
        .map(|text| text.to_string())
        .ok_or_else(|| "Provider 响应中没有 assistant 内容".to_string())
}

async fn call_chat_completions_stream(
    app: &AppHandle,
    request_id: &str,
    config: &ProviderConfig,
    messages: &[ChatMessage],
) -> Result<(), String> {
    validate_provider_metadata(config)?;
    let api_key = resolve_api_key(config)?;
    let url = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
    let payload = json!({
        "model": config.chat_model,
        "messages": messages,
        "temperature": 0.7,
        "stream": true
    });

    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|err| format!("请求 Provider 失败: {err}"))?;

    let status = response.status();
    if status != StatusCode::OK {
        let value: serde_json::Value = response
            .json()
            .await
            .map_err(|err| format!("解析 Provider 错误响应失败: {err}"))?;
        let message = value
            .pointer("/error/message")
            .and_then(|v| v.as_str())
            .unwrap_or("Provider 返回错误");
        return Err(format!("Provider 请求失败 ({status}): {message}"));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|err| format!("读取流式响应失败: {err}"))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some((index, delimiter_len)) = find_sse_delimiter(&buffer) {
            let event = buffer[..index].to_string();
            buffer = buffer[index + delimiter_len..].to_string();
            if process_stream_event(app, request_id, &event)? {
                emit_stream_done(app, request_id)?;
                return Ok(());
            }
        }
    }

    if !buffer.trim().is_empty() {
        let _ = process_stream_event(app, request_id, &buffer)?;
    }
    emit_stream_done(app, request_id)?;
    Ok(())
}

fn find_sse_delimiter(buffer: &str) -> Option<(usize, usize)> {
    let lf = buffer.find("\n\n").map(|index| (index, 2));
    let crlf = buffer.find("\r\n\r\n").map(|index| (index, 4));
    match (lf, crlf) {
        (Some(a), Some(b)) => Some(if a.0 <= b.0 { a } else { b }),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        (None, None) => None,
    }
}

fn process_stream_event(app: &AppHandle, request_id: &str, event: &str) -> Result<bool, String> {
    for line in event.lines() {
        let line = line.trim();
        if !line.starts_with("data:") {
            continue;
        }
        let data = line.trim_start_matches("data:").trim();
        if data == "[DONE]" {
            return Ok(true);
        }
        let value: serde_json::Value =
            serde_json::from_str(data).map_err(|err| format!("解析流式响应失败: {err}"))?;
        if let Some(delta) = value
            .pointer("/choices/0/delta/content")
            .and_then(|item| item.as_str())
        {
            if !delta.is_empty() {
                emit_stream_delta(app, request_id, delta)?;
            }
        }
    }
    Ok(false)
}

fn emit_stream_delta(app: &AppHandle, request_id: &str, delta: &str) -> Result<(), String> {
    app.emit(
        "chat_stream",
        ChatStreamEvent {
            request_id: request_id.to_string(),
            delta: delta.to_string(),
            done: false,
        },
    )
    .map_err(|err| format!("发送流式事件失败: {err}"))
}

fn emit_stream_done(app: &AppHandle, request_id: &str) -> Result<(), String> {
    app.emit(
        "chat_stream",
        ChatStreamEvent {
            request_id: request_id.to_string(),
            delta: String::new(),
            done: true,
        },
    )
    .map_err(|err| format!("发送流式完成事件失败: {err}"))
}

async fn call_image_generation(
    state: &AppState,
    config: &ProviderConfig,
    request: &GenerateImageRequest,
) -> Result<Vec<GeneratedImage>, String> {
    validate_provider_metadata(config)?;
    let api_key = resolve_api_key(config)?;
    let url = format!(
        "{}/images/generations",
        config.base_url.trim_end_matches('/')
    );
    let payload = json!({
        "model": request.model.trim(),
        "prompt": request.prompt.trim(),
        "size": request.size.trim(),
        "n": request.n
    });

    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|err| format!("请求图片 Provider 失败: {err}"))?;

    let status = response.status();
    let value: serde_json::Value = response
        .json()
        .await
        .map_err(|err| format!("解析图片 Provider 响应失败: {err}"))?;

    if status != StatusCode::OK {
        let message = value
            .pointer("/error/message")
            .and_then(|v| v.as_str())
            .unwrap_or("Provider 返回错误");
        return Err(format!("图片 Provider 请求失败 ({status}): {message}"));
    }

    let data = value
        .pointer("/data")
        .and_then(|item| item.as_array())
        .ok_or_else(|| "图片 Provider 响应中没有 data 数组".to_string())?;
    if data.is_empty() {
        return Err("图片 Provider 没有返回图片".to_string());
    }

    let image_dir = resolve_image_save_dir(state).await?;
    tokio::fs::create_dir_all(&image_dir)
        .await
        .map_err(|err| format!("创建图片目录失败: {err}"))?;

    let mut images = Vec::new();
    for (index, item) in data.iter().enumerate() {
        let (bytes, mime_type) =
            if let Some(encoded) = item.pointer("/b64_json").and_then(|value| value.as_str()) {
                (
                    general_purpose::STANDARD
                        .decode(encoded)
                        .map_err(|err| format!("解码图片 base64 失败: {err}"))?,
                    "image/png".to_string(),
                )
            } else if let Some(image_url) = item.pointer("/url").and_then(|value| value.as_str()) {
                download_image_url(&client, image_url).await?
            } else {
                return Err("图片 Provider 响应中没有 b64_json 或 url".to_string());
            };

        let extension = image_extension(&mime_type);
        let file_name = format!("{}-{}.{}", unix_millis()?, index + 1, extension);
        let path = image_dir.join(&file_name);
        tokio::fs::write(&path, bytes)
            .await
            .map_err(|err| format!("保存图片失败: {err}"))?;
        let created_at = unix_millis()?.to_string();
        images.push(GeneratedImage {
            id: format!("{}-{}", created_at, index + 1),
            path: path.to_string_lossy().to_string(),
            file_name,
            mime_type,
            prompt: request.prompt.trim().to_string(),
            model: request.model.trim().to_string(),
            size: request.size.trim().to_string(),
            provider_id: config.id.clone(),
            created_at,
        });
    }

    Ok(images)
}

fn default_image_dir(state: &AppState) -> std::path::PathBuf {
    state.app_data_dir.join("generated-images")
}

async fn resolve_image_save_dir(state: &AppState) -> Result<std::path::PathBuf, String> {
    let settings = read_image_settings_from_state(state).await?;
    if settings.save_dir.trim().is_empty() {
        Ok(default_image_dir(state))
    } else {
        Ok(settings.save_dir.into())
    }
}

async fn download_image_url(
    client: &reqwest::Client,
    image_url: &str,
) -> Result<(Vec<u8>, String), String> {
    let response = client
        .get(image_url)
        .send()
        .await
        .map_err(|err| format!("下载图片失败: {err}"))?;
    let status = response.status();
    if status != StatusCode::OK {
        return Err(format!("下载图片失败 ({status})"));
    }
    let mime_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("image/png")
        .split(';')
        .next()
        .unwrap_or("image/png")
        .to_string();
    let bytes = response
        .bytes()
        .await
        .map_err(|err| format!("读取图片内容失败: {err}"))?
        .to_vec();
    Ok((bytes, mime_type))
}

fn image_extension(mime_type: &str) -> &'static str {
    match mime_type {
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "png",
    }
}

fn unix_millis() -> Result<u128, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .map_err(|err| format!("生成图片文件名失败: {err}"))
}

fn keychain_account(provider_id: &str) -> String {
    format!("provider-api-key:{}", normalize_provider_id(provider_id))
}

fn keychain_entry(provider_id: &str) -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, &keychain_account(provider_id))
        .map_err(|err| format!("初始化系统钥匙串失败: {err}"))
}

fn legacy_keychain_entry() -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, LEGACY_KEYCHAIN_ACCOUNT)
        .map_err(|err| format!("初始化旧系统钥匙串失败: {err}"))
}

fn stored_api_key(provider_id: &str) -> Result<String, String> {
    let provider_id = normalize_provider_id(provider_id);
    match keychain_entry(&provider_id)?.get_password() {
        Ok(api_key) => Ok(api_key),
        Err(keyring::Error::NoEntry) if provider_id == default_provider_id() => {
            legacy_keychain_entry()?
                .get_password()
                .map_err(|err| match err {
                    keyring::Error::NoEntry => "API Key 尚未保存".to_string(),
                    other => format!("读取 API Key 失败: {other}"),
                })
        }
        Err(err) => Err(match err {
            keyring::Error::NoEntry => "API Key 尚未保存".to_string(),
            other => format!("读取 API Key 失败: {other}"),
        }),
    }
}

fn save_api_key(provider_id: &str, api_key: &str) -> Result<(), String> {
    keychain_entry(provider_id)?
        .set_password(api_key)
        .map_err(|err| format!("保存 API Key 到系统钥匙串失败: {err}"))
}

fn resolve_api_key(config: &ProviderConfig) -> Result<String, String> {
    if !config.api_key.trim().is_empty() {
        return Ok(config.api_key.trim().to_string());
    }
    stored_api_key(&config.id)
}

async fn read_conversations(state: &State<'_, AppState>) -> Result<Vec<Conversation>, String> {
    let path = state.conversations_path();
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = tokio::fs::read_to_string(path)
        .await
        .map_err(|err| format!("读取会话失败: {err}"))?;
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(&content).map_err(|err| format!("解析会话失败: {err}"))
}

async fn write_conversations(
    state: &State<'_, AppState>,
    conversations: &[Conversation],
) -> Result<(), String> {
    let path = state.conversations_path();
    let content = serde_json::to_string_pretty(conversations)
        .map_err(|err| format!("序列化会话失败: {err}"))?;
    tokio::fs::write(path, content)
        .await
        .map_err(|err| format!("保存会话失败: {err}"))
}

async fn read_generated_images(state: &State<'_, AppState>) -> Result<Vec<GeneratedImage>, String> {
    let path = state.generated_images_path();
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = tokio::fs::read_to_string(path)
        .await
        .map_err(|err| format!("读取图片历史失败: {err}"))?;
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(&content).map_err(|err| format!("解析图片历史失败: {err}"))
}

async fn write_generated_images(
    state: &State<'_, AppState>,
    images: &[GeneratedImage],
) -> Result<(), String> {
    let path = state.generated_images_path();
    let content =
        serde_json::to_string_pretty(images).map_err(|err| format!("序列化图片历史失败: {err}"))?;
    tokio::fs::write(path, content)
        .await
        .map_err(|err| format!("保存图片历史失败: {err}"))
}

async fn read_image_settings(state: &State<'_, AppState>) -> Result<ImageSettings, String> {
    read_image_settings_from_state(state.inner()).await
}

async fn read_image_settings_from_state(state: &AppState) -> Result<ImageSettings, String> {
    let path = state.image_settings_path();
    if !path.exists() {
        return Ok(ImageSettings::default());
    }
    let content = tokio::fs::read_to_string(path)
        .await
        .map_err(|err| format!("读取图片设置失败: {err}"))?;
    if content.trim().is_empty() {
        return Ok(ImageSettings::default());
    }
    serde_json::from_str(&content).map_err(|err| format!("解析图片设置失败: {err}"))
}

async fn write_image_settings(
    state: &State<'_, AppState>,
    settings: &ImageSettings,
) -> Result<(), String> {
    let path = state.image_settings_path();
    let content = serde_json::to_string_pretty(settings)
        .map_err(|err| format!("序列化图片设置失败: {err}"))?;
    tokio::fs::write(path, content)
        .await
        .map_err(|err| format!("保存图片设置失败: {err}"))
}
