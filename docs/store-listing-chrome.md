# Chrome Web Store listing draft

## Name

Parity Scrollr

## Summary

Compare design images or reference pages with live sites using synchronized scrolling, responsive viewports, blink mode, and screenshot capture.

## Single purpose

Parity Scrollr supports visual comparison and responsive frontend QA between a local design image or website reference and a user-selected implementation site.

## Description

Compare a reference page and implementation page at matching CSS viewport sizes. Scroll either page to move both by the same absolute pixel offset, switch to Blink mode for rapid visual checks, mirror matching paths with optional URL parity, and save visible or stitched full-page PNG captures locally.

Or import a PNG or JPEG export of a design frame as the reference. Enter the frame's authored CSS width and compare it with the live implementation. This mode asks for site access only to the implementation. Design images stay in extension-local browser storage during the comparison and are removed when it ends. URL parity, reference history, and Swap sides are unavailable for a static image.

Safer defaults request access only to the selected website origins for the active comparison. Standard mode leaves response headers untouched. If a page does not report ready within 15 seconds, one automatic Compatibility retry can temporarily remove enforced Content Security Policy and X-Frame-Options headers only for those selected origins, only in that comparison tab. Removing CSP may also change script and resource restrictions. Sign-in, anti-bot checks, or JavaScript frame busting may still prevent loading.

Responsive controls emulate CSS viewport width and height. They do not emulate user agent, DPR, touch, device hardware, or safe areas. Sticky elements, animation, lazy loading, and infinite pages can affect full-page captures.

All extension data stays in the browser unless the compared pages themselves communicate with their own services. Screenshots download directly to the device. There are no accounts, analytics, ads, or hosted screenshots.

## Reviewer notes

1. Click the toolbar icon on a normal HTTP or HTTPS page.
2. Enter a second page and choose **Review site access**. Confirm that the extension names the two exact domains and explains the request before Chrome shows its permission prompt.
3. Choose **Allow these sites and open comparison**, then approve the two exact site origins in Chrome.
4. Verify standard comparison, synchronized scroll, responsive presets, custom size, URL parity, and Blink mode.
5. Click the toolbar icon again in the comparison tab to enable capture, then test visible and full-page PNG downloads.
6. Use a framing-restricted test page to verify standard loading followed by one automatic Compatibility fallback.
7. Click End and confirm temporary site grants and session header rules are removed.
8. Start an image-reference comparison. Confirm that Chrome requests only the implementation origin, scrolling and capture work, and the image is removed after End.

Use the justifications in [permissions.md](permissions.md) for the Privacy practices and permission justification fields. Privacy-policy URL and support contact remain pending approval.
