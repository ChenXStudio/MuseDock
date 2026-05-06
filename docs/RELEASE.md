# Release Guide

This guide describes how to build MuseDock Open for local testing and GitHub releases.

## Current Release Scope

Version: `0.1.0`

Release status: pre-release candidate.

Supported package targets to verify:

- macOS: `.app` and `.dmg`
- Windows: NSIS installer or MSI, built on Windows

Not included yet:

- Code signing
- macOS notarization
- Automatic updates
- Cross-platform CI build matrix

## Before Building

Run from the repository root:

```bash
npm install
npm run build
```

Run Rust checks:

```bash
cd src-tauri
cargo check
cargo fmt --check
cd ..
```

## macOS Build

Build locally on macOS:

```bash
npm run tauri:build
```

Expected output directory:

```text
src-tauri/target/release/bundle/
```

Typical artifacts:

- `macos/MuseDock Open.app`
- `dmg/MuseDock Open_0.1.0_*.dmg`

Because signing and notarization are not configured, macOS may show a warning when opening the app. For a public release, sign and notarize before distributing widely.

## Windows Build

Build on a Windows machine. Do not expect Windows installer output from a macOS build.

Recommended setup:

- Node.js 18 or newer
- Rust stable MSVC toolchain
- Microsoft Visual Studio Build Tools
- WebView2 Runtime
- Tauri v2 prerequisites

Install dependencies:

```powershell
npm install
```

Build:

```powershell
npm run tauri:build
```

Expected output directory:

```text
src-tauri\target\release\bundle\
```

Typical artifacts:

- `nsis\MuseDock Open_0.1.0_x64-setup.exe`
- `msi\MuseDock Open_0.1.0_x64_en-US.msi`

Windows signing is not configured yet. Unsigned installers may trigger SmartScreen warnings.

## Icon Assets

Icon source:

```text
src-tauri/icons/icon-source.svg
```

Configured bundle icons:

```text
src-tauri/icons/32x32.png
src-tauri/icons/128x128.png
src-tauri/icons/128x128@2x.png
src-tauri/icons/icon.icns
src-tauri/icons/icon.ico
```

If the source icon changes, regenerate all platform icon files before release.

## GitHub Release Checklist

- Confirm version in `package.json`.
- Confirm version in `src-tauri/tauri.conf.json`.
- Update `CHANGELOG.md`.
- Run `npm run build`.
- Run `cargo check` in `src-tauri`.
- Run `cargo fmt --check` in `src-tauri`.
- Run `npm run tauri:build` on macOS.
- Run `npm run tauri:build` on Windows before publishing Windows artifacts.
- Smoke test Provider save and API key storage.
- Smoke test chat streaming.
- Smoke test image generation and image history.
- Upload artifacts to a GitHub pre-release.

## Release Note Template

The current `v0.1.0` release note draft is in:

```text
docs/releases/v0.1.0.md
```

```markdown
## MuseDock Open v0.1.0

Initial pre-release of MuseDock Open, a local-first desktop AI client for user-owned OpenAI-compatible providers.

### Highlights

- Local chat with streaming responses.
- Multiple provider profiles.
- API keys stored in the system keychain.
- Local conversation history.
- Local image generation and image history.

### Known Limitations

- Unsigned builds may show OS security warnings.
- macOS notarization is not configured.
- Windows signing is not configured.
- Auto-update is not configured.
```
