# Release and packaging process

No step in this document authorizes a push, GitHub release, store upload, or publication.

## Build locally

1. Confirm `manifest.json` and `package.json` have the same version.
2. Run `npm test`.
3. Run `npm run package`.
4. Inspect `dist/CONTENTS.txt` and `dist/SHA256SUMS`.
5. Run `unzip -t` against both generated ZIP files.
6. Extract each ZIP to a temporary directory and load it unpacked in current stable Chrome and Edge.

The packaging script uses an explicit runtime allowlist, rejects missing files and symlinks, normalizes entry timestamps, strips ZIP metadata, and produces identical Chrome and Edge payloads. Tests, documentation, Git files, local artifacts, and source maps are excluded.

## Browser QA matrix

- Install prompt and safer per-site permission request
- Classic workflow all-site permission request and reversal
- Ordinary sites in Standard mode
- Restrictive X-Frame-Options and CSP pages in Compatibility mode
- Clear failure on JavaScript frame busting, anti-bot, authentication, and unsupported browser pages
- Absolute synchronized scrolling and nested scrollers
- URL parity in both directions, path-only and query/fragment opt-in
- Blink mode with pointer and keyboard
- Visible and full-page capture, failure status, cancel, and state restoration
- Responsive presets, custom size, max height, and reflow
- Shopify profile behavior
- End, close, navigation-away, initialization-failure, and service-worker-restart teardown
- No remaining session DNR rules after teardown

## Publication gate

Before any store submission, approve the final public privacy URL, support destination, listing screenshots, listing copy, browser QA report, and uploaded package checksums. Source code is released under the MIT License. Publication remains a separate explicit action.
