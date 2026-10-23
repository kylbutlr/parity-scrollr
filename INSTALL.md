# Install Parity Scrollr

Parity Scrollr is distributed through [GitHub releases](https://github.com/kylbutlr/parity-scrollr/releases) for desktop Chrome and Microsoft Edge. Installation uses Developer mode and Load unpacked. Updates are manual.

## Install

1. Download the Chrome or Edge ZIP from the release's **Assets** section. Choose the browser package, rather than GitHub's automatically generated source archive.
2. Extract the ZIP into a permanent folder. Keep this folder in place while the extension is installed.
3. Open your browser's Extensions menu and choose **Manage extensions**. You can also enter `chrome://extensions` or `edge://extensions` in the address bar.
4. Turn on **Developer mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json`.
5. Pin Parity Scrollr in the Extensions menu. Open a website and select the Parity Scrollr toolbar icon to begin.

No terminal, Node.js, account, or build step is needed to use a release package. Managed browsers may restrict Developer mode or locally installed extensions.

## Compare

Choose **Website** to compare two pages, or **Design image** to import a PNG or JPEG design export. For an image, enter the frame's authored width in CSS pixels. Enter the implementation URL, review the selected sites, and approve the browser's site-access request.

Comparisons start normally. If a page does not report ready within 15 seconds, Parity Scrollr automatically retries once using Compatibility mode. This retry temporarily disables some page protections for the selected sites in that comparison tab and may affect how they load scripts and resources. Recognized Shopify preview bars are hidden automatically during full-page capture and restored afterward.

In the workspace, use Sync scroll, viewport controls, and Blink mode to review differences. **More options** contains URL parity, reference-page history, Swap sides, Reload both, and Settings. To enable captures, click the extension toolbar icon while the comparison tab is active. Use **End comparison** when finished.

## Update

1. End active comparisons.
2. Download and extract the new browser package.
3. Replace the extension files in the same permanent folder you originally loaded.
4. In Manage extensions, select **Reload** on Parity Scrollr's card.
5. Confirm the new version on the card, then start a new comparison.

## Verify a download

Each release should include `SHA256SUMS`. On macOS or Linux, download it beside the browser ZIP and run `shasum -a 256 <zip-filename>`, then compare the result with the matching entry. If you downloaded both ZIPs, `shasum -a 256 -c SHA256SUMS` checks both at once.

## Help and privacy

Open Settings or Help from the extension for privacy and troubleshooting details. Report reproducible problems through the [GitHub issue tracker](https://github.com/kylbutlr/parity-scrollr/issues), with browser and extension versions and sanitized example URLs. Do not include credentials, private tokens, or confidential captures.

Installation follows the official [Chrome instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) and [Microsoft Edge instructions](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading).
