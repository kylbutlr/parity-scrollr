const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "..", "image-reference.js"), "utf8");

async function loadWith(storedImage) {
  const appended = [];
  const messages = [];
  const image = {
    async decode() {},
    style: {}
  };
  const error = { hidden: true, textContent: "" };
  const context = {
    URLSearchParams,
    URL: {
      createObjectURL: () => "blob:design-image",
      revokeObjectURL: () => {}
    },
    ParityImageStore: { get: async () => storedImage },
    chrome: {
      runtime: { getURL: (value) => `chrome-extension://test/${value}` }
    },
    document: {
      body: { appendChild: (element) => appended.push(element) },
      createElement: () => ({}),
      querySelector: (selector) => selector === "#reference-image" ? image : error
    },
    location: { search: "?id=test" },
    window: { parent: { postMessage: (message) => messages.push(message) } }
  };
  vm.runInNewContext(script, context, { filename: "image-reference.js" });
  await new Promise((resolve) => setImmediate(resolve));
  return { appended, error, image, messages };
}

(async () => {
  const loaded = await loadWith({
    cssWidth: 1440,
    blob: { type: "image/png" }
  });
  assert.equal(loaded.image.style.width, "1440px");
  assert.equal(loaded.image.src, "blob:design-image");
  assert.equal(loaded.appended[0].src, "chrome-extension://test/scroll-sync.js");
  assert.equal(loaded.error.hidden, true);

  const expired = await loadWith(undefined);
  assert.equal(expired.appended.length, 0);
  assert.match(expired.error.textContent, /no longer available/i);
  assert.equal(expired.messages[0].type, "REFERENCE_IMAGE_ERROR");

  console.log("local design image loading and expiry: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
