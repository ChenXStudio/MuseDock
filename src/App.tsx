import { FormEvent, useEffect, useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Bot, Check, Copy, Database, Image, Info, KeyRound, Loader2, Plus, Search, Send, Settings, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, ChatStreamEvent, Conversation, GeneratedImage, PersistedMessage, ProviderConfig, localApi } from "./tauri";

type View = "chat" | "images" | "settings";
type SettingsSection = "provider" | "chat" | "images" | "data" | "about";

const defaultSystemPrompt =
  "You are MuseDock Open, a concise and practical AI assistant.";
const lastViewKey = "musedock:last-view";
const lastSettingsSectionKey = "musedock:last-settings-section";
const appVersion = "0.1.0";
const releaseUrl = "https://github.com/ChenXStudio/MuseDock/releases/tag/v0.1.0";

const defaultConfig: ProviderConfig = {
  id: "default",
  name: "OpenAI Compatible",
  base_url: "https://api.openai.com/v1",
  api_key: "",
  chat_model: "gpt-4.1-mini",
  has_api_key: false,
  is_default: true,
};

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initialView(): View {
  const value = window.localStorage.getItem(lastViewKey);
  return value === "chat" || value === "images" || value === "settings" ? value : "chat";
}

function initialSettingsSection(): SettingsSection {
  const value = window.localStorage.getItem(lastSettingsSectionKey);
  return value === "provider" || value === "chat" || value === "images" || value === "data" || value === "about"
    ? value
    : "provider";
}

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(initialSettingsSection);
  const [providers, setProviders] = useState<ProviderConfig[]>([defaultConfig]);
  const [provider, setProvider] = useState<ProviderConfig>(defaultConfig);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [expandedConversationId, setExpandedConversationId] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [input, setInput] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState("gpt-image-1");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [imageCount, setImageCount] = useState(1);
  const [imageSaveDir, setImageSaveDir] = useState("");
  const [usingDefaultImageDir, setUsingDefaultImageDir] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [imageSearch, setImageSearch] = useState("");
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [appDataDir, setAppDataDir] = useState("");
  const [exportsDir, setExportsDir] = useState("");

  const canChat = useMemo(
    () =>
      (provider.api_key.trim() || provider.has_api_key) &&
      provider.base_url.trim() &&
      provider.chat_model.trim(),
    [provider],
  );
  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [activeConversationId, conversations],
  );
  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const titleMatches = conversation.title.toLowerCase().includes(query);
      const messageMatches = conversation.messages.some((message) =>
        message.content.toLowerCase().includes(query),
      );
      return titleMatches || messageMatches;
    });
  }, [conversationSearch, conversations]);
  const messages = activeConversation?.messages || [];
  const selectedImage = useMemo(
    () => generatedImages.find((image) => image.id === selectedImageId) || null,
    [generatedImages, selectedImageId],
  );
  const filteredImages = useMemo(() => {
    const query = imageSearch.trim().toLowerCase();
    if (!query) return generatedImages;
    return generatedImages.filter((image) =>
      [
        image.file_name,
        image.prompt,
        image.model,
        image.size,
        image.path,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [generatedImages, imageSearch]);
  const pageTitle =
    view === "chat" ? "Chat" : view === "images" ? "Images" : "Settings";
  const pageDescription =
    view === "chat"
      ? `Using ${provider.name || "provider"} / ${provider.chat_model || "model not set"}`
      : view === "images"
        ? `Using ${provider.name || "provider"} / ${imageModel || "image model not set"}`
        : settingsDescription(settingsSection);

  const refreshLocalState = async () => {
    const [loadedProviders, loadedConversations, loadedImages, loadedImageSettings] =
      await Promise.all([
        localApi.loadProviderConfigs(),
        localApi.loadConversations(),
        localApi.loadGeneratedImages(),
        localApi.loadImageSettings(),
      ]);
    const nextProviders = loadedProviders.length ? loadedProviders : [defaultConfig];
    setProviders(nextProviders);
    setProvider(nextProviders.find((item) => item.is_default) || nextProviders[0]);
    setConversations(loadedConversations);
    setActiveConversationId(loadedConversations[0]?.id || null);
    setExpandedConversationId(null);
    setGeneratedImages(loadedImages);
    setSelectedImageId(null);
    setImageSaveDir(loadedImageSettings.save_dir);
    setUsingDefaultImageDir(loadedImageSettings.using_default_dir);
  };

  useEffect(() => {
    localApi
      .getAppDataDir()
      .then(setAppDataDir)
      .catch(() => setAppDataDir(""));
    localApi
      .getExportsDir()
      .then(setExportsDir)
      .catch(() => setExportsDir(""));
    refreshLocalState().catch((error) => setStatus(String(error)));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(lastViewKey, view);
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem(lastSettingsSectionKey, settingsSection);
  }, [settingsSection]);

  useEffect(() => {
    if (!selectedImageId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedImageId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageId]);

  const upsertProviderState = (saved: ProviderConfig) => {
    const clean = { ...saved, api_key: "" };
    setProviders((current) => {
      const existing = current.some((item) => item.id === clean.id);
      const next = existing
        ? current.map((item) => (item.id === clean.id ? clean : item))
        : [...current, clean];
      return clean.is_default
        ? next.map((item) => ({ ...item, is_default: item.id === clean.id }))
        : next;
    });
    setProvider(clean);
  };

  const saveProvider = async () => {
    setBusy(true);
    setStatus("");
    try {
      const saved = await localApi.saveProviderConfig(provider);
      upsertProviderState(saved);
      setStatus("Provider 已保存");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const testProvider = async () => {
    setBusy(true);
    setStatus("");
    try {
      const message = await localApi.testProvider(provider);
      setStatus(message);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const clearApiKey = async () => {
    setBusy(true);
    setStatus("");
    try {
      await localApi.clearProviderApiKey(provider.id);
      const next = { ...provider, api_key: "", has_api_key: false };
      setProvider(next);
      setProviders((current) =>
        current.map((item) => (item.id === provider.id ? next : item)),
      );
      setStatus("API Key 已从系统钥匙串清除");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const selectProvider = (providerId: string) => {
    const selected = providers.find((item) => item.id === providerId);
    if (!selected) return;
    setProvider({ ...selected, api_key: "" });
  };

  const addProvider = () => {
    const next: ProviderConfig = {
      ...defaultConfig,
      id: createId(),
      name: "New Provider",
      is_default: providers.length === 0,
      has_api_key: false,
    };
    setProviders((current) => [...current, next]);
    setProvider(next);
    setStatus("新 Provider 已创建，保存后生效");
  };

  const deleteProvider = async () => {
    if (providers.length <= 1) {
      setStatus("至少保留一个 Provider");
      return;
    }
    if (!window.confirm(`删除 Provider「${provider.name}」？`)) return;
    setBusy(true);
    setStatus("");
    try {
      await localApi.deleteProviderConfig(provider.id);
      const nextProviders = providers.filter((item) => item.id !== provider.id);
      const nextSelected = nextProviders.find((item) => item.is_default) || nextProviders[0];
      setProviders(nextProviders);
      setProvider(nextSelected);
      setStatus("Provider 已删除");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const upsertConversation = (conversation: Conversation) => {
    setConversations((current) => {
      const next = current.some((item) => item.id === conversation.id)
        ? current.map((item) => (item.id === conversation.id ? conversation : item))
        : [conversation, ...current];
      return [...next].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    });
    setActiveConversationId(conversation.id);
  };

  const buildConversation = (firstMessage?: string): Conversation => {
    const now = new Date().toISOString();
    return {
      id: createId(),
      title: firstMessage ? makeTitle(firstMessage) : "New chat",
      messages: [],
      created_at: now,
      updated_at: now,
    };
  };

  const newConversation = async () => {
    const conversation = buildConversation();
    upsertConversation(conversation);
    await localApi.saveConversation(conversation);
    setView("chat");
    setInput("");
    setStatus("新会话已创建");
  };

  const renameConversation = async (conversation: Conversation) => {
    const title = window.prompt("重命名会话", conversation.title)?.trim();
    if (!title) return;
    const next = { ...conversation, title, updated_at: new Date().toISOString() };
    upsertConversation(next);
    await localApi.saveConversation(next);
  };

  const deleteConversation = async (conversation: Conversation) => {
    if (!window.confirm(`删除会话「${conversation.title}」？`)) return;
    await localApi.deleteConversation(conversation.id);
    setConversations((current) => {
      const next = current.filter((item) => item.id !== conversation.id);
      if (activeConversationId === conversation.id) {
        setActiveConversationId(next[0]?.id || null);
      }
      return next;
    });
    setStatus("会话已删除");
  };

  const exportConversation = async (conversation: Conversation) => {
    setBusy(true);
    setStatus("");
    try {
      const exported = await localApi.exportConversationMarkdown(conversation);
      setStatus(`已导出: ${exported.path}`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const exportLocalBackup = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const selected = await save({
      title: "Export MuseDock backup",
      defaultPath: `musedock-backup-${today}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!selected) return;

    setBusy(true);
    setStatus("");
    try {
      const exported = await localApi.exportLocalBackup(selected);
      setStatus(`已导出备份: ${exported.path}`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const importLocalBackup = async () => {
    const selected = await open({
      multiple: false,
      title: "Import MuseDock backup",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    const confirmed = window.confirm(
      "Importing this backup will replace local provider metadata, conversations, image history, and image settings. API keys are not included in backups and will remain in the system keychain.",
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus("");
    try {
      const summary = await localApi.importLocalBackup(selected);
      await refreshLocalState();
      setStatus(
        `已导入备份: ${summary.providers} providers, ${summary.conversations} conversations, ${summary.generated_images} image records. API keys unchanged.`,
      );
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    if (!canChat) {
      setView("settings");
      setStatus("请先配置 Provider、API Key 和聊天模型");
      return;
    }

    const now = new Date().toISOString();
    const conversation = activeConversation || buildConversation(text);
    const userMessage: PersistedMessage = {
      id: createId(),
      role: "user",
      content: text,
      created_at: now,
    };
    const nextMessages: PersistedMessage[] = [...conversation.messages, userMessage];
    const draftConversation: Conversation = {
      ...conversation,
      title: conversation.messages.length === 0 ? makeTitle(text) : conversation.title,
      messages: nextMessages,
      updated_at: now,
    };
    upsertConversation(draftConversation);
    await localApi.saveConversation(draftConversation);
    setInput("");
    setBusy(true);
    setStatus("生成中...");

    const assistantMessageId = createId();
    let streamedContent = "";
    const streamingConversation: Conversation = {
      ...draftConversation,
      messages: [
        ...nextMessages,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
        },
      ],
      updated_at: new Date().toISOString(),
    };
    upsertConversation(streamingConversation);
    const apiMessages: ChatMessage[] = [
      { role: "system", content: defaultSystemPrompt },
      ...nextMessages.map(({ role, content }) => ({ role, content })),
    ];
    const requestId = createId();

    try {
      const unlisten = await listen<ChatStreamEvent>("chat_stream", (event) => {
        if (event.payload.request_id !== requestId) return;
        if (event.payload.done) return;
        streamedContent += event.payload.delta;
        setConversations((current) =>
          current.map((item) =>
            item.id === streamingConversation.id
              ? updateAssistantMessage(item, assistantMessageId, streamedContent)
              : item,
          ),
        );
      });
      try {
        await localApi.sendChatMessageStream(requestId, provider.id, apiMessages);
      } finally {
        unlisten();
      }
      const finalConversation: Conversation = {
        ...streamingConversation,
        messages: streamingConversation.messages.map((message) =>
          message.id === assistantMessageId
            ? { ...message, content: streamedContent }
            : message,
        ),
        updated_at: new Date().toISOString(),
      };
      upsertConversation(finalConversation);
      await localApi.saveConversation(finalConversation);
      setStatus("完成");
    } catch (error) {
      const message = String(error);
      const failedContent = streamedContent
        ? `${streamedContent}\n\n---\n生成中断：${message}`
        : `生成失败：${message}`;
      const failedConversation: Conversation = {
        ...streamingConversation,
        messages: streamingConversation.messages.map((item) =>
          item.id === assistantMessageId ? { ...item, content: failedContent } : item,
        ),
        updated_at: new Date().toISOString(),
      };
      upsertConversation(failedConversation);
      await localApi.saveConversation(failedConversation);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setStatus("已复制");
  };

  const openLocalPath = async (path: string) => {
    if (!path.trim()) return;
    try {
      await localApi.openLocalPath(path);
    } catch (error) {
      setStatus(String(error));
    }
  };

  const generateImages = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = imagePrompt.trim();
    if (!prompt || busy) return;
    if (!provider.api_key.trim() && !provider.has_api_key) {
      setView("settings");
      setStatus("请先配置当前 Provider 的 API Key");
      return;
    }
    setBusy(true);
    setStatus("图片生成中...");
    try {
      const images = await localApi.generateImages({
        provider_id: provider.id,
        prompt,
        model: imageModel,
        size: imageSize,
        n: imageCount,
      });
      setGeneratedImages((current) => [...images, ...current]);
      setStatus(`已保存 ${images.length} 张图片`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const deleteGeneratedImage = async (image: GeneratedImage) => {
    if (!window.confirm(`删除图片「${image.file_name}」？`)) return;
    const currentIndex = generatedImages.findIndex((item) => item.id === image.id);
    const nextSelectedImage =
      generatedImages[currentIndex + 1] || generatedImages[currentIndex - 1] || null;
    setBusy(true);
    setStatus("");
    try {
      await localApi.deleteGeneratedImage(image.id);
      setGeneratedImages((current) => current.filter((item) => item.id !== image.id));
      setSelectedImageId((current) =>
        current === image.id ? nextSelectedImage?.id || null : current,
      );
      setStatus("图片已删除");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const chooseImageSaveDir = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose image save folder",
    });
    if (!selected || Array.isArray(selected)) return;
    setBusy(true);
    setStatus("");
    try {
      const settings = await localApi.saveImageSettings({
        save_dir: selected,
        using_default_dir: false,
      });
      setImageSaveDir(settings.save_dir);
      setUsingDefaultImageDir(settings.using_default_dir);
      setStatus("图片保存目录已更新");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const resetImageSaveDir = async () => {
    setBusy(true);
    setStatus("");
    try {
      const settings = await localApi.saveImageSettings({
        save_dir: "",
        using_default_dir: true,
      });
      setImageSaveDir(settings.save_dir);
      setUsingDefaultImageDir(settings.using_default_dir);
      setStatus("图片保存目录已恢复默认");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const clearAllConversations = async () => {
    if (!window.confirm("Delete all local conversations?")) return;
    setBusy(true);
    setStatus("");
    try {
      await localApi.clearConversations();
      setConversations([]);
      setActiveConversationId(null);
      setExpandedConversationId(null);
      setStatus("所有本机会话已清空");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  const clearImageHistory = async (deleteFiles: boolean) => {
    const message = deleteFiles
      ? "Delete all image history records and local image files?"
      : "Clear image history records? Image files will stay on disk.";
    if (!window.confirm(message)) return;
    setBusy(true);
    setStatus("");
    try {
      await localApi.clearGeneratedImages(deleteFiles);
      setGeneratedImages([]);
      setSelectedImageId(null);
      setStatus(deleteFiles ? "图片历史和本地图片文件已清空" : "图片历史记录已清空");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MuseDock Open</strong>
            <span>Local-first AI client</span>
          </div>
        </div>

        <nav className="nav">
          <button className={view === "chat" ? "active" : ""} onClick={() => setView("chat")}>
            <Bot size={18} />
            Chat
          </button>
          <button className={view === "images" ? "active" : ""} onClick={() => setView("images")}>
            <Image size={18} />
            Images
          </button>
          <button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}>
            <Settings size={18} />
            Settings
          </button>
        </nav>

        <section className="conversation-pane">
          <button className="new-chat" onClick={newConversation}>New chat</button>
          <label className="conversation-search">
            <Search size={15} />
            <input
              aria-label="Search conversations"
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder="Search chats"
              value={conversationSearch}
            />
          </label>
          <div className="conversation-list">
            {filteredConversations.length === 0 && (
              <div className="conversation-empty">
                {conversationSearch.trim() ? "No matching chats" : "No chats yet"}
              </div>
            )}
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conversation-item ${conversation.id === activeConversationId ? "active" : ""}`}
              >
                <button
                  className="conversation-title"
                  onClick={() => {
                    setActiveConversationId(conversation.id);
                    setView("chat");
                  }}
                  title={conversation.title}
                >
                  {conversation.title}
                </button>
                <button
                  className="conversation-action-toggle"
                  onClick={() =>
                    setExpandedConversationId((current) =>
                      current === conversation.id ? null : conversation.id,
                    )
                  }
                  type="button"
                >
                  More
                </button>
                {expandedConversationId === conversation.id && (
                  <div className="conversation-actions">
                    <button onClick={() => renameConversation(conversation)} type="button">
                      Rename
                    </button>
                    <button onClick={() => exportConversation(conversation)} type="button">
                      Export
                    </button>
                    <button className="danger-text" onClick={() => deleteConversation(conversation)} type="button">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="sidebar-footer">
          <div className="meta-row">
            <Bot size={15} />
            <span title={provider.name}>{provider.name || "No provider selected"}</span>
          </div>
          <div className="meta-row">
            <KeyRound size={15} />
            {provider.has_api_key || provider.api_key ? "API key configured" : "API key missing"}
          </div>
          <div className="meta-row">
            <Database size={15} />
            <span title={appDataDir}>{appDataDir || "Local data directory"}</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
          </div>
          {status && (
            <div className="status">
              <span>{status}</span>
              <button onClick={() => setStatus("")} title="Clear status" type="button">
                <X size={14} />
              </button>
            </div>
          )}
        </header>

        {view === "chat" ? (
          <section className="chat-layout">
            <div className="messages">
              {messages.length === 0 && (
                <div className="empty">
                  <Bot size={36} />
                  <h2>开始一个本地对话</h2>
                  <p>配置 Provider 后即可提问。会话会保存到本机数据目录。</p>
                  {!canChat && (
                    <div className="empty-actions">
                      <button
                        onClick={() => {
                          setSettingsSection("provider");
                          setView("settings");
                        }}
                        type="button"
                      >
                        Provider settings
                      </button>
                    </div>
                  )}
                </div>
              )}
              {messages.map((message) => (
                <article key={message.id} className={`message ${message.role}`}>
                  <div className="message-role">
                    {message.role === "user" ? "You" : "MuseDock"}
                    <button onClick={() => copyText(message.content)} title="复制">
                      <Copy size={14} />
                    </button>
                  </div>
                  <MarkdownMessage content={message.content} onCopy={copyText} />
                </article>
              ))}
              {busy && (
                <div className="typing">
                  <Loader2 size={16} className="spin" />
                  Waiting for provider...
                </div>
              )}
            </div>

            <form className="composer" onSubmit={sendMessage}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="输入你的问题..."
                rows={3}
              />
              <button type="submit" disabled={busy || !input.trim()}>
                {busy ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                Send
              </button>
            </form>
          </section>
        ) : view === "images" ? (
          <section className="image-layout">
            <form className="image-tool" onSubmit={generateImages}>
              <label>
                Prompt
                <textarea
                  value={imagePrompt}
                  onChange={(event) => setImagePrompt(event.target.value)}
                  placeholder="描述你想生成的图片..."
                  rows={5}
                />
              </label>
              <div className="image-options">
                <label>
                  Image model
                  <input
                    value={imageModel}
                    onChange={(event) => setImageModel(event.target.value)}
                    placeholder="gpt-image-1"
                  />
                </label>
                <label>
                  Size
                  <select
                    value={imageSize}
                    onChange={(event) => setImageSize(event.target.value)}
                  >
                    <option value="1024x1024">1024x1024</option>
                    <option value="1024x1536">1024x1536</option>
                    <option value="1536x1024">1536x1024</option>
                    <option value="512x512">512x512</option>
                  </select>
                </label>
                <label>
                  Count
                  <input
                    max={4}
                    min={1}
                    onChange={(event) => setImageCount(Number(event.target.value))}
                    type="number"
                    value={imageCount}
                  />
                </label>
              </div>
              <button type="submit" disabled={busy || !imagePrompt.trim()}>
                {busy ? <Loader2 size={18} className="spin" /> : <Image size={18} />}
                Generate
              </button>
            </form>

            <section className="image-history">
              <label className="image-search">
                <Search size={15} />
                <input
                  aria-label="Search generated images"
                  onChange={(event) => setImageSearch(event.target.value)}
                  placeholder="Search images"
                  value={imageSearch}
                />
              </label>
              <div className="image-results">
              {generatedImages.length === 0 ? (
                <div className="empty image-empty">
                  <Image size={36} />
                  <h2>生成图片会保存到本机</h2>
                  <p>Provider 返回 URL 时会先下载，返回 base64 时会直接解码保存。</p>
                  <div className="empty-actions">
                    {provider.has_api_key || provider.api_key ? (
                      <button onClick={chooseImageSaveDir} type="button">
                        Choose folder
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSettingsSection("provider");
                          setView("settings");
                        }}
                        type="button"
                      >
                        Provider settings
                      </button>
                    )}
                  </div>
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="empty image-empty">
                  <Search size={36} />
                  <h2>No matching images</h2>
                  <p>Try searching by prompt, model, file name, or path.</p>
                </div>
              ) : (
                filteredImages.map((image) => (
                  <article className="image-card" key={image.id}>
                    <button
                      className="image-preview-button"
                      onClick={() => setSelectedImageId(image.id)}
                      type="button"
                    >
                      <img src={convertFileSrc(image.path)} alt={image.file_name} />
                    </button>
                    <div>
                      <strong>{image.file_name}</strong>
                      <p title={image.prompt}>{image.prompt}</p>
                      <span>{image.model} / {image.size}</span>
                      <div className="image-card-actions">
                        <button onClick={() => copyText(image.path)} type="button">
                          <Copy size={14} />
                          Copy path
                        </button>
                        <button
                          className="danger-text-button"
                          disabled={busy}
                          onClick={() => deleteGeneratedImage(image)}
                          type="button"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
              </div>
            </section>
          </section>
        ) : (
          <section className="settings-layout">
            <aside className="settings-menu">
              <button
                className={settingsSection === "provider" ? "active" : ""}
                onClick={() => setSettingsSection("provider")}
                type="button"
              >
                <KeyRound size={17} />
                Provider
              </button>
              <button
                className={settingsSection === "chat" ? "active" : ""}
                onClick={() => setSettingsSection("chat")}
                type="button"
              >
                <Bot size={17} />
                Chat
              </button>
              <button
                className={settingsSection === "images" ? "active" : ""}
                onClick={() => setSettingsSection("images")}
                type="button"
              >
                <Image size={17} />
                Images
              </button>
              <button
                className={settingsSection === "data" ? "active" : ""}
                onClick={() => setSettingsSection("data")}
                type="button"
              >
                <Database size={17} />
                Data & Privacy
              </button>
              <button
                className={settingsSection === "about" ? "active" : ""}
                onClick={() => setSettingsSection("about")}
                type="button"
              >
                <Info size={17} />
                About
              </button>
            </aside>

            <div className="settings-panel">
              {settingsSection === "provider" && (
                <>
                  <div className="settings-heading">
                    <h2>Provider</h2>
                    <p>Choose the service MuseDock uses for chat and image requests.</p>
                  </div>
                  <div className="provider-toolbar">
                    <label>
                      Provider profile
                      <select
                        value={provider.id}
                        onChange={(event) => selectProvider(event.target.value)}
                      >
                        {providers.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name || "Unnamed Provider"}
                            {item.is_default ? " (default)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="provider-buttons">
                      <button onClick={addProvider} type="button">
                        <Plus size={17} />
                        Add
                      </button>
                      <button
                        className="danger"
                        onClick={deleteProvider}
                        disabled={busy || providers.length <= 1}
                        type="button"
                      >
                        <Trash2 size={17} />
                        Delete
                      </button>
                    </div>
                  </div>
                  <label>
                    Provider name
                    <input
                      value={provider.name}
                      onChange={(event) => setProvider({ ...provider, name: event.target.value })}
                    />
                  </label>
                  <label>
                    Base URL
                    <input
                      value={provider.base_url}
                      onChange={(event) => setProvider({ ...provider, base_url: event.target.value })}
                      placeholder="https://api.openai.com/v1"
                    />
                  </label>
                  <label>
                    API Key
                    <input
                      value={provider.api_key}
                      onChange={(event) => setProvider({ ...provider, api_key: event.target.value })}
                      type="password"
                      placeholder={provider.has_api_key ? "Saved in system keychain" : "sk-..."}
                    />
                  </label>
                  {provider.has_api_key && !provider.api_key && (
                    <p className="key-status">已保存的 API Key 不会明文回填。输入新 Key 可覆盖。</p>
                  )}
                  <label className="checkbox-row">
                    <input
                      checked={provider.is_default}
                      onChange={(event) => setProvider({ ...provider, is_default: event.target.checked })}
                      type="checkbox"
                    />
                    Use as default provider
                  </label>
                  <div className="actions">
                    <button onClick={saveProvider} disabled={busy} type="button">
                      <Check size={18} />
                      Save
                    </button>
                    <button onClick={testProvider} disabled={busy} type="button">
                      {busy ? <Loader2 size={18} className="spin" /> : <Bot size={18} />}
                      Test
                    </button>
                    <button className="danger" onClick={clearApiKey} disabled={busy || !provider.has_api_key} type="button">
                      Clear key
                    </button>
                  </div>
                </>
              )}

              {settingsSection === "chat" && (
                <>
                  <div className="settings-heading">
                    <h2>Chat</h2>
                    <p>Set the chat model for the selected provider.</p>
                  </div>
                  <label>
                    Chat model
                    <input
                      value={provider.chat_model}
                      onChange={(event) => setProvider({ ...provider, chat_model: event.target.value })}
                      placeholder="gpt-4.1-mini"
                    />
                  </label>
                  <div className="settings-summary">
                    <strong>Current provider</strong>
                    <span>{provider.name || "Unnamed Provider"}</span>
                  </div>
                  <div className="actions">
                    <button onClick={saveProvider} disabled={busy} type="button">
                      <Check size={18} />
                      Save
                    </button>
                  </div>
                </>
              )}

              {settingsSection === "images" && (
                <>
                  <div className="settings-heading">
                    <h2>Images</h2>
                    <p>Set the default image model and size used by the Images page.</p>
                  </div>
                  <div className="settings-summary">
                    <strong>Save folder</strong>
                    <span title={imageSaveDir}>{imageSaveDir || "Resolving default folder..."}</span>
                    <em>{usingDefaultImageDir ? "Default app data folder" : "Custom folder"}</em>
                    <div className="inline-actions">
                      <button onClick={chooseImageSaveDir} disabled={busy} type="button">
                        Choose folder
                      </button>
                      <button onClick={() => openLocalPath(imageSaveDir)} disabled={!imageSaveDir} type="button">
                        Open folder
                      </button>
                      <button onClick={resetImageSaveDir} disabled={busy || usingDefaultImageDir} type="button">
                        Use default
                      </button>
                    </div>
                  </div>
                  <label>
                    Image model
                    <input
                      value={imageModel}
                      onChange={(event) => setImageModel(event.target.value)}
                      placeholder="gpt-image-1"
                    />
                  </label>
                  <label>
                    Default size
                    <select
                      value={imageSize}
                      onChange={(event) => setImageSize(event.target.value)}
                    >
                      <option value="1024x1024">1024x1024</option>
                      <option value="1024x1536">1024x1536</option>
                      <option value="1536x1024">1536x1024</option>
                      <option value="512x512">512x512</option>
                    </select>
                  </label>
                  <label>
                    Default count
                    <input
                      max={4}
                      min={1}
                      onChange={(event) => setImageCount(Number(event.target.value))}
                      type="number"
                      value={imageCount}
                    />
                  </label>
                  <p className="note">New images are saved to the selected folder. Existing image history keeps its original file paths.</p>
                </>
              )}

              {settingsSection === "data" && (
                <>
                  <div className="settings-heading">
                    <h2>Data & Privacy</h2>
                    <p>Review where MuseDock stores local data and what is kept out of normal files.</p>
                  </div>
                  <div className="data-list">
                    <div>
                      <strong>Local backup</strong>
                      <div className="data-actions">
                        <button onClick={exportLocalBackup} disabled={busy} type="button">
                          Export backup
                        </button>
                        <button onClick={importLocalBackup} disabled={busy} type="button">
                          Import backup
                        </button>
                      </div>
                      <span>Exports or imports provider metadata, conversations, image history, and image settings. API keys are not included.</span>
                    </div>
                    <div>
                      <strong>App data directory</strong>
                      <div className="data-actions">
                        <button onClick={() => copyText(appDataDir)} type="button">Copy path</button>
                        <button onClick={() => openLocalPath(appDataDir)} type="button">Open</button>
                      </div>
                      <span title={appDataDir}>{appDataDir || "Not resolved yet"}</span>
                    </div>
                    <div>
                      <strong>Exports</strong>
                      <div className="data-actions">
                        <button onClick={() => copyText(exportsDir)} type="button">Copy path</button>
                        <button onClick={() => openLocalPath(exportsDir)} type="button">Open</button>
                      </div>
                      <span title={exportsDir}>{exportsDir || "Not resolved yet"}</span>
                    </div>
                    <div>
                      <strong>Provider profiles</strong>
                      <span>Saved in providers.json without API keys.</span>
                    </div>
                    <div>
                      <strong>API keys</strong>
                      <span>Saved in the system keychain per provider.</span>
                    </div>
                    <div>
                      <strong>Conversations</strong>
                      <div className="data-actions">
                        <button onClick={clearAllConversations} disabled={busy || conversations.length === 0} type="button">
                          Clear
                        </button>
                      </div>
                      <span>{conversations.length} local conversation{conversations.length === 1 ? "" : "s"}.</span>
                    </div>
                    <div>
                      <strong>Generated images</strong>
                      <div className="data-actions">
                        <button onClick={() => copyText(imageSaveDir)} type="button">Copy folder</button>
                        <button onClick={() => openLocalPath(imageSaveDir)} type="button">Open</button>
                        <button onClick={() => clearImageHistory(false)} disabled={busy || generatedImages.length === 0} type="button">
                          Clear history
                        </button>
                        <button className="danger" onClick={() => clearImageHistory(true)} disabled={busy || generatedImages.length === 0} type="button">
                          Delete files
                        </button>
                      </div>
                      <span>{generatedImages.length} local image record{generatedImages.length === 1 ? "" : "s"}. New files save to {imageSaveDir || "the default image folder"}.</span>
                    </div>
                  </div>
                </>
              )}

              {settingsSection === "about" && (
                <>
                  <div className="settings-heading">
                    <h2>About</h2>
                    <p>MuseDock is a local-first desktop client for user-owned AI providers.</p>
                  </div>
                  <div className="data-list">
                    <div>
                      <strong>Version</strong>
                      <span>{appVersion}</span>
                    </div>
                    <div>
                      <strong>Release</strong>
                      <div className="data-actions">
                        <button onClick={() => copyText(releaseUrl)} type="button">Copy link</button>
                      </div>
                      <span>{releaseUrl}</span>
                    </div>
                    <div>
                      <strong>License</strong>
                      <span>MIT</span>
                    </div>
                    <div>
                      <strong>Privacy model</strong>
                      <span>Requests go directly to your configured Provider. API keys stay in the system keychain.</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>
      {selectedImage && (
        <div className="image-detail-backdrop" role="presentation" onClick={() => setSelectedImageId(null)}>
          <section className="image-detail" role="dialog" aria-modal="true" aria-label="Image details" onClick={(event) => event.stopPropagation()}>
            <div className="image-detail-preview">
              <img src={convertFileSrc(selectedImage.path)} alt={selectedImage.file_name} />
            </div>
            <div className="image-detail-body">
              <div className="image-detail-header">
                <div>
                  <h2>{selectedImage.file_name}</h2>
                  <p>{selectedImage.model} / {selectedImage.size}</p>
                </div>
                <button onClick={() => setSelectedImageId(null)} title="Close" type="button">
                  <X size={18} />
                </button>
              </div>
              <label>
                Prompt
                <textarea readOnly rows={7} value={selectedImage.prompt} />
              </label>
              <div className="image-detail-meta">
                <strong>Path</strong>
                <span title={selectedImage.path}>{selectedImage.path}</span>
                <strong>Created</strong>
                <span>{selectedImage.created_at}</span>
              </div>
              <div className="image-detail-actions">
                <button
                  onClick={() => {
                    setImagePrompt(selectedImage.prompt);
                    setImageModel(selectedImage.model);
                    setImageSize(selectedImage.size);
                    setSelectedImageId(null);
                    setView("images");
                    setStatus("Prompt 已放入生成框");
                  }}
                  type="button"
                >
                  <Image size={14} />
                  Use prompt
                </button>
                <button onClick={() => copyText(selectedImage.path)} type="button">
                  <Copy size={14} />
                  Copy path
                </button>
                <button onClick={() => openLocalPath(selectedImage.path)} type="button">
                  <Image size={14} />
                  Open file
                </button>
                <button className="danger" disabled={busy} onClick={() => deleteGeneratedImage(selectedImage)} type="button">
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function makeTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "New chat";
  return normalized.length > 28 ? `${normalized.slice(0, 28)}...` : normalized;
}

function settingsDescription(section: SettingsSection) {
  switch (section) {
    case "provider":
      return "Connect MuseDock to the AI service you want to use.";
    case "chat":
      return "Choose the model used for conversations.";
    case "images":
      return "Set simple defaults for image generation.";
    case "data":
      return "Review local files, key storage, and privacy boundaries.";
    case "about":
      return "Version, release, license, and project information.";
  }
}

function updateAssistantMessage(
  conversation: Conversation,
  messageId: string,
  content: string,
): Conversation {
  return {
    ...conversation,
    messages: conversation.messages.map((message) =>
      message.id === messageId ? { ...message, content } : message,
    ),
    updated_at: new Date().toISOString(),
  };
}

function MarkdownMessage({
  content,
  onCopy,
}: {
  content: string;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className } = props;
            const text = String(children).replace(/\n$/, "");
            const isInline = !className;
            if (isInline) {
              return <code className="inline-code">{children}</code>;
            }
            const language = className?.replace("language-", "") || "text";
            return (
              <div className="code-block">
                <div className="code-toolbar">
                  <span>{language}</span>
                  <button onClick={() => onCopy(text)} type="button">
                    <Copy size={13} />
                    Copy
                  </button>
                </div>
                <pre>
                  <code className={className}>{children}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {content || " "}
      </ReactMarkdown>
    </div>
  );
}
