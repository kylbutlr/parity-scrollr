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
    "#include-url-details",
    "#remember-replica-url",
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
  let imageClearCount = 0;
  const removedOrigins = [];
  const localData = {};

  const context = {
    ParityImageStore: { clear: async () => { imageClearCount += 1; } },
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
          get: async () => ({ ...localData }),
          set: async (values) => Object.assign(localData, values),
          remove: async (key) => { delete localData[key]; }
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

  localData.lastReplicaUrl = "https://implementation.example/private-preview";
  elements.get("#remember-replica-url").checked = true;
  await elements.get("#save-settings").listeners.get("click")();
  assert.ok(localData.lastReplicaUrl, "retention stays enabled until explicitly disabled");
  elements.get("#remember-replica-url").checked = false;
  await elements.get("#save-settings").listeners.get("click")();
  assert.equal(localData.lastReplicaUrl, undefined, "disabling retention must remove the saved URL immediately");
  localData.lastReplicaUrl = "https://implementation.example/private-preview";
  await elements.get("#restore-safer").listeners.get("click")();
  assert.equal(localData.lastReplicaUrl, undefined, "restoring defaults must remove the saved URL");
  removedOrigins.length = 0;

  await elements.get("#clear-data").listeners.get("click")();
  assert.deepEqual(removedOrigins, ["https://reference.example/*"]);
  assert.equal(localClearCount, 1);
  assert.equal(sessionClearCount, 1);
  assert.equal(imageClearCount, 1);
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
