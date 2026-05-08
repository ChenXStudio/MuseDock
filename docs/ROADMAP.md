# MuseDock Open Roadmap

This roadmap belongs to the standalone open-source desktop app in this directory.

## Task 1: Local Chat Scaffold

Status: done.

- Tauri + React + TypeScript project.
- Local Rust command layer.
- Provider config saved locally.
- OpenAI-compatible `/chat/completions` call.
- ChatGPT-like first UI.

## Task 2: Secret Storage

Status: done.

Move API keys out of plain local JSON.

Options to evaluate:

- OS keychain.
- Tauri Stronghold.
- Explicit development fallback for local JSON.

Acceptance:

- API key is not exported with normal config.
- API key is not logged.
- User can clear stored key.

## Task 3: Local Conversation Persistence

Status: done.

Persist chat history.

Acceptance:

- Conversations survive app restart.
- User can create, rename, delete conversations.
- Messages are stored locally.

## Task 4: Streaming Output

Status: done.

Add ChatGPT-like streaming.

Acceptance:

- Assistant response appears incrementally.
- User can stop generation.
- Partial response state is handled clearly.

## Task 5: Markdown UX

Status: done.

Improve chat rendering.

Acceptance:

- Markdown is rendered.
- Code blocks are readable.
- Code blocks have copy buttons.

## Task 6: Multi-Provider Settings

Status: done.

Support multiple provider profiles.

Acceptance:

- User can add/delete providers.
- User can select default provider.
- User can switch the active Provider before sending a conversation.
- Provider API keys are stored separately in the system keychain.

## Task 7: Local Image Generation

Status: done.

Add image generation with user-owned API key.

Acceptance:

- Supports OpenAI-compatible image endpoint.
- Saves generated files locally.
- Does not rely on remote temporary image URLs.

## Task 8: Open Source Readiness

Status: done.

Prepare for public release.

Acceptance:

- License selected.
- README expanded.
- Contributing guide added.
- Privacy note added.
- Release build instructions added.

## Phase 2: Release Readiness

Phase 2 prepares MuseDock Open for downloadable pre-release builds.

## Task 9: App Identity & Icon

Status: done.

Acceptance:

- App name remains `MuseDock Open`.
- App identifier remains `app.musedock.open`.
- Version remains `0.1.0`.
- macOS `.icns` icon is configured.
- Windows `.ico` icon is configured.
- Icon source is kept in the repository.

## Task 10: Release Build Documentation

Status: done.

Acceptance:

- `CHANGELOG.md` added.
- `docs/RELEASE.md` added.
- macOS build steps documented.
- Windows build steps reserved and documented.
- Unsigned build limitations documented.
- Local macOS `.app` and `.dmg` build verified.

## Task 11: GitHub Project Hygiene

Status: done.

Acceptance:

- Bug report issue template added.
- Feature request issue template added.
- Provider compatibility issue template added.
- Pull request template added.
- Release note template added.
- GitHub label suggestions documented.

## Task 12: First Pre-release Preparation

Status: done.

Acceptance:

- `v0.1.0` release note draft prepared.
- macOS `.dmg` artifact confirmed.
- Windows artifact marked pending until built on Windows.
- `v0.1.0` tag created and pushed.
- GitHub pre-release created.
- macOS `.dmg` uploaded.

## Phase 3: Product UX

Phase 3 improves everyday usability without exposing advanced AI parameters in the main flow.

## Task 13: Settings Information Architecture

Status: done.

Acceptance:

- Settings split into Provider, Chat, Images, and Data & Privacy sections.
- Provider setup remains the primary path for API key and endpoint configuration.
- Chat settings keep only the model field.
- Image settings keep simple generation defaults.
- Data & Privacy shows local storage and key handling boundaries.

## Task 14: Conversation Search

Status: done.

Acceptance:

- Sidebar has a simple conversation search field.
- Search matches conversation titles.
- Search matches local message content.
- Empty search results are shown without changing stored conversations.

## Task 15: Conversation Markdown Export

Status: done.

Acceptance:

- User can export a conversation from the sidebar.
- Exported file is Markdown.
- Export is written to the local app data directory.
- API keys and provider secrets are not included.

## Task 16: Configurable Image Save Folder

Status: done.

Acceptance:

- Image settings show the current save folder.
- User can choose a custom image save folder.
- User can return to the default image folder.
- New generated images use the configured folder.
- Existing image history keeps original paths.

## Task 17: Image History Detail Preview

Status: done.

Acceptance:

- User can open a generated image from the image history.
- Detail view shows a larger image preview.
- Detail view shows full prompt, model, size, path, and created time.
- User can copy the image path from the detail view.
- User can delete the image from the detail view.

## Task 18: Chat Composer Keyboard Flow

Status: done.

Acceptance:

- Pressing Enter sends the current chat message.
- Pressing Shift+Enter keeps a newline.
- Empty messages are not submitted.
- Existing send button behavior is unchanged.

## Task 19: Generation Error Context

Status: done.

Acceptance:

- Failed chat generation leaves an assistant message in the conversation.
- Partial streamed content is preserved when a stream fails.
- The top status still shows the provider error.
- Image generation failures do not modify existing image history.

## Task 20: Image History Search

Status: done.

Acceptance:

- Images page has a simple image history search field.
- Search matches prompt, model, file name, size, and path.
- Empty search results are shown without changing image history.

## Task 21: Reuse Image Prompt

Status: done.

Acceptance:

- Image detail view has a simple reuse action.
- Reuse action copies the previous prompt into the generator.
- Reuse action restores the previous model and size.
- Existing image history is unchanged.

## Task 22: Compact Conversation Actions

Status: done.

Acceptance:

- Conversation list shows a cleaner default item state.
- Rename, export, and delete actions are grouped behind a More toggle.
- Existing conversation actions still work.

## Task 23: Clear Settings Navigation

Status: done.

Acceptance:

- Main navigation uses `Settings` for the settings area.
- Provider setup remains the first settings section.

## Task 24: Empty State Shortcuts

Status: done.

Acceptance:

- Chat empty state links to Provider settings when chat is not ready.
- Images empty state links to Provider settings when API key is missing.
- Images empty state can open folder selection when Provider is ready.

## Task 25: Sidebar Provider Visibility

Status: done.

Acceptance:

- Sidebar footer shows the active Provider name.
- API key status remains visible.

## Task 26: Dismissible Status Messages

Status: done.

Acceptance:

- Status messages can be cleared manually.
- Long status text remains contained in the top bar.

## Task 27: Remember Last View

Status: done.

Acceptance:

- App remembers the last main view.
- App remembers the last settings section.
- No prompts, API keys, or model responses are stored for this preference.

## Task 28: Local Folder Shortcuts

Status: done.

Acceptance:

- Data & Privacy can open the app data folder.
- Data & Privacy can open the exports folder.
- Data & Privacy can open the current image save folder.
- Folder paths can still be copied.

## Task 29: Open Generated Image File

Status: done.

Acceptance:

- Image detail view can open the generated image file in the operating system.
- Existing copy path and delete actions remain available.

## Task 30: Clear Local Conversations

Status: done.

Acceptance:

- Data & Privacy can clear all local conversations.
- Clearing conversations does not affect Provider profiles or API keys.

## Task 31: Clear Image History

Status: done.

Acceptance:

- Data & Privacy can clear generated image history records.
- User can choose whether to keep image files on disk.
- Clearing image history does not affect Provider profiles or API keys.

## Task 32: About Settings Section

Status: done.

Acceptance:

- Settings includes an About section.
- About shows app version, release link, license, and privacy model.
- Release link can be copied.

## Task 33: Image Detail Keyboard Close

Status: done.

Acceptance:

- Esc closes the image detail view.
- Deleting an image from detail view selects a nearby image when available.

## Task 34: Local Backup Export

Status: done.

Acceptance:

- Data & Privacy can export a local JSON backup.
- Backup includes provider metadata, conversations, image history, and image settings.
- Backup excludes API keys and keychain secrets.

## Task 35: Local Backup Import

Status: done.

Acceptance:

- Data & Privacy can import a local JSON backup.
- Import replaces provider metadata, conversations, image history, and image settings.
- Import does not import, delete, or overwrite API keys in the system keychain.
- App state refreshes after import.
