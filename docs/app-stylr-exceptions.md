# App Stylr exceptions

This file records intentional differences from the pinned App Stylr v1.3.0 source release.

| Area | App Stylr default | Local requirement | Reason | Owner | Review trigger |
| --- | --- | --- | --- | --- | --- |
| Comparison toolbar and session controls | Standard controls are at least 40px tall | Dense comparison controls use a 26 to 32px height | The comparison chrome must preserve page area and horizontal room for viewport, synchronization, history, capture, and Help controls | Kyle | Comparison control density changes |

The compact comparison toolbar retains its existing geometry, wrapping and native More options disclosure. Popup controls remain 44px; the popup's 480px website form and 600px design-image form fit the browser extension surface. Onboarding and documentation pages retain a responsive product title larger than the shared application heading scale.

The v1.3.0 adapter is generated from the released package. Cards, fields, buttons and dialogs use its radius roles. Feedback uses neutral surfaces and borders with semantic text. The existing two-arrow icon remains; its background is flat charcoal, and the glyph is enlarged within the same silhouette for small-size legibility. There is no per-app appearance selector in this adoption. New accents and tones are supported by the generated adapter and can be selected deliberately in a future product setting.

Rendered review evidence and installed-browser coverage are recorded separately in [the adoption report](app-stylr-v1.3.0.md).
