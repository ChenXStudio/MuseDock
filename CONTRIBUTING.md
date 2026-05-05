# Contributing

Thanks for considering a contribution to MuseDock Open.

## Project Direction

MuseDock Open is a local-first desktop client. Contributions should preserve these boundaries:

- Users bring their own provider and API key.
- The app should not require a MuseDock-hosted backend.
- API keys must not be written to normal config files.
- Local data behavior should be explicit and easy to audit.

## Development Setup

```bash
npm install
npm run tauri dev
```

Useful checks:

```bash
npm run build
cd src-tauri
cargo check
cargo fmt --check
```

## Code Style

- Keep frontend changes consistent with the existing React and CSS structure.
- Keep Tauri commands small and explicit.
- Prefer structured JSON parsing over ad hoc string parsing.
- Avoid logging API keys, prompts, model responses, or generated image contents.
- Keep provider-specific behavior behind clear options instead of hard-coding one service.

## Pull Request Checklist

- Describe the user-facing change.
- Include manual verification steps.
- Run `npm run build`.
- Run `cargo check` in `src-tauri`.
- Run `cargo fmt --check` in `src-tauri`.
- Update README or docs when behavior changes.

## Feature Scope

Good first areas:

- Provider compatibility fixes.
- Import/export for local data.
- Image history persistence.
- Release build documentation.
- Accessibility and keyboard navigation.

Changes that need extra discussion:

- Hosted backend integration.
- Telemetry or analytics.
- Automatic updates.
- Plugin execution or arbitrary local command execution.
