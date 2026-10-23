const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function gitBlobSha(relativePath) {
  const content = fs.readFileSync(path.join(root, relativePath));
  const header = Buffer.from(`blob ${content.length}\0`);
  return crypto.createHash("sha1").update(header).update(content).digest("hex");
}

const theme = read("theme.css");
const normalizedTheme = theme.toLowerCase();
for (const declaration of [
  '--ui-canvas: #0e0e10',
  '--ui-sidebar: #121214',
  '--ui-surface: #151517',
  '--ui-surface-raised: #202023',
  '--ui-border: #2a2a2e',
  '--ui-border-strong: #747479',
  '--ui-text: #f5f4f3',
  '--ui-text-muted: #a7a7ae',
  '--ui-accent: #a9cec2',
  '--ui-accent-strong: #c3e3d9',
  '--ui-selected: #263d39',
  '--ui-danger: #ff9189'
]) {
  assert.ok(normalizedTheme.includes(declaration), `missing design token: ${declaration}`);
}

assert.ok(theme.includes('font-family: "Geist Sans"'));
assert.ok(theme.includes('font-family: "Geist Mono"'));
assert.ok(theme.includes('font-family: var(--font-sans)'));
assert.ok(theme.includes('outline: 3px solid var(--ui-focus)'));
assert.ok(theme.includes('@media (prefers-reduced-motion: reduce)'));
assert.equal(
  gitBlobSha("fonts/Geist-Variable.woff2"),
  "5c5999d617e106753ce406898cacc94a169bbb24"
);
assert.equal(
  gitBlobSha("fonts/GeistMono-Variable.woff2"),
  "efaf95dba19fcfede3eee5d76dd46625d98a9948"
);
assert.ok(read("fonts/GEIST-LICENSE.txt").includes("SIL OPEN FONT LICENSE Version 1.1"));

const appStylr = JSON.parse(read("app-stylr.json"));
assert.equal(appStylr.version, "1.2.0");
assert.equal(appStylr.release, "https://github.com/kylbutlr/app-stylr/tree/b3ca31ea264d5dd233fd871ac167247f1c306985");
assert.ok(theme.includes('--app-stylr-version: "1.2.0"'));
assert.ok(read("README.md").includes("App Stylr v1.2.0"));
assert.ok(!read("README.md").includes("app-design-system"));
assert.ok(read("LICENSE").includes("MIT License"));

for (const page of ["popup.html", "compare.html"]) {
  const markup = read(page);
  assert.ok(markup.includes("Parity Scrollr"));
  assert.ok(markup.includes('href="icons/icon.svg"'));
  assert.ok(markup.includes('href="theme.css"'));
}

for (const relativePath of [
  "README.md",
  "compare.html",
  "compare.js",
  "manifest.json",
  "popup.html",
  "scroll-sync.js"
]) {
  const content = read(relativePath);
  const legacyName = ["Parity", "QA"].join(" ");
  const legacySlug = ["parity", "qa"].join("-");
  assert.ok(!content.includes(legacyName), `${relativePath} retains the old product name`);
  assert.ok(!content.includes(legacySlug), `${relativePath} retains the old product slug`);
}

console.log("Parity Scrollr branding regressions: PASS");
