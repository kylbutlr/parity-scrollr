# Parity Scrollr

Compare reference and implementation pages side by side with synchronized scrolling, responsive viewports, blink mode, and screenshot capture.

Parity Scrollr is a local-first Chrome and Microsoft Edge extension for visual comparison and responsive frontend QA. It does not automate visual-diff scoring, upload screenshots, create accounts, analyze background browsing, or bypass authentication and site security.

[Product overview](https://kylbutlr.com/apps/parity-scrollr) · [Report an issue](https://github.com/kylbutlr/parity-scrollr/issues)

## Status

Parity Scrollr 2.0.0 is available as public source and can be loaded locally in current desktop Chrome and Microsoft Edge. It has not been published to the Chrome Web Store or Microsoft Edge Add-ons.

## Highlights

- Compares reference and implementation pages in synchronized side-by-side panes.
- Provides responsive presets, custom viewport dimensions, URL parity, Blink mode, and page history controls.
- Captures the visible comparison or a stitched full-page PNG locally.
- Keeps broad site access optional and scopes Compatibility mode to user-approved origins in the active comparison tab.

## Quick start

### Install locally

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable Developer mode.
4. Choose Load unpacked and select this repository folder.
5. Pin Parity Scrollr to the toolbar.

### Compare two pages

1. Open the reference page and click the toolbar icon.
2. Enter the implementation page.
3. Leave Compatibility mode off unless a selected site blocks framing. Select the Shopify profile only for Shopify theme-preview capture handling.
4. Approve access to the exact selected origins and open the comparison.
5. Use Sync scroll, URL parity, Blink mode, responsive presets, custom dimensions, Max height, and the page history controls.

URL parity is off by default. When enabled, its safer mode copies only the path and preserves the other site's own query string and fragment. Query + hash is a separate opt-in because those parts can contain preview or signed-link tokens.

For visible or full-page capture under safer permissions, click the toolbar icon once while the comparison tab is active. Captures are created locally and downloaded to the device.

Use End to close the comparison and remove its session rules and unused site grants.

## How it works

### Standard, Compatibility, and Classic modes

- Standard mode leaves page response headers unchanged.
- Compatibility mode removes enforced Content Security Policy and X-Frame-Options only from the two approved origins, only for subframes in the active comparison tab. It is off by default and cannot bypass sign-in, anti-bot checks, JavaScript frame busting, or other controls.
- Classic workflow is an explicit Settings preset for existing users. It requests persistent HTTP and HTTPS site access, enables Compatibility mode by default, includes query and fragment URL parity, remembers the implementation URL, and defaults Shopify capture handling on. Runtime behavior remains limited to active comparison tabs.

## Privacy and permissions

The extension has no analytics, telemetry, ads, hosted storage, accounts, or extension-operated server. Launch and active comparison details use browser session storage. Settings and viewport preferences use browser local storage. The implementation URL is retained only when the user enables that setting. Temporary screenshot data stays in browser memory before the resulting PNG is downloaded.

Compared pages still communicate with their own services according to their own policies.

| Permission | Purpose |
| --- | --- |
| `activeTab` | Reads the selected page and authorizes visible-tab capture after the user clicks Parity Scrollr. |
| `scripting` | Installs comparison coordination only inside the approved comparison tab. |
| `storage` | Stores short-lived sessions and user-selected settings. |
| `declarativeNetRequestWithHostAccess` | Enables explicit Compatibility mode for approved origins that refuse framing. |
| Optional `<all_urls>` host access | Provides the browser capability ceiling for exact per-site grants and the separately enabled persistent all-site Classic workflow. |

See the complete [permission audit](docs/permissions.md) and [privacy policy draft](docs/privacy.md).

## Known limitations

- CSS viewport dimensions do not emulate user agent, DPR, touch, orientation APIs, safe areas, or device hardware.
- Cookies can behave differently in frames, especially under third-party-cookie restrictions.
- Some pages remain unsupported because of JavaScript frame busting, bot challenges, sign-in boundaries, redirects, browser-owned URLs, or site policies.
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
- [Privacy policy draft](docs/privacy.md)
- [Support guide](docs/support.md)
- [Troubleshooting and limitations](docs/troubleshooting.md)
- [Chrome Web Store listing draft](docs/store-listing-chrome.md)
- [Microsoft Edge Add-ons listing draft](docs/store-listing-edge.md)

The hosted privacy-policy URL and store publication remain separate release decisions.

## App Stylr

Parity Scrollr is pinned to [App Stylr v1.0.0](https://github.com/kylbutlr/app-stylr/tree/v1.0.0). The compact comparison toolbar exception is documented in [docs/app-stylr-exceptions.md](docs/app-stylr-exceptions.md). Bundled Geist fonts retain their [SIL Open Font License](fonts/GEIST-LICENSE.txt).

Review the [App Stylr Visual Reference](https://app-stylr.netlify.app/) before interface changes. The pinned release remains the implementation source of truth.

## Support

Start with the [support guide](docs/support.md) and [troubleshooting guide](docs/troubleshooting.md), or open a report in the [public issue tracker](https://github.com/kylbutlr/parity-scrollr/issues). Include browser and extension versions, the selected mode, and sanitized example URLs. Never include credentials, cookies, private tokens, or confidential captures.

## License

Parity Scrollr is available under the [MIT License](LICENSE).
