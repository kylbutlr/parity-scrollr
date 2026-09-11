# Microsoft Edge Add-ons listing draft

## Name

Parity Scrollr

## Short description

Compare reference and implementation pages with synchronized scroll, responsive viewports, blink mode, and local captures.

## Long description

Parity Scrollr is a focused frontend QA tool for comparing two user-selected pages in one browser tab. It provides absolute-pixel synchronized scrolling, responsive CSS viewport presets and custom dimensions, path-based URL parity, Blink mode, visible capture, and stitched full-page capture.

The default permission flow approves only the selected site origins and removes unused grants when comparison sessions end. Standard mode does not change site headers. Optional Compatibility mode removes enforced Content Security Policy and X-Frame-Options only for selected-site subframes inside the current comparison tab, then tears down those session rules.

The extension does not circumvent authentication, anti-bot systems, or site security controls. Device-specific user agents, DPR, touch, safe areas, and hardware are not emulated. All extension-managed data and screenshot processing remain local to the browser.

## Certification and reviewer notes

Follow the same test sequence and permission justifications in [store-listing-chrome.md](store-listing-chrome.md) and [permissions.md](permissions.md). The Chrome and Edge packages contain the same reviewed runtime payload. A public privacy URL and approved support destination must be supplied before submission.
