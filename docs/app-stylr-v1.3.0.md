# App Stylr v1.3.0 adoption

The source candidate adopts the published [App Stylr v1.3.0 release](https://github.com/kylbutlr/app-stylr/releases/tag/v1.3.0), source `555fe197f3bc615965f453eca27cbcdb83f13c0a`. The consumer manifest, exact HTTPS dependency and lockfile record the same source.

## Visual contract

Retain charcoal surfaces and the default Sage accent. Use the shared 4px field/button, 8px card and 12px dialog radii, the application heading scale, and 140ms control motion. Feedback keeps neutral backgrounds and borders with semantic warning/error text. Keep the comparison's compact toolbar exception and the popup's native 44px controls. The comparison workflow, grants, compatibility retry, local image storage and capture logic are unchanged.

Retain the two synchronized-arrow glyphs on the shared flat #262626 tile with #F5F5F5 foreground. Fit the existing glyph more clearly at 16px; export all extension sizes from the same SVG. The glyph is independent of the application accent.

## Reproduction

With Node 22.13 or newer:

```sh
npm ci
npm run styles
npm test
npm run package
```

The style command reads the installed immutable package's generated CSS and bundled fonts, adjusts only font URLs for the extension, and uses its icon CLI to regenerate the four committed PNGs. It never samples screenshot colors. `npm run styles:check` compares the generated files byte-for-byte and is part of `npm test`. Chrome and Edge packages continue to contain only their explicit runtime allowlist, without node_modules or build tooling.

Review the [Reference](https://kylbutlr.com/app-stylr), [product exceptions](app-stylr-exceptions.md), and [release checklist](releasing.md) before accepting a future change. The focused November 5 verification passed all 15 regression files and the generated-source drift check. Chrome and Edge ZIPs passed archive integrity and checksum checks and contain identical payloads. A rendered review produced 22 captures and passed 50 checks, covering comparison wrapping at 1440/1024/820/768/390px, options, help, Blink mode, website/design-image popup forms, denied-access feedback, settings, onboarding, privacy and support. Both popup form variants fit the native 600px height limit.

Visual inspection found an inherited muted error color and an unstyled access-review link. Both now use semantic roles. A follow-up passed 24 checks, including explicit error/link colors and synchronized scrolling at every captured position. The still is 1100×760 WebP; the GIF is 960×663, 25 frames and 6.36 seconds. The [capture provenance](images/app-preview.provenance.json) records dimensions, hashes and the fictional-data scenario. Frames come from the actual comparison UI and unmodified synchronization code using a local in-memory browser API adapter. No installed extension or real site permission was used.

This is focused rendered and source validation. The installed Chrome/Edge permission, service-worker lifecycle, restrictive-site, download/cancellation and full release matrix in the checklist remain unverified by this pass. Passing tests, packages and local harness checks do not certify that matrix or authorize publication. The v2.3.0 GitHub download remains gated.
