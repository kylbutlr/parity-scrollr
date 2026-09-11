const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const listeners = {};
const localData = { paritySettings: {} };
const sessionData = {};
const grantedOrigins = new Set([
  "https://reference.example/*",
  "https://replica.example/*"
]);
let sessionRules = [];
const removedPermissionSets = [];

function storageArea(data) {
  return {
    async get(keys) {
      if (keys === null) return { ...data };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((key) => key in data).map((key) => [key, data[key]]));
    },
    async set(values) { Object.assign(data, values); },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    }
  };
}

const chrome = {
  declarativeNetRequest: {
    async getSessionRules() { return sessionRules; },
    async updateSessionRules(change) {
      sessionRules = sessionRules.filter((rule) => !change.removeRuleIds?.includes(rule.id));
      sessionRules.push(...(change.addRules || []));
    }
  },
  permissions: {
    async contains({ origins }) { return origins.every((origin) => grantedOrigins.has(origin)); },
    async remove({ origins }) {
      removedPermissionSets.push([...origins]);
      origins.forEach((origin) => grantedOrigins.delete(origin));
      return true;
    }
  },
  runtime: {
    getURL: (value) => `chrome-extension://parity/${value}`,
    onInstalled: { addListener(listener) { listeners.installed = listener; } },
    onMessage: { addListener(listener) { listeners.message = listener; } }
  },
  storage: { local: storageArea(localData), session: storageArea(sessionData) },
  tabs: {
    async create() {},
    async get(tabId) { return { id: tabId, url: "chrome-extension://parity/compare.html?id=test" }; },
    onRemoved: { addListener(listener) { listeners.removed = listener; } },
    onUpdated: { addListener(listener) { listeners.updated = listener; } }
  }
};

const context = {
  Set,
  URL,
  chrome,
  importScripts(...filenames) {
    for (const filename of filenames) {
      vm.runInContext(fs.readFileSync(path.join(root, filename), "utf8"), context, { filename });
    }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "background.js"), "utf8"), context, { filename: "background.js" });

function sendMessage(message, sender) {
  return new Promise((resolve, reject) => {
    const open = listeners.message(message, sender, resolve);
    if (!open) reject(new Error(`Message channel closed for ${message.type}`));
  });
}

(async () => {
  await new Promise((resolve) => setImmediate(resolve));
  const tabId = 73;
  const sender = { frameId: 0, tab: { id: tabId }, url: "chrome-extension://parity/compare.html?id=test" };
  const request = {
    type: "PREPARE_COMPARISON_TAB",
    origins: ["https://reference.example/*", "https://replica.example/*"]
  };

  const standard = await sendMessage(request, sender);
  assert.equal(standard.ok, true);
  assert.equal(sessionRules.length, 0, "standard mode must not alter response headers");

  const compatible = await sendMessage({ ...request, compatibilityMode: true }, sender);
  assert.equal(compatible.ok, true);
  assert.equal(sessionRules.length, 2);
  for (const rule of sessionRules) {
    assert.deepEqual(Array.from(rule.condition.tabIds), [tabId]);
    assert.deepEqual(Array.from(rule.condition.resourceTypes), ["sub_frame"]);
    assert.deepEqual(
      Array.from(rule.action.responseHeaders, (entry) => entry.header).sort(),
      ["content-security-policy", "x-frame-options"]
    );
  }

  const activeFrame = await sendMessage(
    { type: "IS_COMPARISON_FRAME" },
    { tab: { id: tabId }, frameId: 2, url: "https://reference.example/products/book" }
  );
  assert.equal(activeFrame.active, true);
  const topFrame = await sendMessage(
    { type: "IS_COMPARISON_FRAME" },
    { tab: { id: tabId }, frameId: 0, url: "https://reference.example/" }
  );
  assert.equal(topFrame.active, false);

  listeners.updated(tabId, { url: "https://outside.example/" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sessionRules.length, 0, "navigating away must remove session header rules");
  assert.equal(sessionData[`activeComparison_${tabId}`], undefined);

  request.origins.forEach((origin) => grantedOrigins.add(origin));
  await sendMessage({ ...request, compatibilityMode: true }, sender);
  await sendMessage({ type: "END_COMPARISON" }, sender);
  assert.equal(sessionRules.length, 0, "session header rules must be removed at teardown");
  assert.equal(sessionData[`activeComparison_${tabId}`], undefined);
  assert.deepEqual(removedPermissionSets.at(-1).sort(), request.origins.sort());

  request.origins.forEach((origin) => grantedOrigins.add(origin));
  await sendMessage({ ...request, compatibilityMode: true }, { ...sender, tab: { id: 74 } });
  listeners.removed(74);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sessionData.activeComparison_74, undefined);
  assert.equal(sessionRules.length, 0, "closing the comparison tab must remove session rules");

  console.log("permission-scoped comparison session regressions: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
