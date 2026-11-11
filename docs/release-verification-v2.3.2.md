# Parity Scrollr v2.3.2 verification

Prepared November 11, 2026, following explicit approval to push the verified fix,
open and merge its PR after checks pass, publish this patch and delete its merged
branch. Required hosted checks must still pass before merge/publication.

The final `npm test` passed 20 checks, including generated-source parity. The
packaging command passed Chrome and Edge ZIP integrity checks. Both ZIPs contain
identical bytes. Every packaged runtime file matches the native-tested local
candidate byte for byte, except the manifest version changes from 2.3.1 development
metadata to 2.3.2. No permissions, dependencies, or styling values changed.

The native pass and regression evidence are documented in
[handoff verification](permission-handoff-verification-2026-11-11.md) and
[rule-ID verification](rule-id-verification-2026-11-11.md). The latter supersedes
the former's historical rule-ID blocker. Native Chrome for Testing 151.0.7922.34
passed permission approval, both frames loading, synchronized scrolling, Blink,
390px viewport, real visible PNG capture, and complete End cleanup.

## Checksums

- `parity-scrollr-chrome-v2.3.2.zip`: `14d1d49212e4348441c9e7ce89da2152f0b4a0648ee0357cc1aed09788e93f68` (212713 bytes).
- `parity-scrollr-edge-v2.3.2.zip`: `14d1d49212e4348441c9e7ce89da2152f0b4a0648ee0357cc1aed09788e93f68` (212713 bytes).

## Acceptance boundaries

This is the explicitly approved focused patch release, not comprehensive
production signoff across the standard browser matrix. The outstanding matrix
items are listed in the [release notes](release-notes-v2.3.2.md). They are not
represented as passing and the standard checklist is not weakened.

Old release downloads stay immutable. Publication must use the exact checked
assets above, then verify public tag, asset checksums, and merged-branch cleanup.
