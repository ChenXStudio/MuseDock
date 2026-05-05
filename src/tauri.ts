import { invoke } from "@tauri-apps/api/core";

export interface ProviderConfig {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  chat_model: string;
  has_api_key: boolean;
  is_default: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: PersistedMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  reply: string;
}

export interface ChatStreamEvent {
  request_id: string;
  delta: string;
  done: boolean;
}

export interface GenerateImageRequest {
  provider_id: string;
  prompt: string;
  model: string;
  size: string;
  n: number;
}

export interface GeneratedImage {
  id: string;
  path: string;
  file_name: string;
  mime_type: string;
  prompt: string;
  model: string;
  size: string;
  provider_id: string;
  created_at: string;
}

export const localApi = {
  getAppDataDir: () => invoke<string>("get_app_data_dir"),
  loadProviderConfig: () => invoke<ProviderConfig>("load_provider_config"),
  loadProviderConfigs: () => invoke<ProviderConfig[]>("load_provider_configs"),
  saveProviderConfig: (config: ProviderConfig) =>
    invoke<ProviderConfig>("save_provider_config", { config }),
  deleteProviderConfig: (providerId: string) =>
    invoke<void>("delete_provider_config", { providerId }),
  clearProviderApiKey: (providerId: string) =>
    invoke<void>("clear_provider_api_key", { providerId }),
  testProvider: (config: ProviderConfig) =>
    invoke<string>("test_provider", { config }),
  sendChatMessage: (messages: ChatMessage[]) =>
    invoke<ChatResponse>("send_chat_message", { providerId: null, messages }),
  sendChatMessageStream: (requestId: string, providerId: string, messages: ChatMessage[]) =>
    invoke<void>("send_chat_message_stream", { requestId, providerId, messages }),
  generateImages: (request: GenerateImageRequest) =>
    invoke<GeneratedImage[]>("generate_images", { request }),
  loadGeneratedImages: () => invoke<GeneratedImage[]>("load_generated_images"),
  deleteGeneratedImage: (imageId: string) =>
    invoke<void>("delete_generated_image", { imageId }),
  loadConversations: () => invoke<Conversation[]>("load_conversations"),
  saveConversation: (conversation: Conversation) =>
    invoke<void>("save_conversation", { conversation }),
  deleteConversation: (conversationId: string) =>
    invoke<void>("delete_conversation", { conversationId }),
};
