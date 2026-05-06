# MuseDock Open

MuseDock Open is a local-first desktop AI client. Users bring their own OpenAI-compatible API key, configure providers locally, and run chat and image generation without a MuseDock-hosted backend.

The app is built as a standalone Tauri desktop client with a React frontend and a Rust command layer that acts as the local backend.

## Features

- ChatGPT-like chat interface.
- Streaming chat output through OpenAI-compatible `/chat/completions`.
- Markdown rendering with tables, lists, and copyable code blocks.
- Local conversation history with create, rename, and delete actions.
- Conversation export to Markdown.
- Multiple provider profiles.
- Provider-specific API keys stored in the system keychain.
- OpenAI-compatible `/images/generations` support.
- Generated images saved to the local app data directory.
- Generated image history persisted locally.
- Optional custom folder for newly generated images.

## Privacy Model

MuseDock Open does not require a MuseDock server.

- Chat and image requests are sent from your device to the provider you configure.
- Provider metadata is stored locally in `providers.json`.
- API keys are stored in the operating system keychain, not in `providers.json`.
- Conversations are stored locally in `conversations.json`.
- Generated images are saved locally under `generated-images`.
- Generated image metadata is stored locally in `generated-images.json`.
- The app does not add telemetry or analytics.

See [PRIVACY.md](./PRIVACY.md) for details.

## Requirements

- Node.js 18 or newer.
- Rust stable toolchain.
- Tauri v2 system dependencies for your platform.

For Tauri platform setup, follow the official Tauri prerequisites for your operating system.

## Development

Install dependencies:

```bash
npm install
```

Run the desktop app in development mode:

```bash
npm run tauri dev
```

Run the frontend only:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

Check the Rust backend:

```bash
cd src-tauri
cargo check
```

## Provider Setup

Use an OpenAI-compatible endpoint.

Example:

- Base URL: `https://api.openai.com/v1`
- Chat model: `gpt-4.1-mini`
- Image model: `gpt-image-1`

The app currently calls:

- `POST /chat/completions`
- `POST /images/generations`

For image generation, providers may return either `b64_json` or `url`. URL results are downloaded and saved locally.

## Local Data

The exact app data path is shown in the app sidebar.

Common locations:

- macOS: `~/Library/Application Support/app.musedock.open`
- Windows: `%APPDATA%/app.musedock.open`
- Linux: `~/.local/share/app.musedock.open`

Files:

- `providers.json`: provider profile metadata. API keys are not stored here.
- `provider.json`: legacy single-provider metadata, read for compatibility.
- `conversations.json`: local chat history.
- `generated-images.json`: local generated image history metadata.
- `image-settings.json`: image save folder preference.
- `generated-images/`: locally saved generated images.
- `exports/`: Markdown conversation exports.

To reset local app data, quit the app and remove the app data directory. API keys may also need to be removed from the system keychain.

## Release Build

See [docs/RELEASE.md](./docs/RELEASE.md) for the full macOS and Windows release process.

Create a desktop bundle:

```bash
npm run tauri:build
```

Build output is written under `src-tauri/target/release/bundle`.

Current release notes:

- macOS signing and notarization are not configured yet.
- Auto-update is not configured yet.
- Windows and Linux builds should be verified on their target platforms before release.

## Verification Checklist

Before publishing a release:

- Provider can be saved, switched, and deleted.
- Default provider survives app restart.
- API key is not written to `providers.json`.
- Chat streams responses.
- Markdown and code blocks render correctly.
- Conversations survive app restart.
- Image generation saves files under `generated-images`.
- Image history survives app restart.
- `npm run build` passes.
- `cargo check` passes in `src-tauri`.
- `cargo fmt --check` passes in `src-tauri`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

MIT. See [LICENSE](./LICENSE).
