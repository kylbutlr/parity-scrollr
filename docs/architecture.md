# Runtime architecture

Parity Scrollr has no application server, npm runtime dependencies, or build step. The Manifest V3 extension loads plain HTML, CSS, and JavaScript.

| Module | Responsibility |
| --- | --- |
| `popup.js` | Validate inputs, review selected origins, request access, and create a temporary launch record. |
| `background.js` | Serialize session reconciliation and changes, register frame coordination, scope Compatibility rules, and clean up access and images. Active records retain the details needed to reload their own comparison tab. |
| `compare.js` | Own workspace controls, frame navigation, per-pane scroll state, capture orchestration, and feedback. |
| `scroll-sync.js` | Coordinate an approved frame, report navigation and scroll positions, and prepare and restore page state during capture. |
| `full-page-capture.js` | Calculate capture progression, stitch bands, and browser-safe output dimensions. |
| `image-store.js` | Store imported images in extension-local IndexedDB. |
| `image-reference.js` | Render a selected image at its authored CSS width and load the local scroll coordinator. |
| `settings-data.js`, `settings.js` | Normalize preferences and provide settings, retention, and data controls. |
| `site-access.js`, `url-parity.js`, `viewport-sizing.js` | Validate origins, construct matching URLs, and fit viewports independently of the UI. |
| `theme.css` | Supply pinned App Stylr semantic tokens and bundled fonts. |

## Session lifecycle

1. The popup validates inputs and records the comparison in browser session storage. A design image is stored separately in IndexedDB.
2. The workspace asks the background worker to prepare its tab. The worker verifies site grants, registers coordination, and saves a tab-owned active session.
3. The launch record is removed after preparation. Reload uses the active session only when its comparison identifier matches the current link.
4. End, tab close, or navigation away removes the active record, capture access, frame registration, Compatibility rules, and image, then releases unused site grants.
5. Worker startup reconciles stale records and orphaned resources before processing session changes.

Saved implementation URLs are removed when retention is disabled. Downloaded PNGs are outside extension storage and are never deleted by extension data controls.

## Capture boundary

Visible capture downloads the visible comparison tab. Full-page capture scrolls and stitches document viewports or visible primary page containers, then restores positions and temporarily hidden Shopify preview overlays. Frame metrics include the container client rectangle and frame viewport dimensions. Stitching crops to that rectangle, preserves static chrome once, and handles a container in one pane alongside document scrolling in the other. Containers extending outside the frame viewport are rejected to avoid incomplete output. Static side rails appear once at their original height; the canvas background fills the space beside additional scrolling content.

## Verification boundary

Node tests exercise protocol and state behavior with browser API harnesses. Packaging checks archive contents and integrity. Installed Chrome and Edge review remains required for permissions, framing, layout, keyboard interaction, and capture fidelity.
