# Parity Scrollr 2.2.0

Release notes for the GitHub download candidate. Publication is pending installed-browser verification and approval.

- The toolbar popup keeps content-driven height and uses wider layouts and tighter spacing so normal setup, image import, and access review fit Chrome's popup height limit.
- A clearer toolbar keeps scroll, Blink, viewport, and capture controls visible, with secondary navigation under More options.
- Setup starts comparisons normally and automatically retries once in Compatibility mode if a page does not report ready within 15 seconds, preserving already-ready panes. The redundant setup checkbox and default preference are removed. Onboarding covers websites and local design images.
- Viewport presets describe CSS dimensions without implying device emulation.
- Refresh restores the tab's comparison after its temporary launch record has been removed.
- Back to top and viewport reflow preserve scroll state, including independent panes.
- Turning off remembered URLs or restoring safer defaults removes the saved URL immediately.
- Session changes wait for startup reconciliation, avoiding orphan cleanup during comparison preparation.
- Full-page capture automatically recognizes Shopify preview frames with relative URLs and accessible `shopify-admin` iframe bodies, keeps them hidden through every full-page capture segment, and restores their original display styles afterward. No site-profile setting is needed.
- Full-page capture supports visible scrolling page containers alongside ordinary pages. It captures the scrolling region and preserves surrounding static chrome once, rather than rejecting every container-based page. Failure details remain available until the next attempt, with advice specific to the error.
- Download packages include installation and manual-update instructions, the MIT license, and font license.

Download the browser ZIP from the release's Assets section, extract it to a permanent folder, and use Load unpacked in Chrome or Edge with Developer mode enabled. See [INSTALL.md](../INSTALL.md). Updates are manual.
