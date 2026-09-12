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
    "#replica-url",
    "#use-current",
    "#compatibility-mode",
    "#site-profile",
    "#setup-view",
    "#access-review-view",
    "#access-review-title",
    "#access-review-eyebrow",
    "#permission-warning",
    "#requested-sites",
    "#access-retention",
    "#compatibility-access-note",
    "#confirm-access",
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
  elements.get("#site-profile").value = "none";
  const sessionWrites = [];
  const requestedOrigins = [];
  const openedTabs = [];
  let popupClosed = false;

  const context = {
    URL,
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
          get: async () => ({}),
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

  console.log("popup first-use permission and launch flow: PASS");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
