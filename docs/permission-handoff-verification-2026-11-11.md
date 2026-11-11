# Permission-popup handoff fix verification

Follow-up: the separate rule-ID blocker below is now resolved and the combined
native flow passed. See [rule-ID verification](rule-id-verification-2026-11-11.md).

November 11, 2026. Local changes on `kylebutler/parity-permission-handoff`.
No push, release, or replacement of published downloads was performed.

## Changes

Prepare comparison session data and any design-image blob before showing the
site-access confirmation. Confirmation queues a background-owned launch while
requesting permissions directly from the user gesture, without an intervening
await. The worker checks actual grants and finishes the launch after permission
changes, or immediately for already-approved sites. Launches share the existing
session-operation queue and are marked before creating the tab to prevent duplicate
permission events from opening duplicate comparisons. Only confirmed, unexpired
launches resume; unconfirmed reviews never open automatically. Denied requests
clean up and return to setup for a fresh review. Remembered-URL preferences are
applied by the worker, so they survive popup destruction too.

## Regression and source checks

The new regression executes the actual popup and background scripts together,
leaves the popup's permission promise unresolved to model its destruction, then
emits the real API-shaped permission-added event. It failed before the fix with
zero opened tabs, and passes afterward with exactly one comparison tab.
Additional cases cover duplicate events, existing grants, denied access/retry,
image persistence, and unconfirmed reviews. The full unchanged test command
`npm test` passes 20 checks with no failures or skips. Adapter/style checks and
`git diff --check` pass. The prior first-use test now models background ownership;
its normal website, image, privacy, and input-validation assertions remain.

A local snapshot was packaged with the repository's unchanged packaging script.
Chrome and Edge ZIP integrity checks passed. The native test used the extracted
Chrome candidate, SHA-256
`2829c8abab1213c19ab8043c3f3db01a102757ada6ea4a024f4c9a152248ddea`.
The candidate retains development metadata 2.3.1 and is not a public replacement.

## Native outcome

Google Chrome for Testing 151.0.7922.34, fresh disposable profile, fictional page
fixtures, real Chrome APIs and permission sheet. Onboarding fully loaded and was
closed before the website was selected. Chrome's actual Extensions menu opened
Parity Scrollr; the reference URL populated. After reviewing the two fictional
origins and clicking Allow in Chrome's sheet, the comparison tab opened
successfully. This verifies the original handoff correction in the same flow.

## Separate blocker

Comparison initialization then displayed:

> Error in invocation of declarativeNetRequest.updateSessionRules: Error at
> property removeRuleIds: Error at index 0: Invalid type: expected integer,
> found number.

The existing rule-ID calculation at background.js:30 multiplies the Chrome tab
ID by two and adds 100000. The fixture's original tab ID was 2133262949, showing
that this session uses large tab IDs. The calculation can exceed signed 32-bit
range. That is the likely explanation; no rule-ID fix or regression was attempted
in this pass. The visible error blocks full comparison acceptance. No frame,
scroll, viewport, or capture result is claimed as passing.

As requested, testing stopped at this separate blocker. The worker/browser
receipt showed the comparison tab existed and subsequent fatal-error cleanup had
cleared session launch data and optional site grants. The entire owned browser
context exited and its temporary profile was removed; process/profile absence
was checked. No preview server or user browser profile was used.

## Recommended next step

Fix the bounded rule-ID allocation separately, add coverage using large Chrome
tab IDs, then repeat this native comparison flow before returning to Spottr.
