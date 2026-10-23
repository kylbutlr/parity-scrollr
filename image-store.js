const ParityImageStore = (() => {
  const DATABASE = "parity-scrollr-images";
  const STORE = "references";

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function transact(mode, operation) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      transaction.oncomplete = () => {
        database.close();
        resolve(request.result);
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || new Error("Design image storage was interrupted."));
      };
    });
  }

  return {
    save(id, blob, cssWidth) {
      return transact("readwrite", (store) => store.put({ blob, cssWidth, createdAt: Date.now() }, id));
    },
    get(id) {
      return transact("readonly", (store) => store.get(id));
    },
    async has(id) {
      return Boolean(await this.get(id));
    },
    remove(id) {
      return transact("readwrite", (store) => store.delete(id));
    },
    keys() {
      return transact("readonly", (store) => store.getAllKeys());
    },
    clear() {
      return transact("readwrite", (store) => store.clear());
    }
  };
})();
