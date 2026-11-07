# Parity Scrollr v2.3.1

- Enter website addresses with or without `https://`, including when submitting with Enter. Addresses without a protocol use HTTPS; explicit HTTP remains supported for local development.
- Review normalized website addresses before granting access. Blank or malformed addresses, embedded credentials, and unsupported schemes retain actionable validation.
- Clarify that Design width (CSS px) is the frame's authored layout width, independent of the exported image's pixel dimensions.

The App Stylr v1.4.1 foundation, Graphite icons, requested permissions and comparison workflows are retained. The pinned styling archive is bundled locally so installation does not depend on an old GitHub commit ID.

## Installation and support

Requires desktop Chrome 112 or newer, or a compatible Microsoft Edge version. Extract the browser-specific ZIP and use Developer mode and **Load unpacked**. Updates are manual; keep the same installation folder and follow [installation and updates](../INSTALL.md).

See [privacy](privacy.md) and [support](https://github.com/kylbutlr/parity-scrollr/issues).

## Verification and coverage

The release owner approved focused acceptance for this patch on November 7, 2026. Automated/package checks and the changed URL-entry and design-width flows passed. The broader capture, permissions, update/persistence, native popup and Edge checks are explicitly deferred for v2.3.1; they have not been marked passed.

See the [v2.3.1 candidate verification](release-verification-v2.3.1.md) for exact coverage, checksums and exclusions. This decision applies only to v2.3.1 and does not change the standard release checklist. Publication requires separate approval.
