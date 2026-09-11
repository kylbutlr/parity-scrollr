# Troubleshooting and known limitations

## Embedding

- Standard mode respects framing headers. Restart with Compatibility mode only when you understand its narrower but weaker protection model.
- Compatibility mode cannot bypass authentication, anti-bot challenges, JavaScript frame busting, browser-owned pages, extension pages, or other security controls.
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
- Sticky and fixed elements can repeat across stitched segments.
- Animations, video, lazy loading, infinite scroll, and content that changes during capture can create inconsistent results.
- Capture stops after 60 screenshots. Very tall results may be scaled down to remain within browser image limits.
- The optional Shopify profile hides only recognized Shopify preview-bar frames during full-page capture and restores their prior inline display state afterward.
