const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const popup = read("popup.html");
const popupScript = read("popup.js");
assert.match(popup, /Next, Chrome asks|id="access-note"/);
assert.match(popup, /id="submit-button"[^>]*>Review site access</);
assert.match(popup, /id="access-review-view"[^>]*hidden/);
assert.match(popup, /id="access-review-title"[^>]*tabindex="-1"/);
assert.match(popup, /id="requested-sites"/);
assert.match(popup, /id="confirm-access"[^>]*>Allow these sites and open comparison</);
assert.match(popup, /<details class="context-help">/);
assert.match(popup, /id="open-privacy"/);
assert.match(popup, /id="reference-state"[^>]*hidden/);
assert.match(popup, /id="error"[^>]*role="alert"[^>]*tabindex="-1"/);
assert.match(popupScript, /errorMessage\.focus\(\)/);
assert.ok(
  popupScript.indexOf("showAccessReview(pair, origins)") <
    popupScript.indexOf('confirmAccessButton.addEventListener("click"'),
  "site access review must precede the permission request action"
);

const comparison = read("compare.html");
const comparisonScript = read("compare.js");
assert.match(comparison, /id="help-button"[^>]*aria-expanded="false"[^>]*aria-controls="quick-guide"/);
assert.match(comparison, /id="quick-guide"[^>]*aria-labelledby="quick-guide-title"[^>]*hidden/);
assert.match(comparison, /id="dismiss-guide-button"[^>]*aria-label=/);
assert.match(comparison, /id="url-parity-toggle"[^>]*aria-describedby=/);
assert.match(comparison, /id="capture-status"[^>]*role="status"[^>]*aria-live="polite"/);
assert.match(comparisonScript, /comparisonGuideDismissed/);
assert.match(comparisonScript, /event\.key === "Escape" && !quickGuide\.hidden/);
assert.match(comparisonScript, /urlDetailsToggle\.disabled = !urlParityToggle\.checked/);

const privacy = read("privacy.html");
for (const heading of [
  "What is handled",
  "Where it is stored",
  "What leaves your device",
  "How to delete it"
]) {
  assert.ok(privacy.includes(heading), `privacy page must include ${heading}`);
}
assert.match(privacy, /Settings, Clear all local data/);
assert.match(privacy, /does not delete PNG files/);

const settings = read("settings.html");
const settingsScript = read("settings.js");
assert.match(settings, /id="clear-data"[^>]*>Clear all local data</);
assert.match(settingsScript, /chrome\.storage\.local\.clear\(\)/);
assert.match(settingsScript, /chrome\.storage\.session\.clear\(\)/);
assert.match(settingsScript, /chrome\.permissions\.getAll\(\)/);

const support = read("support.html");
assert.match(support, /https:\/\/github\.com\/kylbutlr\/parity-scrollr\/issues/);

console.log("first-use guidance and privacy controls: PASS");
