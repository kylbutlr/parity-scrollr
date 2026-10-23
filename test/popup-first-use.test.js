const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeElement {
  constructor() {
    this.checked = false;
    this.children = [];
    this.classList = { add() {} };
    this.disabled = false;
    this.hidden = false;
    this.listeners = new Map();
    this.textContent = "";
    this.value = "";
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  appendChild(child) {
    this.children.push(child);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  focus() {
    this.focused = true;
  }

  select() {}
}

(async () => {
  const selectors = [
    "#reference-url",
    "#reference-kind",
    "#reference-url-field",
    "#reference-image-field",
    "#reference-image",
    "#reference-image-help",
    "#reference-css-width",
    "#setup-intro",
    "#replica-url",
    "#use-current",
    "#setup-view",
    "#access-review-view",
    "#access-review-title",
    "#access-review-eyebrow",
    "#permission-warning",
    "#requested-sites",
    "#access-retention",
    "#confirm-access",
    "#access-load-purpose",
    "#access-coordinate-purpose",
    "#back-to-setup",
    "#access-review-error",
    "#capture-ready-view",
    "#access-note",
    "#compare-form",
    "#error",
    "#reference-state",
    "#submit-button",
    "#open-settings",
    "#open-how-it-works",
    "#open-privacy",
    "#close-popup"
  ];
  const elements = new Map(selectors.map((selector) => [selector, new FakeElement()]));
  elements.get("#reference-kind").value = "website";
  const sessionWrites = [];
  const savedImages = [];
  const requestedOrigins = [];
  const openedTabs = [];
  let popupClosed = false;

  const context = {
    URL,
    createImageBitmap: async () => ({ width: 1440, height: 14482, close() {} }),
    ParityImageStore: {
      async save(id, file, cssWidth) { savedImages.push({ id, file, cssWidth }); },
      async remove() {}
    },
    chrome: {
      permissions: {
        contains: async () => false,
        request: async ({ origins }) => {
          requestedOrigins.push(...origins);
          return true;
        }
      },
      runtime: {
        getURL: (file) => `chrome-extension://test/${file}`,
        openOptionsPage: async () => {},
        sendMessage: async () => ({ ok: true })
      },
      storage: {
        local: {
          get: async () => ({ paritySettings: { defaultCompatibilityMode: true } }),
          remove: async () => {},
          set: async () => {}
        },
        session: {
          set: async (value) => {
            sessionWrites.push(value);
          }
        }
      },
      tabs: {
        create: async ({ url }) => {
          openedTabs.push(url);
        },
        query: async () => [{ id: 7, url: "https://reference.example/products/example" }]
      }
    },
    crypto: { randomUUID: () => "first-use-test" },
    document: {
      createElement() {
        return new FakeElement();
      },
      querySelector(selector) {
        return elements.get(selector);
      }
    },
    window: {
      close() {
        popupClosed = true;
      }
    }
  };

  const root = path.join(__dirname, "..");
  for (const script of ["settings-data.js", "site-access.js", "popup.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(root, script), "utf8"), context, {
      filename: script
    });
  }
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    elements.get("#reference-url").value,
    "https://reference.example/products/example"
  );
  assert.match(elements.get("#access-note").textContent, /review the exact sites/i);

  elements.get("#replica-url").value = "https://replica.example/products/example";
  await elements.get("#compare-form").listeners.get("submit")({ preventDefault() {} });

  assert.equal(requestedOrigins.length, 0, "the first action must not request permission");
  assert.equal(elements.get("#setup-view").hidden, true);
  assert.equal(elements.get("#access-review-view").hidden, false);
  assert.equal(elements.get("#access-review-title").focused, true);
  assert.match(elements.get("#permission-warning").textContent, /read and change data/i);
  assert.match(elements.get("#access-retention").textContent, /removes unused site access/i);
  assert.match(elements.get("#confirm-access").textContent, /Allow these sites/i);
  assert.deepEqual(
    elements.get("#requested-sites").children.map((child) => child.textContent),
    ["reference.example", "replica.example"]
  );

  await elements.get("#back-to-setup").listeners.get("click")();
  assert.equal(elements.get("#setup-view").hidden, false);
  assert.equal(elements.get("#access-review-view").hidden, true);
  assert.equal(elements.get("#replica-url").focused, true);

  await elements.get("#compare-form").listeners.get("submit")({ preventDefault() {} });

  await elements.get("#confirm-access").listeners.get("click")();

  assert.deepEqual(requestedOrigins, [
    "https://reference.example/*",
    "https://replica.example/*"
  ]);
  assert.equal(sessionWrites.length, 1);
  assert.equal(sessionWrites[0]["comparison_first-use-test"].options.compatibilityMode, false,
    "new comparisons must start normally even if an older default preference was enabled");
  assert.equal(
    sessionWrites[0]["comparison_first-use-test"].referenceUrl,
    "https://reference.example/products/example"
  );
  assert.equal(
    openedTabs.at(-1),
    "chrome-extension://test/compare.html?id=first-use-test"
  );
  assert.equal(popupClosed, true);

  await elements.get("#open-privacy").listeners.get("click")();
  assert.equal(openedTabs.at(-1), "chrome-extension://test/privacy.html");

  elements.get("#reference-kind").value = "image";
  elements.get("#reference-kind").listeners.get("change")();
  assert.equal(elements.get("#reference-url-field").hidden, true);
  assert.equal(elements.get("#reference-image-field").hidden, false);
  assert.equal(elements.get("#reference-css-width").required, true);
  elements.get("#reference-image").files = [{ name: "too-large.png", size: 33 * 1024 * 1024, type: "image/png" }];
  await elements.get("#reference-image").listeners.get("change")();
  assert.match(elements.get("#reference-image-help").textContent, /32 MiB or smaller/);
  const imageFile = { name: "KaramMD.png", size: 16906468, type: "image/png" };
  elements.get("#reference-image").files = [imageFile];
  await elements.get("#reference-image").listeners.get("change")();
  assert.equal(elements.get("#reference-css-width").value, "", "image pixels must not choose the live viewport width");
  assert.match(elements.get("#reference-image-help").textContent, /not this export width/i);
  await elements.get("#compare-form").listeners.get("submit")({ preventDefault() {} });
  assert.match(elements.get("#error").textContent, /Enter the Figma frame width/i);
  elements.get("#reference-css-width").value = "1440";
  await elements.get("#compare-form").listeners.get("submit")({ preventDefault() {} });
  assert.deepEqual(
    elements.get("#requested-sites").children.map((child) => child.textContent),
    ["replica.example"]
  );
  assert.match(elements.get("#access-load-purpose").textContent, /local design image/i);
  await elements.get("#confirm-access").listeners.get("click")();
  assert.deepEqual(requestedOrigins.slice(2), ["https://replica.example/*"]);
  assert.equal(savedImages[0].file, imageFile);
  assert.equal(savedImages[0].cssWidth, 1440);
  assert.equal(sessionWrites.at(-1)["comparison_first-use-test"].referenceImage.cssWidth, 1440);
  assert.equal(sessionWrites.at(-1)["comparison_first-use-test"].referenceUrl, undefined);
  assert.equal(JSON.stringify(sessionWrites).includes("data:image"), false);

  console.log("popup first-use permission and launch flow: PASS");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
