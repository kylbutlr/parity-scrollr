# Rule-ID allocation and native verification

November 11, 2026. Local fixes on `kylebutler/parity-permission-handoff`. No public
release, push, or replacement of published assets was performed by this pass.
This supersedes the separate rule-ID blocker recorded in the handoff report.

## Fix and regression

Rule IDs are allocated from available positive signed 32-bit integers beginning
at the existing managed-rule offset. They no longer depend on Chrome tab IDs.
Allocation inspects installed rules, excludes the current session's replaced IDs,
and runs within the existing serialized session-operation queue. Teardown removes
only IDs stored for that comparison, rather than calculating IDs from an unrelated
tab. Existing managed rules and comparison boundaries are preserved.

The regression first failed on the old calculation with tab ID 2133262949.
The Chrome API mock now rejects out-of-range IDs, matching the native error.
Coverage includes standard mode, Compatibility mode, a second simultaneous tab
with ID 2147483647, collision avoidance, cleanup isolation, and unrelated-tab
closure. Full `npm test` passed all 20 checks; generated styling and diff checks
also passed. Earlier permission-popup lifecycle regressions remain passing.

## Native verification

Fresh Google Chrome for Testing 151.0.7922.34 profile, fictional route fixtures,
real extension APIs, and actual native toolbar and permission-sheet clicks.
Onboarding fully loaded and was closed before starting. The local candidate ZIP
SHA-256 was `8da59b2f043a0e3d03a9fa35a61b3e5af4a5c4cf2af2ec2f39a40d8e7dc58358`.
The candidate retains development metadata 2.3.1; it is not a public replacement.

Passed:

- Native permission approval opened the comparison and both actual frames loaded.
- The fixture tab ID was 1140825051, large enough to overflow the previous formula.
- Reference scrolling synchronized the implementation frame.
- Blink enabled and returned to split view.
- The 390px preset applied the expected CSS viewport.
- Actual toolbar capture enablement allowed a real PNG download, which was viewed.
- End comparison removed all comparison/session data, grants, content scripts,
  and DNR session rules. The receipt recorded empty collections for each.

This verifies the handoff and rule-ID fixes together in the previously failing
native flow. It does not establish every browser, compatibility-site, local-image,
full-page stitching, or lifecycle matrix item.

## Cleanup

The browser context exited and its temporary profile was removed. PID/profile
absence was checked. No preview server or personal browser profile was used.
See the companion Spottr report for the resumed public-package sanity pass.
