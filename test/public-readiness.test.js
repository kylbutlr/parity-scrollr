const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const packageData = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const packageScript = fs.readFileSync(path.join(root, "scripts/package-extension.sh"), "utf8");

assert.equal(manifest.version, packageData.version);
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.content_scripts, undefined);
assert.ok(!manifest.permissions.includes("tabs"));
assert.ok(!manifest.permissions.includes("webNavigation"));
assert.ok(!background.includes("content-security-policy-report-only"));
assert.match(background, /resourceTypes: \["sub_frame"\]/);
assert.match(background, /tabIds: \[tabId\]/);

for (const file of [
  "welcome.html",
  "privacy.html",
  "support.html",
  "settings.html",
  "docs/permissions.md",
  "docs/privacy.md",
  "docs/support.md",
  "docs/troubleshooting.md",
  "docs/store-listing-chrome.md",
  "docs/store-listing-edge.md",
  "docs/releasing.md",
  "LICENSE"
]) {
  assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
}

const settingsContext = {};
vm.runInNewContext(
  fs.readFileSync(path.join(root, "settings-data.js"), "utf8"),
  settingsContext,
  { filename: "settings-data.js" }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(settingsContext.ParitySettings.classic())),
  {
    broadHostAccess: true,
    defaultCompatibilityMode: true,
    includeUrlDetails: true,
    rememberReplicaUrl: true,
    shopifyProfile: true
  }
);
assert.deepEqual(
  Array.from(settingsContext.ParitySettings.BROAD_ORIGINS),
  ["<all_urls>"]
);

assert.ok(!packageScript.includes("test/"));
assert.ok(!packageScript.includes("docs/"));
assert.match(packageScript, /zip -X/);

console.log("public readiness and Classic workflow regressions: PASS");
