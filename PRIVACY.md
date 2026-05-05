# Privacy

MuseDock Open is designed as a local-first desktop app.

## What Stays Local

- Provider profiles are stored in the app data directory.
- API keys are stored in the operating system keychain.
- Chat conversations are stored in the app data directory.
- Generated images are saved in the app data directory.

## What Leaves Your Device

When you send a chat message or generate an image, the request is sent directly to the provider configured in the app.

Depending on your provider, these requests may include:

- Your prompt.
- Conversation context included in the request.
- Model name.
- Image generation parameters.

MuseDock Open does not proxy these requests through a MuseDock server.

## API Keys

API keys are not written to `providers.json`.

They are stored through the operating system keychain:

- macOS Keychain.
- Windows Credential Manager.
- Linux Secret Service, depending on the desktop environment.

The app can clear a saved provider key from the settings screen.

## Local Files

The app data directory is shown in the app sidebar.

Common locations:

- macOS: `~/Library/Application Support/app.musedock.open`
- Windows: `%APPDATA%/app.musedock.open`
- Linux: `~/.local/share/app.musedock.open`

Files may include:

- `providers.json`
- `conversations.json`
- `generated-images/`

## Telemetry

MuseDock Open does not include telemetry, analytics, crash reporting, or usage tracking.

## Deleting Data

To delete local data:

1. Quit MuseDock Open.
2. Delete the app data directory.
3. Remove saved API keys from the system keychain if needed.

Deleting local files does not delete data held by your configured AI provider.
