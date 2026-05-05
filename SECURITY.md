# Security

## Supported Versions

MuseDock Open is currently pre-release software. Security fixes are handled on the latest development version.

## Reporting a Vulnerability

If you find a vulnerability, please open a private report through the repository security reporting feature if available. If private reporting is not available, open an issue with a minimal description and avoid posting secrets, API keys, or exploit details publicly.

Useful information to include:

- Operating system and version.
- MuseDock Open version or commit.
- Affected feature.
- Reproduction steps.
- Impact.

## Secret Handling

API keys must not be stored in normal project files or local JSON config.

Current behavior:

- Provider metadata is stored in `providers.json`.
- API keys are stored through the operating system keychain.
- Chat and image requests are sent directly to the configured provider.

## Security Boundaries

MuseDock Open does not currently provide:

- Sandboxed plugin execution.
- End-to-end encryption for local conversation files.
- Automatic update signing.
- macOS notarization.
- Hosted account authentication.

Treat local app data as sensitive if prompts, responses, or generated images contain private information.
