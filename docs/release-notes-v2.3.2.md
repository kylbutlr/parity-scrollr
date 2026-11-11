# Parity Scrollr v2.3.2

- Fix first-time comparison launch when Chrome closes the popup during its native site-permission prompt. The reviewed comparison is saved before requesting access, and the background worker opens it only after the required grants are present.
- Allocate comparison rule IDs independently of Chrome tab IDs, preventing initialization failures in profiles with large tab IDs. Active comparisons retain separate rule IDs, and closing one comparison preserves the others.
- Preserve remembered-URL preferences through popup closure and keep denied permission requests retryable.

No new permissions or styling changes. App Stylr remains pinned to v1.4.1.

## Installation and updates

Download and extract the Chrome or Edge ZIP. Use Developer mode and **Load unpacked** for a fresh installation. For an update, end comparisons, replace the files in the same installation folder, then select Reload on the extension card. Follow [installation and updates](../INSTALL.md). Existing versioned downloads are not replaced.

Verify the ZIP with its release's `SHA256SUMS`. A GitHub download is a manual update, not a browser-store automatic update.

## Verification scope

All 20 automated checks passed, including regressions for popup destruction during permission approval, denial/retry, duplicate permission events, image persistence, large tab IDs, simultaneous comparisons, and isolated cleanup.

The fixed native flow passed in Google Chrome for Testing 151.0.7922.34 using a fresh disposable profile and fictional website fixtures. Actual toolbar and native permission-sheet clicks opened both comparison frames. Synchronized scrolling, Blink, a 390px CSS viewport, visible PNG capture, and removal of comparison state, grants, scripts and rules on End passed.

The release owner approved publishing this patch after that focused verification. This is not a complete browser/device matrix: stable Edge installation, same-folder update/browser-restart persistence, restrictive-site Compatibility behavior, full-page stitching, image-mode native flows, and the full accessibility matrix remain outside this patch's verified scope. Unit coverage does not substitute for those installed-browser checks.

See [v2.3.2 verification](release-verification-v2.3.2.md), [privacy](privacy.md), and [support](https://github.com/kylbutlr/parity-scrollr/issues).
