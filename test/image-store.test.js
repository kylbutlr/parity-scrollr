const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const records = new Map();
let storeCreated = false;
const database = {
  createObjectStore() { storeCreated = true; },
  close() {},
  transaction(name, mode) {
    assert.equal(name, "references");
    const transaction = {
      objectStore() {
        function request(action) {
          const result = {};
          queueMicrotask(() => {
            result.result = action();
            result.onsuccess?.();
            transaction.oncomplete?.();
          });
          return result;
        }
        return {
          put(value, key) {
            assert.equal(mode, "readwrite");
            return request(() => records.set(key, value));
          },
          get(key) { return request(() => records.get(key)); },
          getAllKeys() { return request(() => [...records.keys()]); },
          delete(key) {
            assert.equal(mode, "readwrite");
            return request(() => records.delete(key));
          },
          clear() {
            assert.equal(mode, "readwrite");
            return request(() => records.clear());
          }
        };
      }
    };
    return transaction;
  }
};

const context = {
  Date,
  indexedDB: {
    open(name, version) {
      assert.equal(name, "parity-scrollr-images");
      assert.equal(version, 1);
      const request = { result: database };
      queueMicrotask(() => {
        if (!storeCreated) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    }
  }
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "..", "image-store.js"), "utf8"),
  context,
  { filename: "image-store.js" }
);
const store = vm.runInContext("ParityImageStore", context);

(async () => {
  const blob = new Blob([new Uint8Array(16906468)], { type: "image/png" });
  await store.save("large-design", blob, 1440);
  assert.equal(await store.has("large-design"), true);
  const saved = await store.get("large-design");
  assert.equal(saved.blob.size, 16906468);
  assert.equal(saved.cssWidth, 1440);
  assert.deepEqual(await store.keys(), ["large-design"]);
  await store.remove("large-design");
  assert.equal(await store.has("large-design"), false);

  await store.save("another-design", blob, 1440);
  await store.clear();
  assert.deepEqual(await store.keys(), []);
  console.log("large design blob storage and removal: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
