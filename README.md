# Parity Scrollr

Compare reference pages or design images with live implementations side by side using synchronized scrolling, responsive viewports, blink mode, and screenshot capture.

A focused workspace for frontend developers and designers reviewing layout, spacing, responsive behavior, and visual consistency. Comparisons and captures stay in your browser, with no account or upload required.

[Report an issue](https://github.com/kylbutlr/parity-scrollr/issues)

## Status

Version 2.2.0 is the current source candidate. GitHub download publication is pending installed-browser verification. Parity Scrollr uses Developer mode and Load unpacked in desktop Chrome and Microsoft Edge; browser-store distribution is outside the current release scope.

[GitHub releases](https://github.com/kylbutlr/parity-scrollr/releases) · [Installation and updates](INSTALL.md) · [Release notes](docs/release-notes-v2.2.0.md)

## Highlights

- Compares reference and implementation pages in synchronized side-by-side panes.
- Compares a local PNG or JPEG design export with a live implementation page, without a Figma account connection.
- Provides responsive presets, custom viewport dimensions, URL parity, Blink mode, and page history controls.
- Captures the visible comparison or a stitched full-page PNG locally.
- Keeps broad site access optional and scopes Compatibility mode to user-approved origins in the active comparison tab.

## Quick start

### Install locally

1. Download the browser ZIP from [GitHub releases](https://github.com/kylbutlr/parity-scrollr/releases), once available, or clone this source.
2. Extract the ZIP to a permanent folder. Open Manage extensions from your browser's Extensions menu.
3. Enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`.
4. Pin Parity Scrollr to the toolbar, open a website, and click the icon.

Keep the extracted folder in place. Updates are manual: end comparisons, replace its files with the new package, then select Reload on the extension card. See the complete [installation guide](INSTALL.md). No build step is required.

### Compare two pages

1. Open the reference page and click the toolbar icon.
2. Enter the implementation page.
3. Comparisons start normally. If a page does not report ready within 15 seconds, Parity Scrollr makes one automatic Compatibility retry and shows the change in the session status. Recognized Shopify preview bars are hidden automatically during full-page capture. Shopify Admin URLs are not comparison pages and are rejected before permission is requested.
4. Review the exact selected sites and why access is needed, then continue to Chrome's permission prompt and open the comparison.
5. Use Sync scroll, URL parity, Blink mode, responsive presets, custom dimensions, Max height, and the page history controls.

URL parity is off by default. When enabled, its safer mode copies only the path and preserves the other site's own query string and fragment. Query + hash is a separate opt-in because those parts can contain preview or signed-link tokens.

For visible or full-page capture under safer permissions, click the toolbar icon once while the comparison tab is active. Captures are created locally and downloaded to the device.

Find URL parity, reference history, Swap sides, Reload both, and Settings under **More options**. Use **End comparison** to close the comparison and remove its session rules and unused site grants.

### Compare a design export with a live page

1. Export the specific Figma frame as PNG or JPEG. Use the design frame rather than an annotation slide or an entire Figma canvas.
2. Click Parity Scrollr, choose **Design image** as the reference type, and select the export. Images must be 32 MiB or smaller and no larger than 32 megapixels.
3. Enter the frame's authored width in CSS pixels. For example, a 1440 px Figma frame uses **1440**, even if the exported image is only 514 pixels wide. The export's pixel width does not set the live page's layout.
4. Enter the implementation URL. Review access to that one site, then open the comparison.
5. Compare at the frame's authored width. The comparison warns if the selected viewport differs or if the image has fewer pixels than the design width. Import a separate frame for each responsive size.

Sync scroll, Blink mode, visible capture, and full-page capture are available. The design image is static, so URL parity, reference history, and Swap sides are unavailable. The image is stored locally in the extension's browser database during the comparison and removed when the comparison ends or its tab closes. Orphaned images are cleared when the extension next starts. No Figma token or image is uploaded by the extension.

## How it works

### Site access and comparison options

- Standard mode leaves page response headers unchanged.
- Compatibility mode is a Parity Scrollr comparison setting, not a browser-wide setting. It removes enforced Content Security Policy and X-Frame-Options only from the selected origins, only for subframes in the active comparison tab. New comparisons start with it off. If a page does not report ready within 15 seconds, the comparison makes one automatic retry and shows that change. It ends with the comparison. Removing CSP can also change script and resource restrictions; sign-in, bot challenges, or frame-blocking code may still prevent loading.
- The repeat-comparison preset is an optional Settings shortcut. It requests persistent HTTP and HTTPS site access, includes query and fragment URL parity, and remembers the implementation URL. Runtime behavior remains limited to active comparison tabs.

## Privacy and permissions

The extension has no analytics, telemetry, ads, hosted storage, accounts, or extension-operated server. Launch and active comparison details use browser session storage. Selected design images use the extension's local browser database and are deleted at teardown. Settings and viewport preferences use browser local storage. The implementation URL is retained only when the user enables that setting. Temporary screenshot data stays in browser memory before the resulting PNG is downloaded.

Compared pages still communicate with their own services according to their own policies.

| Permission | Purpose |
| --- | --- |
| `activeTab` | Reads the selected page and authorizes visible-tab capture after the user clicks Parity Scrollr. |
| `scripting` | Temporarily registers coordination for the approved origins; it activates only inside approved comparison frames. |
| `storage` | Stores short-lived sessions and user-selected settings. |
| `declarativeNetRequestWithHostAccess` | Enables the Compatibility fallback for approved origins when pages do not become ready. |
| Optional `<all_urls>` host access | Provides the browser capability ceiling for exact per-site grants and the separately enabled persistent all-site access. |

See the [permission rationale](docs/permissions.md) and [privacy policy](docs/privacy.md).

## Known limitations

- CSS viewport dimensions do not emulate user agent, DPR, touch, orientation APIs, safe areas, or device hardware.
- A design image is a static export. It cannot show Figma interactions, animation, or alternate responsive frames. Lower-resolution exports can appear blurry when displayed at the authored design width.
- Cookies can behave differently in frames, especially under third-party-cookie restrictions.
- Some pages remain unsupported because of JavaScript frame busting, bot challenges, sign-in boundaries, redirects, browser-owned URLs, or site policies.
- Full-page capture supports document scrolling and visible scrolling page containers. A container partly outside the page viewport requires Capture view or a layout adjustment.
- Sticky and fixed elements can repeat in stitched full-page captures. Animation, video, lazy loading, and infinite scroll can produce inconsistent segments.
- The frame sandbox prevents top-level navigation and undeclared capabilities, which can differ from a normal browser tab.

## Development

Run automated tests:

```sh
npm test
```

Create reproducible Chrome and Edge packages:

```sh
npm run package
```

Generated ZIPs, checksums, and the contents report are written to ignored `dist/`. Follow the [release checklist](docs/releasing.md). Packaging does not publish anything.

## Documentation

- [Permission audit and rationale](docs/permissions.md)
- [Privacy policy](docs/privacy.md)
- [Support guide](docs/support.md)
- [Troubleshooting and limitations](docs/troubleshooting.md)
- [Installation and manual updates](INSTALL.md)
- [Contributing](CONTRIBUTING.md)
- [Runtime architecture](docs/architecture.md)
- [GitHub release checklist](docs/releasing.md)

## App Stylr

Parity Scrollr is pinned to [App Stylr v1.2.0 source](https://github.com/kylbutlr/app-stylr/tree/b3ca31ea264d5dd233fd871ac167247f1c306985). The compact comparison toolbar exception is documented in [docs/app-stylr-exceptions.md](docs/app-stylr-exceptions.md). Bundled Geist fonts retain their [SIL Open Font License](fonts/GEIST-LICENSE.txt).

Review the [App Stylr Visual Reference](https://app-stylr.netlify.app/) before interface changes. The pinned release remains the implementation source of truth.

## Support

Start with the [support guide](docs/support.md) and [troubleshooting guide](docs/troubleshooting.md), or open a report in the [public issue tracker](https://github.com/kylbutlr/parity-scrollr/issues). Include browser and extension versions, the selected mode, and sanitized example URLs. Never include credentials, cookies, private tokens, or confidential captures.

## License

Parity Scrollr is available under the [MIT License](LICENSE).

Current styling source: [App Stylr Evening adoption](docs/app-stylr-evening-adoption.md).
