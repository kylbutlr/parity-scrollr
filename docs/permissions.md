# Permission audit and justification

Verified against Parity Scrollr 2.0.0.

| Permission | Why it is needed | When it is used | Scope control |
| --- | --- | --- | --- |
| `activeTab` | Reads the current page into the popup and authorizes `captureVisibleTab` | Only after the user clicks the toolbar icon | Temporary grant for the active tab |
| `scripting` | Installs scroll, navigation, and capture coordination in the two compared pages | After the user starts an approved comparison | A temporary content-script registration matches only the approved origins; coordination activates only for an approved direct child frame in the active comparison tab and the registration is removed at teardown |
| `storage` | Holds short-lived comparison sessions and saves user-selected settings | At launch, during an active comparison, and when settings change | URL pairs and active state use session storage; only settings and explicitly enabled conveniences use local storage |
| `declarativeNetRequestWithHostAccess` | Enables optional Compatibility mode for sites that refuse framing | Only when the user enables Compatibility mode | Session rules match the selected origin, exact tab ID, and `sub_frame` only |
| Optional `<all_urls>` host access | Provides a capability ceiling for exact per-site grants and the optional Classic workflow, including the browser's broad-access path for capture | Exact HTTP or HTTPS origins are requested at comparison start; all-site access is requested only from Settings | Per-site grants are released after use unless persistent all-site access is enabled; comparison inputs still reject unsupported schemes |

## What users see before Chrome asks

Before requesting site access, Parity Scrollr shows a separate review step naming the exact selected domains, why access is required, what the extension does not inspect or upload, and when the grant is removed. The first button only opens this review. Site access is requested only after the user chooses **Allow these sites and open comparison**.

Chrome may describe an exact per-site grant as permission to read and change data on the selected site. That is Chrome's capability warning. Parity Scrollr uses the grant only in the user-started comparison so it can load the two selected pages and coordinate scrolling and navigation inside their comparison frames.

## Response-header behavior

Standard mode leaves response headers unchanged. Compatibility mode removes only the enforced `Content-Security-Policy` and `X-Frame-Options` response headers. It does not remove `Content-Security-Policy-Report-Only`. Each rule is limited to one selected origin, one active comparison tab, and subframe responses. Rules are removed on explicit End, tab close, navigation away, initialization failure, and service-worker reconciliation.

Removing a full enforced CSP can weaken protections beyond framing inside the selected frame. Chromium's declarative rules cannot remove only the `frame-ancestors` directive, so this mode is explicit, visible, and off by default.

`declarativeNetRequestWithHostAccess` remains a required named permission because Compatibility mode cannot create response-header rules without it. The permission grants no site access by itself and every rule is still gated by a user-approved host. Making this named permission optional across both supported stores remains a browser-runtime experiment, not a safely verified reduction, so the public beta keeps the host grants optional and the rule scope narrow.

Optional `<all_urls>` remains in the manifest as a capability ceiling because [Chrome documents broad host access as one authorization route for visible-tab capture](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab), and the user-approved Classic workflow is intended to preserve capture without a second toolbar click. Safer mode never requests that broad grant and uses `activeTab` instead. The extension accepts comparison inputs only for exact HTTP or HTTPS origins.

## Permissions deliberately removed

- Required `<all_urls>` host access
- The `tabs` permission
- The `webNavigation` permission
- A static content script on all HTTP and HTTPS pages and frames

## Classic workflow

Classic workflow is a user-enabled preset. It requests persistent access to all HTTP and HTTPS sites, defaults Compatibility mode on, mirrors query and fragment URL details, remembers the replica URL, and defaults the Shopify profile on. Runtime code and header rules remain restricted to active comparison tabs.
