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

  focus() {}
  select() {}
}

const root = path.join(__dirname, "..");
const siteAccessContext = { URL };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "site-access.js"), "utf8"),
  siteAccessContext,
  { filename: "site-access.js" }
);

for (const url of [
  "https://admin.shopify.com/store/example/themes",
  "https://example.myshopify.com/admin/themes"
]) {
  assert.match(
    siteAccessContext.ParitySiteAccess.unsupportedComparisonReason(url),
    /Shopify Admin/
  );
}

for (const url of [
  "https://example.com/",
  "https://example.myshopify.com/",
  "https://example.myshopify.com/?preview_theme_id=123"
]) {
  assert.equal(siteAccessContext.ParitySiteAccess.unsupportedComparisonReason(url), null);
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
  let permissionRequestCount = 0;

  const context = {
    URL,
    chrome: {
      permissions: {
        contains: async () => false,
        request: async () => {
          permissionRequestCount += 1;
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
        session: { set: async () => {} }
      },
      tabs: {
        create: async () => {},
        query: async () => [{
          id: 7,
          url: "https://admin.shopify.com/store/example/themes"
        }]
      }
    },
    crypto: { randomUUID: () => "admin-test" },
    document: {
      createElement() {
        return new FakeElement();
      },
      querySelector(selector) {
        return elements.get(selector);
      }
    },
    window: { close() {} }
  };

  for (const script of ["settings-data.js", "site-access.js", "popup.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(root, script), "utf8"), context, {
      filename: script
    });
  }
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(elements.get("#reference-url").value, "");
  assert.match(elements.get("#reference-state").textContent, /Shopify Admin/);
  assert.equal(elements.get("#use-current").disabled, true);

  elements.get("#reference-url").value = "https://admin.shopify.com/store/example/themes";
  elements.get("#replica-url").value = "https://preview.example.com/";
  await elements.get("#compare-form").listeners.get("submit")({ preventDefault() {} });

  assert.equal(
    permissionRequestCount,
    0,
    "Shopify Admin must be rejected before chrome.permissions.request"
  );
  assert.match(elements.get("#error").textContent, /Shopify Admin/);

  console.log("Shopify Admin permission prompt regression: PASS");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
