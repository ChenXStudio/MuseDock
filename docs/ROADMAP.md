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
