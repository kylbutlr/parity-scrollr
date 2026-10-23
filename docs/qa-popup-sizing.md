# Popup sizing verification

Date: 2026-10-22, America/Los_Angeles. Branch: `kylebutler/popup-content-height`.

Status: 2.2.0 source candidate and rebuilt review package, prepared for the approved direct update to main. This follow-up is newer than the merged 2.1.0 candidate; no GitHub download release is published by this source update. Earlier package hashes and review folders describe earlier snapshots.

Chrome automatically sizes toolbar popups to content, within an 800 by 600 pixel maximum. See [Chrome action popup documentation](https://developer.chrome.com/docs/extensions/reference/api/action#popup). The original website setup rendered at 390 by 619 pixels, explaining the reported small vertical overflow.

The popup keeps natural height, uses 480 pixels of width for ordinary screens, and uses 600 pixels for the visible image setup. Related image fields share a row, the reference-type label sits beside its selector, and spacing uses existing App Stylr tokens. All copy, 44-pixel inputs/buttons, DOM focus order, and runtime permission behavior are preserved. Overflow is not hidden, so unusually long content or constrained browser space remains accessible.

## Rendered layout evidence

The required rendered App Stylr reference was inspected. The pinned source and palette were preserved. A temporary HTTP fixture rendered the actual popup markup, styles, fonts, and normal view-specific copy without invoking extension APIs or reading an installed extension. With fonts loaded:

| State | Width | Natural height | Visible controls outside 600px height or popup width |
| --- | ---: | ---: | --- |
| Website setup | 480px | 560px | None |
| Design image setup | 600px | 579px | None |
| Site access review | 480px | 566px | None |
| Capture enabled | 480px | 232px | None |

The local fixture establishes source layout, not native Chrome popup sizing or permission behavior. The image layout was visually inspected; access review was visually inspected; all four states were measured. Initial cached styles were discarded and final checks used fresh stylesheets. The image-only width is scoped to the visible setup view, so a hidden image form does not widen access review. Kyle subsequently confirmed that the updated toolbar popup looked good. The 2.2.0 follow-up changes version metadata and release documentation only; its popup layout is unchanged from that accepted review build. Long error messages, zoom, and unusually long site names may still require scrolling at the browser limit.

## Validation and review package

- All 15 Node test files pass on Node.js 22.23.1.
- The focused Impeccable layout scan returns no findings.
- Both 36-file browser ZIPs pass archive integrity and SHA-256 verification.
- The extracted `dist/review-v2.2.0-popup-height` copy matches runtime source byte for byte.
- Both browser ZIPs have SHA-256 `6b68b5c7f5f408acc9db2aa7b56c73d161a5e84dce32aec9466ac866c89a6387`.
- No localhost server remains running. The managed Python session 7296 on port 4317 exited successfully. The reused reference tab was returned to its original URL; its separate server on port 4187 was no longer responding and was left untouched.

Load `dist/review-v2.2.0-popup-height` unpacked to review this candidate, or follow [manual update instructions](../INSTALL.md#update) to replace files in the existing permanent install folder and reload the extension. No localhost server is needed for extension review.
