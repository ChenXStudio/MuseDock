# Changelog

All notable changes to MuseDock Open will be documented in this file.

## Unreleased

### Added

- Settings split into Provider, Chat, Images, Data & Privacy, and About sections.
- Conversation search.
- Conversation Markdown export.
- Configurable image save folder.
- Image history detail preview.
- Image history search.
- Reuse prompt action from image history.
- Local folder shortcuts for app data, exports, and generated images.
- Local cleanup actions for conversations and image history.
- Local JSON backup export and import without API keys.
- Stop action for streaming chat generation.
- API Key visibility toggle in Provider settings.
- Dismissible status messages.
- Last view and settings section persistence.

### Changed

- Chat composer now sends with Enter and inserts new lines with Shift+Enter.
- Conversation item actions are grouped behind a compact More toggle.
- Main navigation uses Settings instead of Provider.
- Sidebar shows the active Provider name.

### Fixed

- Failed chat generations now leave visible error context in the conversation.

## 0.1.0 - 2026-05-06

Initial pre-release candidate. See [docs/releases/v0.1.0.md](./docs/releases/v0.1.0.md) for release notes and artifact details.

### Added

- Local-first Tauri desktop app.
- OpenAI-compatible chat.
- Streaming chat output.
- Markdown rendering with copyable code blocks.
- Local conversation persistence.
- Multiple provider profiles.
- Provider-specific API key storage through the system keychain.
- OpenAI-compatible image generation.
- Local generated image saving and image history.
- Open source project documentation.
- macOS and Windows icon assets for release builds.

### Notes

- App signing is not configured.
- macOS notarization is not configured.
- Windows signing is not configured.
- Auto-update is not configured.
