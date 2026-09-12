# Parity Scrollr privacy policy draft

Last updated: 2026-09-11

Parity Scrollr is a browser extension for comparing a reference page and implementation page side by side. It does not collect data for the developer and has no accounts, analytics, advertising, telemetry, hosted screenshot storage, or extension-operated server.

## Data handled

- URLs: The two URLs selected by the user are held in browser session storage to launch and operate a comparison. The complete implementation URL is stored in browser local storage only when the user enables that setting.
- Page interaction data: Scroll offsets, page dimensions, frame URL changes, and DOM paths for independently scrolling elements are processed in memory to coordinate the selected comparison.
- Screenshots: Visible and full-page captures are processed locally in browser memory and downloaded to the user's device. They are not uploaded by the extension.
- Preferences: Viewport and extension settings are saved in browser local storage.

Parity Scrollr does not collect, sell, transfer, or use this data for advertising, credit, lending, or purposes unrelated to visual comparison. It does not read or set cookies, credentials, form values, or browsing history outside active comparison frames.

## Storage and retention

Short-lived launch and active-session records use browser session storage. Preferences, viewport choices, first-use guidance choices, and an optional remembered implementation URL use browser local extension storage. Captures are saved to the user's normal browser download location.

Safer defaults request access only to the selected origins and release unused grants when comparisons end. Persistent all-site access is optional.

## URL parity

Path-only parity is the default. Users can opt into copying query parameters and fragments from one selected site to the other. Those URL parts can contain sensitive tokens, so the option is disabled by default. URLs containing embedded usernames or passwords are rejected.

## Third-party pages

Parity Scrollr does not send comparison data or captures to the developer or an extension server. Compared pages continue to communicate with their own servers and third parties under their respective policies. Parity Scrollr does not proxy or control those requests. A downloaded capture leaves the device only if the user chooses to share it.

## Deletion

After ending active comparisons, the user can choose **Settings, Clear all local data**. The implemented control removes local settings, saved URLs, first-use choices, temporary comparison records, and optional host-access grants. It does not delete PNG files already saved through the browser, which must be removed from the user's download location.

## Contact and policy URL

An approved public support contact and hosted privacy-policy URL are required before store submission. They are intentionally marked unresolved rather than inferred from repository metadata.
