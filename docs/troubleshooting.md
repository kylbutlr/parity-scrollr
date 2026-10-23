# Troubleshooting and known limitations

## Embedding

- Shopify Admin URLs are not supported and are blocked before site access is requested. Open the storefront or theme preview in a regular tab and start the comparison there.
- Standard mode respects framing headers. If a page does not report ready within 15 seconds, Parity Scrollr automatically retries once with Compatibility mode. It does not loop or reload an already-ready pane. If automatic preparation fails, its warning offers manual recovery. This temporary Parity Scrollr setting applies only to the selected sites in the current comparison tab and turns off when the comparison ends.
- Sign-in, anti-bot challenges, JavaScript frame busting, browser-owned pages, and extension pages may remain unsupported after a Compatibility retry. The retry removes enforced CSP and framing headers, so it may also change script and resource restrictions.
- Redirects to a different origin are not automatically granted. End the comparison and start a new one with the final URL.
- Framed pages may receive different cookie treatment, including third-party-cookie restrictions. Sign in directly when appropriate, but do not use Parity Scrollr to circumvent access controls.

## Responsive behavior

- Viewport controls change CSS width and height only.
- User agent, device pixel ratio, touch capability, orientation APIs, safe-area insets, sensors, and device hardware are not emulated.
- The frame sandbox denies top-level navigation and undeclared capabilities. Pages that require those abilities may not behave exactly like a normal tab.

## Scrolling and URL parity

- Synchronization uses absolute pixels so vertical drift remains visible when content heights differ.
- Independently scrolling elements require a corresponding DOM path on both pages.
- Path-only URL parity preserves each target site's existing query and fragment. Query and fragment copying is a separate opt-in because those values can contain sensitive tokens.

## Captures

- Click the extension toolbar icon in the comparison tab to enable capture with safer permissions.
- Keep the comparison tab active during full-page capture.
- Full-page capture supports document scrolling and visible scrolling page containers. Sync scroll controls whether the two panes move together; it does not change how either site implements scrolling.
- For a scrolling page container, the capture stitches its visible client area and includes surrounding static headers, footers, and side rails once. A container partly outside the page viewport requires Capture view or a layout adjustment.
- Capture failure details remain in the status line and button tooltip until the next attempt.
- Sticky and fixed elements inside the scrolling content can repeat across stitched segments.
- Animations, video, lazy loading, infinite scroll, and content that changes during capture can create inconsistent results.
- Capture stops after 60 screenshots. Very tall results may be scaled down to remain within browser image limits.
- Full-page capture automatically detects and hides recognized Shopify preview-bar frames through the last full-page screenshot, then restores their original inline display value and priority after returning to the original scroll positions. Cleanup also runs on cancellation or failure.
- Recognition includes known preview-frame IDs and accessible iframe documents whose body has the `shopify-admin` class. The storefront body itself is never hidden. An unrecognized cross-origin iframe cannot be inspected through its inner body; report its outer iframe markup if the bar still appears.
