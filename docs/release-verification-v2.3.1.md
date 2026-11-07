# Parity Scrollr v2.3.1 candidate verification

Status: local candidate with focused patch acceptance approved on November 7, 2026. No push, PR, merge, tag or GitHub Release was performed for this patch preparation. Publication approval remains pending.

## Source and automated checks

- Runtime polish base: `0811cd69675a4bdedb12e29b7cde79ccfec9a835` on `main`. Patch preparation changes version metadata, release notes and documentation only.
- App Stylr remains pinned to v1.4.1 through its preserved local archive. The generated-source check passed.
- Runtime: Node v22.23.1. Commands: `npm ci --offline --no-audit --no-fund`, `npm test`, `npm run package`.
- Automated tests: 15 passed; zero failures, skips or cancellations.
- Each package passed ZIP integrity, an exact runtime allowlist comparison and a byte-for-byte comparison of every file against the candidate source. No development files were included.
- Repeated packaging produced the same SHA-256. Existing older version ZIPs and versioned checksums were unchanged.

## Package checksums

| File | SHA-256 |
| --- | --- |
| `parity-scrollr-chrome-v2.3.1.zip` | `aced8ca21ac4647ac4b7d4836e2102372de422b1a17dd4303c0c2e47ec668bc1` |
| `parity-scrollr-edge-v2.3.1.zip` | `aced8ca21ac4647ac4b7d4836e2102372de422b1a17dd4303c0c2e47ec668bc1` |

The Chrome and Edge ZIPs contain identical bytes. `SHA256SUMS` and `CONTENTS.txt` describe this candidate.

## Installed Chrome review and remaining acceptance

A focused installed-package pass used Google Chrome 157.0.8103.38 on macOS, a disposable profile, and the exact extracted ZIP. Chrome's extension-debugging API read back the enabled extension as version 2.3.1. The real extension APIs were retained; no fictional browser API adapter was used.

Passed in the installed extension page:

- Bare website addresses submitted with Enter reached the two-origin site-access review and were normalized to HTTPS.
- Embedded username/password addresses were rejected with the existing actionable error.
- An explicit HTTP localhost address retained HTTP at the access review; no localhost server was started or contacted.
- A selected PNG with blank authored width was rejected. Width 1440 reached the one-origin image-access review, independently of the PNG's 800px width.

The review stopped before granting site permissions. Website/image setup was exercised as an installed extension page in a tab, not as a native toolbar popup. The image form intentionally requests a 600px-wide native popup. A diagnostic image-mode capture forced into a 480px tab clips horizontally and is not evidence of native popup geometry; that geometry remains unverified. No CSS change was made from that diagnostic.

## Approved patch scope and deferred checks

On November 7, 2026, the release owner explicitly selected: "Use focused patch scope; document deferred checks." Acceptance for v2.3.1 is limited to the automated/package checks and changed flows recorded as passed above. Those checks satisfy the approved local patch scope. This is not a full native-browser acceptance verdict or authorization to publish.

The following checks remain unverified and are explicitly excluded from the acceptance gate for v2.3.1 only:

- Native stable Edge installation and behavior; Chrome permission dialogs and optional grant/reversal flows; same-folder update, browser restart/persistence, service-worker lifecycle and DNR/grant teardown.
- Ordinary comparisons, Standard/Compatibility behavior and restrictive-page recovery; synced/nested scrolling, URL parity, Blink, viewport/reflow/history controls, visible/full-page captures and local-image teardown.
- The native 600px image-popup geometry and the complete responsive, keyboard, focus, zoom, onboarding, settings, support and accessibility matrix beyond the changed states reviewed above.
- Any other item in the standard [browser QA matrix](releasing.md#browser-qa-matrix) not explicitly recorded as passed in this versioned report.

Reason: this patch has a deliberately bounded changed-flow review; the broader inherited matrix was not completed in this pass. Deferred does not mean passed. Follow-up owner: the release-preparation agent during the next broader native-browser QA effort. No deadline or additional QA run was requested by this scope decision.

The standard release checklist is unchanged for future releases. Code, permissions, the App Stylr pin and package checksums are unchanged by this documentation-only decision.

The task-owned browser sessions were closed and process cleanup verified. Existing user browser profiles, installed extensions and saved data were untouched. No preview server was started. Original preview media retains its original capture-version labels.
