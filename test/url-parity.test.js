const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { Set, URL };
const comparisonMarkup = fs.readFileSync(path.join(__dirname, "..", "compare.html"), "utf8");

vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", "url-parity.js"), "utf8"),
  context,
  { filename: "url-parity.js" }
);

const { matchingUrl, normalizeUrl } = context.ParityUrl;

assert.equal(
  matchingUrl(
    "https://reference.example/products/photo-book?size=large#details",
    "https://replica.example/collections/all?preview=replica#keep"
  ),
  "https://replica.example/products/photo-book?preview=replica#keep"
);
assert.equal(
  matchingUrl(
    "https://reference.example/products/photo-book?size=large#details",
    "https://replica.example/collections/all?preview=replica#keep",
    { includeDetails: true }
  ),
  "https://replica.example/products/photo-book?size=large#details"
);
assert.equal(
  matchingUrl("https://reference.example/", "https://replica.example:8443/old"),
  "https://replica.example:8443/"
);
assert.equal(normalizeUrl("not a url"), null);
assert.equal(normalizeUrl("chrome://settings"), null);
assert.equal(matchingUrl("https://reference.example/path", "about:blank"), null);

assert.match(comparisonMarkup, /id="url-parity-toggle" type="checkbox"/);
assert.ok(!comparisonMarkup.match(/id="url-parity-toggle"[^>]*checked/));
assert.ok(comparisonMarkup.includes('<script src="url-parity.js"></script>'));

console.log("URL parity mapping regressions: PASS");
