# Version 2.1.0 verification

Date: 2026-10-22, America/Los_Angeles.

Status: source and package candidate prepared for feature-branch review. Production release signoff is pending the remaining rendered and installed-browser checks. No public release, tag, portfolio deployment, or history rewrite has been performed.

## Source and package

- Branch: `kylebutler/github-release-polish`, based on remote `main` at `373b573e4062136476ad1b1224a7d57baa913669`. This report describes the source and package candidate on that branch.
- `npm test` passes all 15 test files on Node.js 22.23.1. The comparison-controls file was rerun after adding image-refresh coverage and passes.
- The automatic-recovery regression failed before the fix because no retry request was sent without a button click. It now passes, along with checks for no retry loop, preserving ready panes, preparation failures, manual recovery, and excluding image errors.
- Regressions exercise startup ordering, active comparison restoration, website and image refresh, independent scroll reflow, Top, saved-URL deletion, and container capture, mixed container/document panes, crop coordinates, static header/footer preservation, clipped-container rejection, and persistent failure feedback.
- JavaScript syntax checks pass for the changed background, comparison, popup, and settings scripts.
- All seven HTML pages pass structural nesting, duplicate-ID, label/ARIA-reference, and local-asset checks.
- `npm run package` produces Chrome and Edge ZIPs with 36 files each, including installation instructions and licenses. Both archives pass integrity checks and checksum verification.
- Both ZIPs have SHA-256 `6b7a1214d3a256db0f5cbf76c8182274b7a1f6afce4727c04161eee8bcd430a0`.
- The extracted review copy at `dist/review-v2.1.0-container-capture` matches every corresponding source file byte for byte.
- `git diff --check` passes.
- Comparisons start normally and make one automatic Compatibility retry if a website frame does not report ready within 15 seconds. Concurrent timeouts produce one request; ready panes are preserved; image failures do not enable Compatibility mode. Preparation failure stops with manual recovery available. The access review discloses the automatic fallback and its scope. The setup checkbox and default preference remain removed.
- Preview suppression is now automatic, with no site-profile setting. The redundant setting and message plumbing were removed; legacy saved profile values are ignored while preserving other normalized preferences.
- Shopify preview suppression regressions cover relative frame URLs, accessible iframe bodies marked `shopify-admin`, late frame loads, reappearing styles, exact inline-style restoration, and leaving storefront bodies and unrelated/cross-origin frames untouched. Capture-controller checks cover success, failure, cancellation, and restoration after the last screenshot.
- The original full-page image showed repeated preview-bar segments. The follow-up `parity-scrollr-full-page-2026-10-23T00-15-41-311Z.png`, supplied by Kyle, reaches both storefront footers without the repeated Shopify preview bar. Kyle also confirmed that the bar returned after capture. This verifies the reported successful capture and restoration on that tested Shopify comparison. Browser version and Edge coverage were not provided; failure and cancellation cleanup remain automated evidence only.
- Earlier review folders are retained unchanged; use `dist/review-v2.1.0-container-capture` for this revision.

The user reported an immediate full-capture failure with the nested-scroller rejection message while Sync scroll was enabled. A controller regression reproduced the exact error before the fix. The blanket guard was replaced with client-area capture geometry, preserving static surrounding chrome once. Sync scroll continues to govern pane synchronization independently. The focused regressions and all 15 test files pass. Kyle supplied the successful follow-up PNG and confirmed restoration afterward. Static side rails appear at their original height rather than being stretched.

These results establish source behavior in API harnesses and package integrity. They do not establish general browser permission behavior, complete visual quality, or capture fidelity across Chrome and Edge. The user-supplied Shopify capture and restoration confirmation are the narrower installed-browser evidence described above.

## Frontend coverage

| Surface or requirement | Implementation evidence | Rendered or installed QA |
| --- | --- | --- |
| Comparison toolbar hierarchy and constrained widths | Wrapping toolbar; primary scroll, Blink, viewport, and capture controls; native More options disclosure in `compare.html` and `compare.css` | Toolbar visible in the supplied desktop capture; constrained widths and open menu pending |
| Navigation and URL details | More options retains URL parity, explicit query/fragment opt-in, history, swap, reload, and settings | Pending |
| Popup and permission review | Streamlined setup without mode choices, complete wrapped site names, retained explicit access review | Pending |
| Onboarding | Website and design-image steps with a direct toolbar-start instruction in `welcome.html` | Pending |
| Settings | Individual preferences first, repeat-comparison preset disclosed separately, saved URL removed when retention is disabled | Pending |
| Help, privacy, support | Updated copy and installation guidance; anchored workspace help; capture closes overlays | Pending |
| Keyboard and accessibility | Native disclosure controls, Escape handler, existing shortcuts, labels, focus tokens, and live feedback retained | Pending, including 200% zoom and screen-reader review |
| Comparison refresh | Tab-owned comparison payload, matched identifier, and preserved Compatibility options | API harness passes; installed behavior pending |
| Scroll state | Per-frame positions for independent reflow; Top clears saved offsets | API harness passes; rendered behavior pending |
| Captures | Theme tokens used for stitched output; visible page containers supported with capture geometry; clipped containers rejected; state restoration retained | API harness passes; Kyle-supplied Shopify PNG reaches both footers with preview bar absent, and Kyle confirmed restoration. Remaining capture matrix and Edge pending |
| GitHub downloads | Installation/update guide in both ZIPs, release notes, checksum files, and read-only validation workflow | Local package checks pass; GitHub Actions and public assets not yet run or published |
| Portfolio referral | Existing portfolio source points to this repository | Portfolio unchanged; public release link must be verified after publication |

## Design scan and browser limitation

The source design scan returned 13 warnings: seven font advisories for pinned Geist, four padding warnings for fitted comparison frames and pane headers, and two clipping warnings for the workspace's fixed viewport boundary. Geist is required by the pinned design system; frame sizing is intentional. Menu bounds, pane headers, and overflow still require rendered confirmation. This is not a clean visual verdict.

Earlier browser attempts timed out reading the comparison tab and opening the App Stylr reference. The latest attempt to read the installed comparison was denied because the browser tool blocks chrome-extension URLs. No alternate browser access was attempted. A subsequent browser inventory showed no task-owned review tab. No preview server was started, and no user-owned browser tab or server was closed or reloaded. The required rendered style-reference comparison remains pending.

## Review the candidate

1. Read [INSTALL.md](../INSTALL.md).
2. Open Manage extensions in Chrome or Edge and enable Developer mode.
3. Choose Load unpacked and select the extracted `dist/review-v2.1.0-container-capture` folder containing `manifest.json`. Use a separate review install if retaining an existing version.
4. Follow the complete [browser QA matrix](releasing.md#browser-qa-matrix). Record screenshots covering the toolbar with More options open, both popup paths, access review, Help, settings, onboarding, privacy, and support.
5. Resolve failures before publication. Rebuild packages after any runtime or packaged-document change and record new checksums.

No localhost server or developer runtime is needed to review this extension package. Updates are manual.

## History and publication

The remote default branch remains `373b573e4062136476ad1b1224a7d57baa913669` as last fetched this session. No fresh history backup, consolidation candidate, candidate parent/commit count, tree-match result, or contribution measurement has been prepared. The full integration inventory remains incomplete. Complete source and installed-browser validation before preparing history consolidation, then verify the final restored repository before creating a public release.
