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
    attributes: new Map(),
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    },
    hasAttribute(name) {
      return this.attributes.has(name);
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
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
  Object.defineProperty(frame, "src", {
    get() { return this.currentSrc; },
    set(value) {
      this.currentSrc = value;
      this.navigationCount = (this.navigationCount || 0) + 1;
    }
  });
  return frame;
}

const imageDraws = [];
class FakeCanvas extends FakeElement {
  getContext() {
    return {
      createPattern() {
        return "pattern";
      },
      drawImage(...arguments_) { imageDraws.push(arguments_); },
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
  const sessionData = {
    comparison_test: {
      referenceUrl: "https://reference.example/",
      replicaUrl: "https://replica.example/",
      origins: ["https://reference.example/*", "https://replica.example/*"],
      options: {}
    }
  };
  let nextTimeoutId = 0;
  let captureCalls = 0;
  let failNextCapture = false;
  let failCompatibilityPreparation = false;
  let replicaCaptureMetrics = {};
  const preparedFrames = new Set();
  const captureEvents = [];
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
    if (message.type === "CAPTURE_PREPARE_REQUEST") preparedFrames.add(source);
    if (message.type === "CAPTURE_CLEANUP_REQUEST") preparedFrames.delete(source);
    captureEvents.push(message.type);

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
            ? { ...frameMetrics, ...(source === replicaFrame.contentWindow ? replicaCaptureMetrics : {}) }
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
  const compareHtml = fs.readFileSync(path.join(__dirname, "..", "compare.html"), "utf8");
  for (const [frame, id] of [[referenceFrame, "reference-frame"], [replicaFrame, "replica-frame"]]) {
    const sandbox = compareHtml.match(new RegExp(`<iframe id="${id}"[^>]*sandbox="([^"]+)"`))?.[1];
    assert.ok(sandbox, `${id} must begin with the site sandbox`);
    frame.setAttribute("sandbox", sandbox);
  }
  elements.set("#reference-frame", referenceFrame);
  elements.set("#replica-frame", replicaFrame);

  const selectors = [
    "#reference-address",
    "#reference-pane-label",
    "#reference-width-warning",
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
            if (message.compatibilityMode && failCompatibilityPreparation) {
              return { ok: false, error: "Simulated Compatibility preparation failure" };
            }
            sessionData.activeComparison_10 = {
              comparisonId: message.comparisonId || sessionData.activeComparison_10?.comparisonId,
              comparison: message.comparison || sessionData.activeComparison_10?.comparison
            };
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
          get: async () => ({ ...sessionData }),
          remove: async (key) => { delete sessionData[key]; }
        }
      },
      tabs: {
        captureVisibleTab: async () => {
          captureCalls += 1;
          if (preparedFrames.size) {
            assert.equal(preparedFrames.size, 2, "both preview bars must stay suppressed for every stitched screenshot");
          }
          captureEvents.push("SCREENSHOT");
          if (failNextCapture) {
            failNextCapture = false;
            throw new Error("Simulated screenshot failure");
          }
          return "data:image/png;base64,test";
        },
        create: async () => {},
        remove: async () => {},
        getCurrent: async () => ({ id: 10, windowId: 20 }),
        query: async () => [{ id: 10, windowId: 20 }]
      }
    },
    document,
    getComputedStyle: () => ({ getPropertyValue: () => "#151517" }),
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

  const referenceUrlBeforeRetry = referenceFrame.src;
  const replicaUrlBeforeRetry = replicaFrame.src;
  for (const timeout of scheduledTimeouts.filter(({ duration }) => duration === 15000)) {
    if (!timeout.cancelled) {
      timeout.callback();
    }
  }

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(prepareRequests.length, 2, "a preview timeout must retry automatically without a button click");
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
    "Compatibility mode enabled automatically for the selected sites in this tab"
  );
  assert.equal(elements.get("#reference-compatibility-retry").hidden, true);
  assert.equal(elements.get("#replica-compatibility-retry").hidden, true);

  for (const timeout of scheduledTimeouts.filter(({ duration }) => duration === 15000)) {
    if (!timeout.cancelled) timeout.callback();
  }
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(prepareRequests.length, 2, "the automatic retry must stop after one attempt");
  assert.match(elements.get("#reference-status-message").textContent, /still cannot load/i);

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

  const firePreviewTimeouts = () => {
    for (const timeout of scheduledTimeouts.filter(({ duration }) => duration === 15000)) {
      if (!timeout.cancelled) timeout.callback();
    }
  };
  const readyFrame = (frame) => windowListeners.get("message")({
    source: frame.contentWindow,
    data: { channel: "parity-scrollr-sync-v1", type: "FRAME_READY" }
  });
  const referenceNavigations = referenceFrame.navigationCount;
  const requestsBeforeSingleFailure = prepareRequests.length;
  vm.runInNewContext(`pair.options.compatibilityMode = false;
    automaticCompatibilityRetryAttempted = false;
    setFrameStatus(replicaFrame, "loading");`, context);
  firePreviewTimeouts();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(prepareRequests.length, requestsBeforeSingleFailure + 1);
  assert.equal(referenceFrame.navigationCount, referenceNavigations, "automatic retry must preserve a ready pane");
  readyFrame(referenceFrame);
  readyFrame(replicaFrame);
  firePreviewTimeouts();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(prepareRequests.length, requestsBeforeSingleFailure + 1, "ready frames must not trigger another retry");

  failCompatibilityPreparation = true;
  const requestsBeforePreparationFailure = prepareRequests.length;
  vm.runInNewContext(`pair.options.compatibilityMode = false;
    automaticCompatibilityRetryAttempted = false;
    setFrameStatus(replicaFrame, "loading");`, context);
  firePreviewTimeouts();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(prepareRequests.length, requestsBeforePreparationFailure + 1);
  assert.match(elements.get("#replica-compatibility-scope").textContent, /Simulated Compatibility preparation failure/);
  assert.equal(elements.get("#reference-status").hidden, true, "preparation failure must leave the ready pane visible");
  vm.runInNewContext('setFrameStatus(replicaFrame, "warning")', context);
  assert.equal(prepareRequests.length, requestsBeforePreparationFailure + 1, "failed setup must not auto-loop");
  failCompatibilityPreparation = false;
  await elements.get("#replica-compatibility-retry").listeners.get("click")();
  assert.equal(prepareRequests.length, requestsBeforePreparationFailure + 2, "manual recovery remains available after an automatic failure");
  readyFrame(replicaFrame);

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
  assert.equal(preparedFrames.size, 0, "restore overlay state after a successful capture");
  assert.ok(captureEvents.indexOf("CAPTURE_CLEANUP_REQUEST") > captureEvents.lastIndexOf("SCREENSHOT"),
    "preview bars must not be restored before the final screenshot");

  const fullPageButton = elements.get("#full-page-button");
  failNextCapture = true;
  const downloadsBeforeFailure = downloadLinks.length;
  fullPageButton.listeners.get("click")();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(downloadLinks.length, downloadsBeforeFailure);
  assert.equal(preparedFrames.size, 0, "capture failure must restore overlay state");
  assert.match(elements.get("#capture-status").textContent, /Simulated screenshot failure/);

  fullPageButton.listeners.get("click")();
  fullPageButton.listeners.get("click")();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(downloadLinks.length, downloadsBeforeFailure);
  assert.equal(preparedFrames.size, 0, "capture cancellation must restore overlay state");

  const emitScroll = (frame, y) => windowListeners.get("message")({
    source: frame.contentWindow,
    data: {
      channel: "parity-scrollr-sync-v1", type: "SCROLL_POSITION",
      position: { kind: "page", x: 0, y }
    }
  });
  const syncToggle = elements.get("#sync-toggle");
  syncToggle.checked = false;
  emitScroll(referenceFrame, 200);
  emitScroll(replicaFrame, 700);
  maxHeightToggle.listeners.get("change")();
  assert.equal(referenceFrame.messages.at(-1).position.y, 200, "independent reference scroll survives reflow");
  assert.equal(replicaFrame.messages.at(-1).position.y, 700, "independent implementation scroll survives reflow");
  elements.get("#top-button").listeners.get("click")();
  maxHeightToggle.listeners.get("change")();
  assert.equal(referenceFrame.messages.at(-1).position.y, 0, "Top must reset stored reference position");
  assert.equal(replicaFrame.messages.at(-1).position.y, 0, "Top must reset stored implementation position");
  syncToggle.checked = true;

  frameMetrics.nestedScroller = true;
  frameMetrics.viewportWidth = 1000;
  frameMetrics.viewportHeight = 800;
  frameMetrics.captureRegion = { left: 0, top: 0, width: 1000, height: 800 };
  const downloadCount = downloadLinks.length;
  elements.get("#full-page-button").listeners.get("click")();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(downloadLinks.length, downloadCount + 1,
    `a full-viewport page wrapper must capture with Sync scroll enabled: ${elements.get("#capture-status").textContent}`);

  // A scrolling main area below a header and beside a rail must use its own
  // screenshot rectangle, while a normal document in the other pane still works.
  frameMetrics.viewportHeight = 1000;
  frameMetrics.captureRegion = { left: 100, top: 100, width: 800, height: 800 };
  replicaCaptureMetrics = { nestedScroller: false, captureRegion: null };
  const drawCount = imageDraws.length;
  fullPageButton.listeners.get("click")();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(downloadLinks.length, downloadCount + 2, "mixed container and document pages must capture");
  const nestedDraws = imageDraws.slice(drawCount);
  assert.ok(nestedDraws.some((draw) => draw[1] === 60 && draw[2] === 140 && draw[3] === 400 && draw[4] === 320),
    "stitch the actual main-area rectangle using frame viewport scale");
  assert.equal(nestedDraws.filter((draw) => draw[1] === 10 && draw[2] === 100 && draw[3] === 500 && draw[4] === 40).length, 1,
    "keep the outer header once");
  assert.equal(nestedDraws.filter((draw) => draw[1] === 10 && draw[2] === 460 && draw[3] === 500 && draw[4] === 40).length, 1,
    "keep the outer footer once");
  assert.equal(preparedFrames.size, 0, "nested captures restore preview bars");
  assert.equal(frameMetrics.y, 0, "nested captures restore the original scroll position");

  frameMetrics.captureRegion.top = -100;
  fullPageButton.listeners.get("click")();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(downloadLinks.length, downloadCount + 2, "clipped containers must not create incomplete screenshots");
  assert.match(elements.get("#capture-status").textContent, /partly outside/);
  assert.doesNotMatch(elements.get("#capture-status").textContent, /Keep this tab active and try again/,
    "do not append unrelated advice to every capture error");
  const errorTitle = fullPageButton.title;
  for (const timer of scheduledTimeouts.filter((timer) => timer.duration === 2400 && !timer.cancelled)) timer.callback();
  assert.equal(fullPageButton.title, errorTitle, "retain the failure reason until the next attempt");
  frameMetrics.nestedScroller = false;
  replicaCaptureMetrics = {};

  assert.equal(sessionData.comparison_test, undefined, "initialization consumes the launch record");
  await vm.runInNewContext("initialize()", context);
  assert.equal(elements.get("#fatal-error").hidden, true, "reload must use the tab-owned active session");
  assert.equal(referenceFrame.src, "https://reference.example/");
  assert.equal(replicaFrame.src, "https://replica.example/");

  vm.runInNewContext(`setPair({
    referenceKind: "image",
    referenceImage: {
      cssWidth: 1440,
      imageId: "design-test",
      name: "KaramMD.png",
      pixelWidth: 514
    },
    replicaUrl: "https://replica.example/"
  })`, context);
  assert.equal(referenceFrame.src, "chrome-extension://test/image-reference.html?id=design-test");
  assert.equal(referenceFrame.hasAttribute("sandbox"), false, "the trusted image frame must not trigger Chrome's same-origin sandbox warning");
  assert.equal(replicaFrame.hasAttribute("sandbox"), true, "the live site must stay sandboxed");
  assert.equal(elements.get("#reference-pane-label").textContent, "DESIGN IMAGE");
  assert.equal(elements.get("#reference-open").hidden, true);
  assert.equal(elements.get("#reference-back-button").disabled, true);
  assert.equal(elements.get("#swap-button").disabled, true);
  assert.equal(urlParityToggle.disabled, true);
  assert.match(elements.get("#reference-width-warning").textContent, /higher-resolution export/i);

  windowListeners.get("message")({
    source: replicaFrame.contentWindow,
    data: {
      channel: "parity-scrollr-sync-v1",
      type: "SCROLL_POSITION",
      position: { kind: "page", x: 0, y: 600 }
    }
  });
  assert.equal(referenceFrame.messages.at(-1).type, "APPLY_SCROLL");
  assert.equal(referenceFrame.messages.at(-1).position.y, 600);

  sessionData.activeComparison_10.comparison = {
    referenceKind: "image",
    referenceImage: { cssWidth: 1440, imageId: "design-test", name: "Design.png", pixelWidth: 1440 },
    replicaUrl: "https://replica.example/",
    origins: ["https://replica.example/*"],
    options: {}
  };
  await vm.runInNewContext("initialize()", context);
  assert.equal(referenceFrame.src, "chrome-extension://test/image-reference.html?id=design-test",
    "refresh must restore the active image comparison without a launch record");
  assert.equal(referenceFrame.hasAttribute("sandbox"), false);
  assert.equal(elements.get("#fatal-error").hidden, true);

  const requestsBeforeImageFailure = prepareRequests.length;
  vm.runInNewContext(`pair.options.compatibilityMode = false;
    automaticCompatibilityRetryAttempted = false;
    setFrameStatus(referenceFrame, "warning");`, context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(prepareRequests.length, requestsBeforeImageFailure, "a local image failure must not enable Compatibility mode");

  vm.runInNewContext(`setPair({
    referenceKind: "website",
    referenceUrl: "https://reference.example/",
    replicaUrl: "https://replica.example/"
  })`, context);
  assert.equal(referenceFrame.hasAttribute("sandbox"), true, "a website reference must regain the site sandbox");

  console.log("comparison controls, blink, status, and capture integrations: PASS");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
