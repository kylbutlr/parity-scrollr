const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = {};
const comparisonMarkup = fs.readFileSync(path.join(__dirname, "..", "compare.html"), "utf8");
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", "full-page-capture.js"), "utf8"),
  context,
  { filename: "full-page-capture.js" }
);

const {
  calculateOutputScale,
  calculateStitchBand,
  maxScroll,
  nextCaptureTarget
} = context.ParityFullPage;

const shortPage = { clientHeight: 800, scrollHeight: 1200, y: 400 };
const longPage = { clientHeight: 800, scrollHeight: 3000, y: 720 };

assert.equal(maxScroll(shortPage), 400);
assert.equal(maxScroll(longPage), 2200);
assert.equal(nextCaptureTarget(720, 720, [shortPage, longPage]), 1440);
assert.equal(
  nextCaptureTarget(2200, 720, [shortPage, { ...longPage, y: 2200 }]),
  null
);

assert.deepEqual(
  { ...calculateStitchBand({ clientHeight: 800, scrollHeight: 3000, y: 0 }, 0, 0.5, true) },
  { cssHeight: 800, pixelHeight: 400, sourceFromBottom: false }
);
assert.deepEqual(
  {
    ...calculateStitchBand(
      { clientHeight: 800, scrollHeight: 3000, y: 720 },
      0,
      0.5,
      false
    )
  },
  { cssHeight: 720, pixelHeight: 360, sourceFromBottom: true }
);
assert.deepEqual(
  {
    ...calculateStitchBand(
      { clientHeight: 800, scrollHeight: 1200, y: 400 },
      400,
      0.5,
      false
    )
  },
  { cssHeight: 0, pixelHeight: 0, sourceFromBottom: true },
  "a shorter page must not repeat its final viewport while the other page continues"
);

assert.equal(calculateOutputScale(1600, 12000), 1);
assert.ok(calculateOutputScale(2000, 60000) < 0.5);

assert.ok(comparisonMarkup.includes('id="full-page-button"'));
assert.ok(comparisonMarkup.includes('<script src="full-page-capture.js"></script>'));

console.log("full-page capture planning regressions: PASS");
