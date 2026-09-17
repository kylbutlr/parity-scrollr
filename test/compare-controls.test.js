const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeElement {
  constructor() {
    this.checked = true;
    this.clientHeight = 900;
    this.clientWidth = 900;
    this.hidden = false;
    this.listeners = new Map();
    this.options = [{ value: "1440x900" }];
    this.style = {};
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.disabled = false;
    this.textContent = "";
    this.title = "";
    this.value = "1440x900";
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  focus() {}

  click() {
    this.clicked = true;
  }

  reportValidity() {
    return true;
  }

  select() {}

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  contains(value) {
    return this.values.has(value);
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  toggle(value, force) {
    const enabled = force === undefined ? !this.values.has(value) : force;
    if (enabled) {
      this.values.add(value);
    } else {
      this.values.delete(value);
    }
    return enabled;
  }
}

function createFrame(onMessage) {
  const messages = [];
  const frame = {
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    contentWindow: null,
    listeners: new Map(),
    messages,
    style: {}
  };
  frame.contentWindow = {
      postMessage(message) {
        messages.push(message);
        onMessage?.(frame.contentWindow, message);
      }
  };
  return frame;
}

class FakeCanvas extends FakeElement {
  getContext() {
    return {
      createPattern() {
        return "pattern";
      },
      drawImage() {},
      fillRect() {},
      scale() {},
      strokeRect() {}
    };
  }

  toBlob(callback) {
    callback(new Blob(["png"], { type: "image/png" }));
  }
}

class FakeImage {
  constructor() {
    this.naturalHeight = 900;
    this.naturalWidth = 1030;
  }

  set src(_value) {
    queueMicrotask(() => this.onload?.());
  }
}

(async () => {
  const elements = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  const storageWrites = [];
  const downloadLinks = [];
  const prepareRequests = [];
  const scheduledTimeouts = [];
  let nextTimeoutId = 0;
  let captureCalls = 0;
  const frameMetrics = {
    clientHeight: 800,
    clientWidth: 1440,
    scrollHeight: 1600,
    scrollWidth: 1440,
    x: 0,
    y: 0
  };
  const respondToFrameCapture = (source, message) => {
    const responseTypes = {
      CAPTURE_CLEANUP_REQUEST: "CAPTURE_CLEANUP_RESULT",
      CAPTURE_METRICS_REQUEST: "CAPTURE_METRICS_RESULT",
      CAPTURE_PREPARE_REQUEST: "CAPTURE_PREPARE_RESULT",
      CAPTURE_SCROLL_REQUEST: "CAPTURE_SCROLL_RESULT"
    };
    const responseType = responseTypes[message.type];
    if (!responseType) {
      return;
    }

    if (message.type === "CAPTURE_SCROLL_REQUEST") {
      frameMetrics.x = Math.max(0, message.x || 0);
      frameMetrics.y = Math.min(
        Math.max(0, message.y || 0),
        frameMetrics.scrollHeight - frameMetrics.clientHeight
      );
    }

    queueMicrotask(() => {
      windowListeners.get("message")({
        source,
        data: {
          channel: "parity-scrollr-sync-v1",
          metrics: message.type.includes("METRICS") || message.type.includes("SCROLL")
            ? { ...frameMetrics }
            : undefined,
          requestId: message.requestId,
          result: message.type === "CAPTURE_PREPARE_REQUEST"
            ? { hiddenOverlays: 1 }
            : message.type === "CAPTURE_CLEANUP_REQUEST"
              ? { restoredOverlays: 1 }
              : undefined,
          type: responseType
        }
      });
    });
  };
  const referenceFrame = createFrame(respondToFrameCapture);
  const replicaFrame = createFrame(respondToFrameCapture);
  elements.set("#reference-frame", referenceFrame);
  elements.set("#replica-frame", replicaFrame);

  const selectors = [
    "#reference-address",
    "#replica-address",
    "#sync-toggle",
    "#url-parity-toggle",
    "#url-details-toggle",
    "#blink-toggle",
    "#blink-reveal-button",
    "#capture-button",
    "#full-page-button",
    "#mode-indicator",
    "#capture-status",
    "#loading",
    "#fatal-error",
    "#fatal-error-message",
    "#fatal-end-button",
    "#help-button",
    "#quick-guide",
    "#dismiss-guide-button",
    "#viewport-preset",
    "#viewport-width",
    "#viewport-height",
    "#max-height-toggle",
    "#scale-indicator",
    "#reference-stage",
    "#replica-stage",
    "#reference-shell",
    "#replica-shell",
    "#reference-status",
    "#replica-status",
    "#reference-status-message",
    "#replica-status-message",
    "#reference-compatibility-retry",
    "#replica-compatibility-retry",
    "#reference-compatibility-scope",
    "#replica-compatibility-scope",
    "#comparison",
    "#apply-viewport",
    "#top-button",
    "#reference-back-button",
    "#reference-forward-button",
    "#swap-button",
    "#reload-button",
    "#reference-open",
    "#replica-open",
    "#settings-button",
    "#end-button"
  ];

  for (const selector of selectors) {
    if (!elements.has(selector)) {
      elements.set(selector, new FakeElement());
    }
  }

  elements.get("#viewport-width").value = "1440";
  elements.get("#viewport-height").value = "900";
  elements.get("#url-parity-toggle").checked = false;
  elements.get("#quick-guide").hidden = true;
  elements.get("#fatal-error").hidden = true;
  elements.get("#reference-shell").getBoundingClientRect = () => ({
    bottom: 500,
    height: 400,
    left: 10,
    right: 510,
    top: 100,
    width: 500
  });
  elements.get("#replica-shell").getBoundingClientRect = () => ({
    bottom: 500,
    height: 400,
    left: 520,
    right: 1020,
    top: 100,
    width: 500
  });
  elements.get("#comparison").getBoundingClientRect = () => ({
    bottom: 900,
    height: 848,
    left: 0,
    right: 1030,
    top: 52,
    width: 1030
  });

  const document = {
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    },
    createElement(tagName) {
      const element = tagName === "canvas" ? new FakeCanvas() : new FakeElement();
      if (tagName === "a") {
        downloadLinks.push(element);
      }
      return element;
    },
    querySelector(selector) {
      return elements.get(selector);
    },
    querySelectorAll() {
      return [...elements.values()].filter((element) => element instanceof FakeElement);
    }
  };
  const window = {
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    }
  };

  const context = {
    URLSearchParams,
    cancelAnimationFrame() {},
    clearTimeout(timeoutId) {
      const scheduled = scheduledTimeouts.find(({ id }) => id === timeoutId);
      if (scheduled) {
        scheduled.cancelled = true;
      }
    },
    chrome: {
      runtime: {
        getURL: (value) => `chrome-extension://test/${value}`,
        openOptionsPage: async () => {},
        sendMessage: async (message) => {
          if (message.type === "PREPARE_COMPARISON_TAB") {
            prepareRequests.push(message);
            return {
              ok: true,
              session: { compatibilityMode: message.compatibilityMode === true }
            };
          }
          return { ok: true };
        }
      },
      permissions: {
        contains: async () => true
      },
      scripting: {
        executeScript: async ({ target }) => {
          if (target.allFrames) {
            throw new Error(
              "Cannot access contents of the page. Extension manifest must request permission to access the respective host."
            );
          }
        }
      },
      storage: {
        onChanged: { addListener() {} },
        local: {
          get: async () => ({}),
          set: async (value) => {
            storageWrites.push(value);
          }
        },
        session: {
          get: async () => ({
            comparison_test: {
              referenceUrl: "https://reference.example/",
              replicaUrl: "https://replica.example/",
              origins: ["https://reference.example/*", "https://replica.example/*"],
              options: {}
            }
          }),
          remove: async () => {}
        }
      },
      tabs: {
        captureVisibleTab: async () => {
          captureCalls += 1;
          return "data:image/png;base64,test";
        },
        create: async () => {},
        remove: async () => {},
        getCurrent: async () => ({ id: 10, windowId: 20 }),
        query: async () => [{ id: 10, windowId: 20 }]
      }
    },
    document,
    location: { search: "?id=test" },
    ParityViewport: {
      calculateViewportFit(width, height, _containerWidth, _containerHeight, options = {}) {
        return {
          effectiveViewportHeight: options.maxHeight ? 1800 : height,
          renderedHeight: options.maxHeight ? 900 : height * 0.5,
          renderedWidth: width * 0.5,
          scale: 0.5
        };
      }
    },
    ResizeObserver: class FakeResizeObserver {
      observe() {}
    },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setTimeout(callback, duration) {
      if (duration < 1000) {
        queueMicrotask(callback);
        return 0;
      }
      nextTimeoutId += 1;
      scheduledTimeouts.push({ callback, cancelled: false, duration, id: nextTimeoutId });
      return nextTimeoutId;
    },
    window,
    Date,
    Blob,
    Image: FakeImage,
    URL,
    HTMLInputElement: class FakeInputElement {},
    HTMLSelectElement: class FakeSelectElement {},
    HTMLTextAreaElement: class FakeTextAreaElement {}
  };

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "settings-data.js"), "utf8"),
    context,
    { filename: "settings-data.js" }
  );

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "url-parity.js"), "utf8"),
    context,
    { filename: "url-parity.js" }
  );

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "full-page-capture.js"), "utf8"),
    context,
    { filename: "full-page-capture.js" }
  );

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "compare.js"), "utf8"),
    context,
    { filename: "compare.js" }
  );

  elements.get("#reference-back-button").listeners.get("click")();
  elements.get("#reference-forward-button").listeners.get("click")();

  assert.equal(referenceFrame.messages[0].type, "NAVIGATE_HISTORY");
  assert.equal(referenceFrame.messages[0].delta, -1);
  assert.equal(referenceFrame.messages[1].type, "NAVIGATE_HISTORY");
  assert.equal(referenceFrame.messages[1].delta, 1);
  assert.equal(
    replicaFrame.messages.length,
    0,
    "reference history controls must not navigate the replica"
  );

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    elements.get("#fatal-error").hidden,
    true,
    elements.get("#fatal-error-message").textContent
  );

  const helpButton = elements.get("#help-button");
  const quickGuide = elements.get("#quick-guide");
  assert.equal(quickGuide.hidden, false, "the first comparison guide must open automatically");
  assert.equal(helpButton.attributes.get("aria-expanded"), "true");
  await elements.get("#dismiss-guide-button").listeners.get("click")();
  assert.equal(quickGuide.hidden, true);
  assert.equal(storageWrites.at(-1).comparisonGuideDismissed, true);
  helpButton.listeners.get("click")();
  assert.equal(quickGuide.hidden, false, "Help must reopen dismissed guidance");
  documentListeners.get("keydown")({
    event: undefined,
    key: "Escape",
    preventDefault() {},
    target: new FakeElement()
  });
  assert.equal(quickGuide.hidden, true, "Escape must close the guide");

  assert.equal(elements.get("#reference-status").hidden, false);
  assert.equal(elements.get("#replica-status").hidden, false);
  assert.equal(elements.get("#reference-status-message").textContent, "Loading reference…");
  assert.equal(elements.get("#replica-status-message").textContent, "Loading implementation…");

  for (const timeout of scheduledTimeouts.filter(({ duration }) => duration === 15000)) {
    if (!timeout.cancelled) {
      timeout.callback();
    }
  }

  assert.match(
    elements.get("#reference-status-message").textContent,
    /may block side-by-side display/i
  );
  assert.equal(elements.get("#reference-compatibility-retry").hidden, false);
  assert.match(
    elements.get("#reference-compatibility-scope").textContent,
    /not browser-wide.*only to these two sites in this tab/i
  );

  const referenceUrlBeforeRetry = referenceFrame.src;
  const replicaUrlBeforeRetry = replicaFrame.src;
  await elements.get("#reference-compatibility-retry").listeners.get("click")();

  assert.equal(prepareRequests.length, 2);
  assert.deepEqual(prepareRequests[1].origins, [
    "https://reference.example/*",
    "https://replica.example/*"
  ]);
  assert.equal(prepareRequests[1].compatibilityMode, true);
  assert.equal(prepareRequests[1].broadHostAccess, false);
  assert.equal(referenceFrame.src, referenceUrlBeforeRetry);
  assert.equal(replicaFrame.src, replicaUrlBeforeRetry);
  assert.equal(
    elements.get("#mode-indicator").textContent,
    "Compatibility mode is on for these two sites in this tab"
  );
  assert.equal(elements.get("#reference-compatibility-retry").hidden, true);
  assert.equal(elements.get("#replica-compatibility-retry").hidden, true);

  const maxHeightToggle = elements.get("#max-height-toggle");
  maxHeightToggle.checked = true;
  maxHeightToggle.listeners.get("change")();

  assert.equal(referenceFrame.style.height, "1800px");
  assert.equal(replicaFrame.style.height, "1800px");
  assert.equal(elements.get("#reference-shell").style.height, "900px");
  assert.equal(elements.get("#replica-shell").style.height, "900px");
  assert.equal(storageWrites.at(-1).maxHeight, true);
  assert.equal(referenceFrame.messages.at(-1).type, "REFLOW_SCROLL");
  assert.equal(replicaFrame.messages.at(-1).type, "REFLOW_SCROLL");

  const blinkToggle = elements.get("#blink-toggle");
  const comparison = elements.get("#comparison");
  const blinkRevealButton = elements.get("#blink-reveal-button");
  blinkToggle.checked = true;
  blinkToggle.listeners.get("change")();
  assert.equal(comparison.classList.contains("is-blinking"), true);
  assert.equal(comparison.attributes.get("aria-label"), "Blink website comparison");
  assert.equal(blinkRevealButton.hidden, false);

  blinkRevealButton.listeners.get("pointerdown")({ preventDefault() {} });
  assert.equal(comparison.classList.contains("is-showing-replica"), true);
  assert.equal(blinkRevealButton.attributes.get("aria-pressed"), "true");
  windowListeners.get("pointerup")();
  assert.equal(comparison.classList.contains("is-showing-replica"), false);

  windowListeners.get("message")({
    source: referenceFrame.contentWindow,
    data: { channel: "parity-scrollr-sync-v1", type: "FRAME_READY" }
  });
  windowListeners.get("message")({
    source: replicaFrame.contentWindow,
    data: { channel: "parity-scrollr-sync-v1", type: "FRAME_READY" }
  });
  assert.equal(elements.get("#reference-status").hidden, true);
  assert.equal(elements.get("#replica-status").hidden, true);

  const urlParityToggle = elements.get("#url-parity-toggle");
  assert.equal(urlParityToggle.checked, false, "URL parity must be off by default");
  assert.equal(
    elements.get("#url-details-toggle").disabled,
    true,
    "query and hash controls must be unavailable until URL parity is enabled"
  );

  windowListeners.get("message")({
    source: referenceFrame.contentWindow,
    data: {
      channel: "parity-scrollr-sync-v1",
      type: "URL_CHANGED",
      url: "https://reference.example/collections/books"
    }
  });
  assert.equal(
    replicaFrame.src,
    "https://replica.example/",
    "independent navigation must remain independent while URL parity is off"
  );

  urlParityToggle.checked = true;
  urlParityToggle.listeners.get("change")();
  assert.equal(elements.get("#url-details-toggle").disabled, false);
  windowListeners.get("message")({
    source: referenceFrame.contentWindow,
    data: {
      channel: "parity-scrollr-sync-v1",
      type: "URL_CHANGED",
      url: "https://reference.example/products/photo-book?size=large#details"
    }
  });
  assert.equal(
    replicaFrame.src,
    "https://replica.example/products/photo-book"
  );
  assert.equal(
    elements.get("#replica-address").textContent,
    "https://replica.example/products/photo-book"
  );

  const referenceUrlBeforeMirroredLoad = referenceFrame.src;
  windowListeners.get("message")({
    source: replicaFrame.contentWindow,
    data: {
      channel: "parity-scrollr-sync-v1",
      type: "URL_CHANGED",
      url: "https://replica.example/products/photo-book?size=large#details"
    }
  });
  assert.equal(
    referenceFrame.src,
    referenceUrlBeforeMirroredLoad,
    "the mirrored load must not bounce back and create a navigation loop"
  );

  windowListeners.get("message")({
    source: replicaFrame.contentWindow,
    data: {
      channel: "parity-scrollr-sync-v1",
      type: "URL_CHANGED",
      url: "https://replica.example/pages/about?source=footer"
    }
  });
  assert.equal(
    referenceFrame.src,
    "https://reference.example/pages/about",
    "navigation from either pane must mirror to the other origin"
  );

  await elements.get("#capture-button").listeners.get("click")();
  assert.equal(downloadLinks.length, 1);
  assert.equal(downloadLinks[0].href, "data:image/png;base64,test");
  assert.match(downloadLinks[0].download, /^parity-scrollr-.*\.png$/);
  assert.equal(downloadLinks[0].clicked, true);

  window.innerHeight = 900;
  window.innerWidth = 1030;
  elements.get("#full-page-button").listeners.get("click")();
  for (let attempt = 0; attempt < 20 && downloadLinks.length < 2; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(
    downloadLinks.length,
    2,
    `${elements.get("#full-page-button").textContent}: ${elements.get("#full-page-button").title}`
  );
  assert.match(downloadLinks[1].download, /^parity-scrollr-full-page-.*\.png$/);
  assert.equal(downloadLinks[1].clicked, true);
  assert.equal(elements.get("#full-page-button").textContent, "Saved full page");
  assert.equal(captureCalls, 4, "full-page capture must stitch three scrolling screenshots");
  assert.equal(frameMetrics.y, 0, "full-page capture must restore the original scroll position");
  assert.equal(elements.get("#sync-toggle").disabled, false);

  console.log("comparison controls, blink, status, and capture integrations: PASS");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
