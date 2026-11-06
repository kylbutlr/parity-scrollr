# App Stylr v1.4.1 adoption

The 2.3.0 source candidate now consumes the public [App Stylr v1.4.1 release](https://github.com/kylbutlr/app-stylr/releases/tag/v1.4.1), source `6fbc524f07ed7aa7db9c8593bf8116b9440937bc`. The earlier [v1.3.0 adoption](app-stylr-v1.3.0.md) remains a historical review record.

Preserve the charcoal/Sage interface, precise typography, quiet feedback and compact comparison-toolbar exception. The existing synchronized-arrow glyph retains its 16px fit; only its flat tile becomes the approved neutral Graphite gradient. No permission, storage, scrolling, compatibility, image-import or capture behavior changes in this source update.

Run `npm ci`, `npm run styles`, `npm test`, and `npm run package`. The generated-source check covers the adapter, fonts and five bitmap icon sizes. Fresh rendered evidence and media provenance are recorded with this update. The complete installed Chrome/Edge release matrix in [the release guide](releasing.md) remains required before publication.

## Local candidate evidence, November 5, 2026

The final source suite passed 15 tests with the generated-source check. Local version 2.3.0 packages passed ZIP integrity checks and include only their runtime allowlists. The candidate is not published.

Rendered review covered the comparison, Blink, options, help, website/image setup, site-access review and denied-access feedback, settings at desktop and 390px, welcome, privacy and support. Thirteen reference scroll positions matched the implementation pane through the actual synchronization script. The isolated adapter uses fictional data and does not establish installed-browser or native permission acceptance. Product-scoped automated accessibility checks reported no WCAG A/AA violations in the sampled rendered states.

The [fresh still](images/app-preview.webp), [animation](images/app-preview.gif) and [provenance](images/app-preview.provenance.json) identify the captured source revision, dimensions, hashes and coverage limits. Complete the installed-browser release guide before publication.

## High-resolution icon delivery

The product keeps its original vector glyph and approved Graphite tile. Extension PNGs now include a 512px master export generated directly from the SVG, while the top-level manifest routes the management card to the 128px resource instead of declaring a 48px card image. The 48px PNG remains available to the toolbar action. This corrects delivery and display density without changing product interactions. The rebuilt package passed its source suite and ZIP integrity check. In installed Chromium 151 at 2× density, the Extensions page selected the 128px resource, compared with 48px before the correction. Native stable Chrome/Edge walkthrough results remain separate.
