const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

function topLeftAlpha(png) {
  const idatChunks = [];
  let offset = 8;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") {
      idatChunks.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }

  const scanlines = zlib.inflateSync(Buffer.concat(idatChunks));
  return scanlines[4];
}

assert.equal(manifest.name, "Parity Scrollr");
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.action.default_title, "Start a Parity Scrollr comparison");
assert.deepEqual(manifest.permissions.sort(), [
  "activeTab",
  "declarativeNetRequestWithHostAccess",
  "scripting",
  "storage"
]);
assert.deepEqual(manifest.optional_host_permissions, ["<all_urls>"]);
assert.equal(manifest.content_scripts, undefined);

for (const size of [16, 32, 128, 512]) {
  const relativePath = manifest.icons[String(size)];
  assert.equal(relativePath, `icons/icon-${size}.png`);

  const png = fs.readFileSync(path.join(root, relativePath));
  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
  assert.ok(
    topLeftAlpha(png) < 200,
    `${size} px icon corners must retain transparency`
  );
}

assert.equal(manifest.action.default_icon["16"], "icons/icon-16.png");
assert.equal(manifest.action.default_icon["32"], "icons/icon-32.png");
assert.equal(manifest.icons["48"], undefined, "Management cards must select the higher-resolution 128px artwork");
assert.equal(manifest.action.default_icon["48"], "icons/icon-48.png");
assert.equal(manifest.action.default_icon["128"], "icons/icon-128.png");

const iconSvg = fs.readFileSync(path.join(root, "icons", "icon.svg"), "utf8");
assert.ok(iconSvg.includes('viewBox="0 0 1024 1024"'));
assert.ok(iconSvg.includes('width="1024" height="1024" rx="160"'));
assert.ok(iconSvg.includes('fill="url(#icon-graphite)"'));
assert.ok(iconSvg.includes('stop-color="#383838"') && iconSvg.includes('stop-color="#202020"'));
assert.ok(iconSvg.includes('stroke="#F5F5F5"'));
assert.equal((iconSvg.match(/<stop\b/g) || []).length, 2, "Graphite uses only its two neutral stops");
assert.ok(!iconSvg.includes("<text"), "the brand icon must use a glyph instead of a lettermark");

console.log("manifest and brand icon regressions: PASS");
