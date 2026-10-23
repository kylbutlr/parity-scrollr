# Permission audit and justification

Verified against Parity Scrollr 2.0.0.

| Permission | Why it is needed | When it is used | Scope control |
| --- | --- | --- | --- |
| `activeTab` | Reads the current page into the popup and authorizes `captureVisibleTab` | Only after the user clicks the toolbar icon | Temporary grant for the active tab |
| `scripting` | Installs scroll, navigation, and capture coordination in the compared website frames | After the user starts an approved comparison | A temporary content-script registration matches only the approved website origins; coordination activates only for an approved direct child frame in the active comparison tab and the registration is removed at teardown. The local image frame uses bundled extension code. |
| `storage` | Holds short-lived comparison sessions and saved settings | At launch, during an active comparison, and when settings change | URL pairs and active state use session storage; settings and explicitly enabled conveniences use local storage. Imported image files use extension-local IndexedDB. |
| `declarativeNetRequestWithHostAccess` | Enables Compatibility fallback for pages that do not become ready | After a page does not report ready within 15 seconds, once per workspace load; manual recovery remains available if automatic preparation fails | Session rules match the selected origin, exact tab ID, and `sub_frame` only |
| Optional `<all_urls>` host access | Provides a capability ceiling for exact per-site grants and the optional repeat-comparison preset, including the browser's broad-access path for capture | Exact HTTP or HTTPS origins are requested at comparison start; all-site access is requested only from Settings | Per-site grants are released after use unless persistent all-site access is enabled; comparison inputs still reject unsupported schemes |

## What users see before Chrome asks

Before requesting site access, Parity Scrollr shows a separate review step naming the exact selected domains, why access is required, what the extension does not inspect or upload, and when the grant is removed. The first button only opens this review. Site access is requested only after the user chooses **Allow these sites and open comparison**.

Chrome may describe an exact per-site grant as permission to read and change data on the selected site. That is Chrome's capability warning. Parity Scrollr uses the grant only in the user-started comparison so it can load the two selected pages and coordinate scrolling and navigation inside their comparison frames.

With a local design image reference, the extension asks for access only to the implementation site's origin. The image needs no host permission and is removed from extension-local IndexedDB when the comparison ends.

## Response-header behavior

Standard mode leaves response headers unchanged. Compatibility mode removes only the enforced `Content-Security-Policy` and `X-Frame-Options` response headers. It does not remove `Content-Security-Policy-Report-Only`. Each rule is limited to one selected origin, one active comparison tab, and subframe responses. Rules are removed on explicit End, tab close, navigation away, initialization failure, and service-worker reconciliation.

Removing a full enforced CSP can weaken protections beyond framing inside the selected frame. Chromium's declarative rules cannot remove only the `frame-ancestors` directive, so comparisons start with headers unchanged and show when a single automatic fallback enables Compatibility mode after the 15-second ready timeout. Selected-site access is reviewed before launch.

`declarativeNetRequestWithHostAccess` remains a required named permission because Compatibility mode cannot create response-header rules without it. The permission grants no site access by itself and every rule is still gated by a user-approved host. Making this named permission optional across both supported stores remains a browser-runtime experiment, not a safely verified reduction, so the extension keeps the host grants optional and the rule scope narrow.

Optional `<all_urls>` remains in the manifest as a capability ceiling because [Chrome documents broad host access as one authorization route for visible-tab capture](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab), and the user-approved repeat-comparison preset is intended to preserve capture without a second toolbar click. Safer mode never requests that broad grant and uses `activeTab` instead. The extension accepts comparison inputs only for exact HTTP or HTTPS origins.

## Permissions deliberately removed

- Required `<all_urls>` host access
- The `tabs` permission
- The `webNavigation` permission
- A static content script on all HTTP and HTTPS pages and frames

## Repeat-comparison preset

The repeat-comparison preset is enabled in Settings. It requests persistent access to all HTTP and HTTPS sites, mirrors query and fragment URL details, and remembers the replica URL. Runtime code and header rules remain restricted to active comparison tabs.
