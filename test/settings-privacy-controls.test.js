const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeControl {
  constructor() {
    this.checked = false;
    this.listeners = new Map();
    this.textContent = "";
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
}

(async () => {
  const selectors = [
    "#broad-host-access",
    "#default-compatibility-mode",
    "#include-url-details",
    "#remember-replica-url",
    "#shopify-profile",
    "#settings-status",
    "#enable-classic",
    "#save-settings",
    "#restore-safer",
    "#clear-data"
  ];
  const elements = new Map(selectors.map((selector) => [selector, new FakeControl()]));
  let sessionData = {};
  let localClearCount = 0;
  let sessionClearCount = 0;
  const removedOrigins = [];

  const context = {
    chrome: {
      permissions: {
        contains: async () => false,
        getAll: async () => ({ origins: ["https://reference.example/*"] }),
        remove: async ({ origins }) => {
          removedOrigins.push(...origins);
          return true;
        },
        request: async () => false
      },
      storage: {
        local: {
          clear: async () => {
            localClearCount += 1;
          },
          get: async () => ({}),
          set: async () => {}
        },
        session: {
          clear: async () => {
            sessionClearCount += 1;
          },
          get: async () => sessionData
        }
      }
    },
    document: {
      querySelector(selector) {
        return elements.get(selector);
      }
    }
  };

  const root = path.join(__dirname, "..");
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "settings-data.js"), "utf8"),
    context,
    { filename: "settings-data.js" }
  );
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "settings.js"), "utf8"),
    context,
    { filename: "settings.js" }
  );
  await new Promise((resolve) => setImmediate(resolve));

  await elements.get("#clear-data").listeners.get("click")();
  assert.deepEqual(removedOrigins, ["https://reference.example/*"]);
  assert.equal(localClearCount, 1);
  assert.equal(sessionClearCount, 1);
  assert.match(elements.get("#settings-status").textContent, /Downloaded PNG files were not deleted/);

  sessionData = { activeComparison_10: { origins: ["https://reference.example/*"] } };
  await elements.get("#clear-data").listeners.get("click")();
  assert.equal(localClearCount, 1, "active comparisons must block data clearing");
  assert.match(elements.get("#settings-status").textContent, /End active comparisons/);

  console.log("settings privacy and deletion controls: PASS");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
