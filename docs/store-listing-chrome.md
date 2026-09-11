# Chrome Web Store listing draft

## Name

Parity Scrollr

## Summary

Compare reference and implementation pages side by side with synchronized scrolling, responsive viewports, blink mode, and screenshot capture.

## Single purpose

Parity Scrollr supports visual comparison and responsive frontend QA for two user-selected pages in one comparison tab.

## Description

Compare a reference page and implementation page at matching CSS viewport sizes. Scroll either page to move both by the same absolute pixel offset, switch to Blink mode for rapid visual checks, mirror matching paths with optional URL parity, and save visible or stitched full-page PNG captures locally.

Safer defaults request access only to the two selected sites for the active comparison. Standard mode leaves response headers untouched. If a site blocks framing, an explicit Compatibility mode can temporarily remove enforced Content Security Policy and X-Frame-Options headers only for those selected origins, only in that comparison tab. This mode cannot bypass sign-in, anti-bot checks, JavaScript frame busting, or other security controls.

Responsive controls emulate CSS viewport width and height. They do not emulate user agent, DPR, touch, device hardware, or safe areas. Sticky elements, animation, lazy loading, and infinite pages can affect full-page captures.

All extension data stays in the browser unless the compared pages themselves communicate with their own services. Screenshots download directly to the device. There are no accounts, analytics, ads, or hosted screenshots.

## Reviewer notes

1. Click the toolbar icon on a normal HTTP or HTTPS page.
2. Enter a second page and approve the two exact site origins.
3. Verify standard comparison, synchronized scroll, responsive presets, custom size, URL parity, and Blink mode.
4. Click the toolbar icon again in the comparison tab to enable capture, then test visible and full-page PNG downloads.
5. Use a framing-restricted test page to verify standard failure and explicit Compatibility mode success.
6. Click End and confirm temporary site grants and session header rules are removed.

Use the justifications in [permissions.md](permissions.md) for the Privacy practices and permission justification fields. Privacy-policy URL and support contact remain pending approval.
