const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

const context = {};
vm.runInNewContext(
  fs.readFileSync(path.join(root, "viewport-sizing.js"), "utf8"),
  context,
  { filename: "viewport-sizing.js" }
);

const { calculateViewportFit } = context.ParityViewport;

const unscaled = calculateViewportFit(390, 844, 800, 900);
assert.equal(unscaled.scale, 1);
assert.equal(unscaled.renderedWidth, 390);
assert.equal(unscaled.renderedHeight, 844);
assert.equal(unscaled.effectiveViewportHeight, 844);

const widthLimited = calculateViewportFit(1600, 1000, 800, 900);
assert.equal(widthLimited.scale, 0.485);
assert.equal(widthLimited.renderedWidth, 776);
assert.equal(widthLimited.renderedHeight, 485);

const widthLimitedMaxHeight = calculateViewportFit(1600, 1000, 800, 900, {
  maxHeight: true
});
assert.equal(widthLimitedMaxHeight.scale, 0.485);
assert.equal(widthLimitedMaxHeight.renderedWidth, 776);
assert.equal(widthLimitedMaxHeight.renderedHeight, 876);
assert.ok(
  Math.abs(widthLimitedMaxHeight.effectiveViewportHeight - 876 / 0.485) <
    Number.EPSILON * 1000
);

const unscaledMaxHeight = calculateViewportFit(390, 667, 800, 900, {
  maxHeight: true
});
assert.equal(unscaledMaxHeight.scale, 1);
assert.equal(unscaledMaxHeight.renderedWidth, 390);
assert.equal(unscaledMaxHeight.renderedHeight, 876);
assert.equal(unscaledMaxHeight.effectiveViewportHeight, 876);

const heightLimited = calculateViewportFit(1600, 1000, 2000, 600);
assert.equal(heightLimited.scale, 0.576);
assert.ok(Math.abs(heightLimited.renderedWidth - 921.6) < Number.EPSILON * 1000);
assert.equal(heightLimited.renderedHeight, 576);

const heightLimitedMaxHeight = calculateViewportFit(1600, 1000, 2000, 600, {
  maxHeight: true
});
assert.equal(heightLimitedMaxHeight.scale, 0.576);
assert.equal(heightLimitedMaxHeight.renderedHeight, 576);
assert.ok(
  Math.abs(heightLimitedMaxHeight.effectiveViewportHeight - 1000) <
    Number.EPSILON * 1000
);

console.log("viewport sizing regression: PASS");

const comparisonMarkup = fs.readFileSync(path.join(root, "compare.html"), "utf8");
const expectedPresets = [
  ["320x568", "Small Mobile · 320×568"],
  ["375x667", "iPhone SE · 375×667"],
  ["390x844", "iPhone 14 · 390×844"],
  ["430x932", "iPhone 14 Pro Max · 430×932"],
  ["744x1133", "iPad mini · 744×1133"],
  ["820x1180", "iPad 11 · 820×1180"],
  ["1032x1376", "iPad Pro 13 · 1032×1376"],
  ["1024x768", "Small Desktop · 1024×768"],
  ["1280x800", "Medium Desktop · 1280×800"],
  ["1440x900", "Large Desktop · 1440×900"],
  ["1600x900", "Extra Large Desktop · 1600×900"]
];

for (const [value, label] of expectedPresets) {
  assert.ok(
    comparisonMarkup.includes(`<option value="${value}"`),
    `viewport preset ${value} must be available`
  );
  assert.ok(comparisonMarkup.includes(label), `viewport preset ${value} must use label ${label}`);
}

console.log("viewport preset regression: PASS");
