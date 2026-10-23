# GitHub download release

Parity Scrollr ships as browser ZIP downloads through GitHub. A browser-store submission or hosted application is outside the current release scope. Remote Git writes, history consolidation, and release publication require separate authorization.

## Build locally

1. Confirm `manifest.json` and `package.json` have the same version.
2. Run `npm test`.
3. Run `npm run package`.
4. Inspect `dist/CONTENTS.txt` and `dist/SHA256SUMS`.
5. Run `unzip -t` against both generated ZIP files.
6. Extract each ZIP to a temporary directory and load it unpacked in current stable Chrome and Edge.
7. Confirm that `INSTALL.md`, `LICENSE`, and the font license are included, and follow the install and update instructions from the extracted package.

The packaging script uses an explicit runtime allowlist, rejects missing files and symlinks, normalizes entry timestamps, strips ZIP metadata, and produces identical Chrome and Edge payloads. Tests, documentation, Git files, local artifacts, and source maps are excluded.

## Browser QA matrix

Record pass, fail, or unverified for each item. Failed or unverified items block production signoff unless explicitly removed from scope.

- Install prompt and safer per-site permission request
- Classic workflow all-site permission request and reversal
- Ordinary sites in Standard mode
- Normal ready pages cause no Compatibility retry. A non-ready page triggers one automatic retry after 15 seconds; concurrent timeouts are coalesced, already-ready panes stay untouched, local-image errors do not trigger it, and preparation failures stop with a manual recovery action.
- Restrictive X-Frame-Options and CSP pages load after the fallback, or show a terminal warning without another automatic retry
- Clear failure on JavaScript frame busting, anti-bot, authentication, and unsupported browser pages
- Absolute synchronized scrolling and nested scrollers
- URL parity in both directions, path-only and query/fragment opt-in
- Blink mode with pointer and keyboard
- Visible and full-page capture, failure status, cancel, and state restoration
- Responsive presets, custom size, max height, and reflow
- Independent panes retain their own positions after reflow; Back to top followed by resize stays at the top
- Comparison refresh restores website and image sessions, including after Compatibility retry
- Toolbar wrapping, More options, popup options, onboarding, settings, help, support, privacy, focus order, Escape, and 200% zoom
- Saved implementation URL is removed immediately when retention is disabled or safer defaults are restored
- Visible nested main-area containers capture correctly, including a container in one pane and document scrolling in the other. Containers partly outside the page viewport produce an actionable warning without downloading an incomplete image
- Automatic Shopify preview-bar detection without a profile setting, including restoration after success, failure, and cancellation
- Local design image import, one-site permission request, authored-width warning, synchronized scroll, captures, and image removal on End or tab close
- End, close, navigation-away, initialization-failure, and service-worker-restart teardown
- No remaining session DNR rules after teardown

## Publication gate

1. Complete the installed-browser matrix and record browser versions and evidence.
2. If consolidating history, finish and verify that operation before building the final release packages.
3. Approve the source commit, version, release notes, browser QA report, and package checksums.
4. Create the version tag and GitHub release. Attach the Chrome ZIP, Edge ZIP, `SHA256SUMS`, and `CONTENTS.txt` from that validated build.
5. Download the uploaded packages, verify their checksums, and follow the packaged installation instructions.
6. Point the portfolio CTA to the verified release or the repository's releases page. Match its displayed version and screenshots to the published package.

The validation workflow runs tests and packages downloadable CI artifacts. It has read-only repository permissions and does not publish releases. CI artifacts are not public release assets. Source is available under the MIT License.

Store listing drafts are retained for possible future distribution; their publication requirements are not gates for the GitHub download release.
