const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeStyle {
  constructor() {
    this.properties = new Map();
  }

  getPropertyPriority(name) {
    return this.properties.get(name)?.priority || "";
  }

  getPropertyValue(name) {
    return this.properties.get(name)?.value || "";
  }

  removeProperty(name) {
    this.properties.delete(name);
  }

  setProperty(name, value, priority = "") {
    this.properties.set(name, { priority, value });
  }
}

class FakeElement {
  constructor({
    clientHeight = 0,
    localName = "div",
    overflowY = "visible",
    scrollHeight = 0
  } = {}) {
    this.children = [];
    this.clientHeight = clientHeight;
    this.clientWidth = 1200;
    this.clientLeft = 0;
    this.clientTop = 0;
    this.id = "";
    this.isConnected = true;
    this.localName = localName;
    this.parentElement = null;
    this.scrollHeight = scrollHeight;
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this.style = new FakeStyle();
    this._overflowY = overflowY;
  }

  scrollTo({ left, top }) {
    this.scrollLeft = left;
    this.scrollTop = top;
  }

  getBoundingClientRect() {
    return this.rectangle || { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight };
  }
}

function createFrameHarness({
  elementScroller = false,
  injectionCount = 1,
  imageReference = false,
  shopifyPreviewBar = false,
  previewBarVariant = "legacy",
} = {}) {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const outboundMessages = [];
  let activationRequests = 0;
  const mutationObservers = [];

  const parent = {
    postMessage(message) {
      outboundMessages.push(message);
    }
  };

  const body = new FakeElement({ localName: "body", overflowY: elementScroller ? "hidden" : "scroll" });
  const documentElement = new FakeElement({
    clientHeight: 800,
    localName: "html",
    overflowY: elementScroller ? "hidden" : "visible",
    scrollHeight: elementScroller ? 800 : 3000
  });
  const pageWrapper = elementScroller
    ? new FakeElement({ clientHeight: 800, overflowY: "auto", scrollHeight: 3000 })
    : null;
  const previewBar = shopifyPreviewBar ? new FakeElement({ localName: "iframe" }) : null;
  if (previewBar) {
    previewBar.id = previewBarVariant === "relative"
      ? "preview-bar-iframe"
      : previewBarVariant === "legacy" ? "PBarNextFrame" : "unrelated-frame";
    previewBar.src = previewBarVariant === "legacy"
      ? "https://cdn.shopify.com/shopifycloud/preview-bar/index.html"
      : "/preview-ui";
    previewBar.contentDocument = {
      body: { classList: { contains: (name) => previewBarVariant === "admin-body" && name === "shopify-admin" } }
    };
  }
  body.classList = { contains: (name) => name === "shopify-admin" };
  const historyCalls = [];
  const location = imageReference
    ? { href: "chrome-extension://test/image-reference.html", pathname: "/image-reference.html", protocol: "chrome-extension:" }
    : { href: "https://frame.example/" };

  if (pageWrapper) {
    pageWrapper.parentElement = body;
    body.children.push(pageWrapper);
  }

  const document = {
    body,
    documentElement,
    scrollingElement: documentElement,
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (documentListeners.get(type) === listener) documentListeners.delete(type);
    },
    querySelector(selector) {
      return elementScroller && selector === "div" ? pageWrapper : null;
    },
    querySelectorAll(selector) {
      if (selector === "*") {
        return pageWrapper ? [pageWrapper] : [];
      }
      if (previewBar) {
        if (selector === "iframe") return [previewBar];
        const id = selector.match(/^iframe#([\w-]+)/)?.[1];
        const sourceContains = selector.match(/\[src\*="([^"]+)"\]/)?.[1];
        if (id && previewBar.id === id && (!sourceContains || previewBar.src.includes(sourceContains))) {
          return [previewBar];
        }
      }
      if (selector === ".shopify-admin") return [body];
      return [];
    }
  };

  const window = {
    parent,
    top: parent,
    scrollX: 0,
    scrollY: 0,
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    scrollTo({ left, top }) {
      this.scrollX = left;
      this.scrollY = top;
    }
  };

  const context = {
    CSS: { escape: (value) => value },
    Date,
    Element: FakeElement,
    cancelAnimationFrame() {},
    chrome: {
      runtime: {
        sendMessage: async () => {
          activationRequests += 1;
          return { active: true };
        }
      }
    },
    document,
    getComputedStyle(element) {
      return { overflowY: element._overflowY || "visible" };
    },
    history: {
      go(delta) {
        historyCalls.push(delta);
      }
    },
    location,
    MutationObserver: class FakeMutationObserver {
      constructor(callback) { this.callback = callback; mutationObservers.push(this); }
      disconnect() { this.connected = false; }
      observe() { this.connected = true; }
    },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setInterval() {
      return 1;
    },
    window
  };

  const scrollSyncSource = fs.readFileSync(
    path.join(__dirname, "..", "scroll-sync.js"),
    "utf8"
  );
  for (let index = 0; index < injectionCount; index += 1) {
    vm.runInNewContext(scrollSyncSource, context, { filename: "scroll-sync.js" });
  }

  return {
    async activate() {
      await Promise.resolve();
      await Promise.resolve();
    },
    activationRequestCount() {
      return activationRequests;
    },
    apply(position) {
      windowListeners.get("message")({
        source: parent,
        data: {
          channel: "parity-scrollr-sync-v1",
          type: "APPLY_SCROLL",
          position
        }
      });
    },
    captureMetrics(requestId = "metrics") {
      windowListeners.get("message")({
        source: parent,
        data: {
          channel: "parity-scrollr-sync-v1",
          type: "CAPTURE_METRICS_REQUEST",
          requestId
        }
      });
    },
    captureScroll(y, requestId = "scroll") {
      windowListeners.get("message")({
        source: parent,
        data: {
          channel: "parity-scrollr-sync-v1",
          type: "CAPTURE_SCROLL_REQUEST",
          requestId,
          x: 0,
          y
        }
      });
    },
    cleanupCapture(requestId = "cleanup") {
      windowListeners.get("message")({
        source: parent,
        data: {
          channel: "parity-scrollr-sync-v1",
          type: "CAPTURE_CLEANUP_REQUEST",
          requestId
        }
      });
    },
    navigateHistory(delta) {
      windowListeners.get("message")({
        source: parent,
        data: {
          channel: "parity-scrollr-sync-v1",
          type: "NAVIGATE_HISTORY",
          delta
        }
      });
    },
    reportHistoryUrl(url) {
      location.href = url;
      windowListeners.get("popstate")?.();
    },
    prepareCapture(requestId = "prepare") {
      windowListeners.get("message")({
        source: parent,
        data: {
          channel: "parity-scrollr-sync-v1",
          type: "CAPTURE_PREPARE_REQUEST",
          requestId
        }
      });
    },
    reflowScroll(position) {
      windowListeners.get("message")({
        source: parent,
        data: {
          channel: "parity-scrollr-sync-v1",
          type: "REFLOW_SCROLL",
          position
        }
      });
    },
    resizeContent(scrollHeight) {
      if (pageWrapper) {
        pageWrapper.scrollHeight = scrollHeight;
      } else {
        documentElement.scrollHeight = scrollHeight;
      }
    },
    userScroll(y) {
      if (pageWrapper) {
        pageWrapper.scrollTop = y;
        documentListeners.get("scroll")({ target: pageWrapper });
      } else {
        window.scrollY = y;
        documentListeners.get("scroll")({ target: document });
      }
    },
    currentY() {
      return pageWrapper ? pageWrapper.scrollTop : window.scrollY;
    },
    historyCalls,
    outboundMessages,
    pageWrapper,
    previewBarDisplay() {
      return previewBar?.style.getPropertyValue("display");
    },
    previewBar,
    body,
    mutatePreviewBar() {
      for (const observer of mutationObservers) {
        if (observer.connected) observer.callback([{ type: "attributes", target: previewBar }]);
      }
    },
    previewFrameLoaded() {
      documentListeners.get("load")?.();
    },
    windowEvent(type) {
      windowListeners.get(type)?.();
    }
  };
}

(async () => {
  const duplicateInjection = createFrameHarness({ injectionCount: 2 });
  await duplicateInjection.activate();
  assert.equal(
    duplicateInjection.activationRequestCount(),
    1,
    "overlapping comparison registrations must not activate frame coordination twice"
  );

  const frame = createFrameHarness();
  await frame.activate();

  frame.apply({ kind: "viewport", x: 0, y: 500 });
  frame.userScroll(500);
  frame.userScroll(500);
  assert.equal(
    frame.outboundMessages.length,
    0,
    "the exact programmatic scroll acknowledgment must not loop back"
  );

  frame.userScroll(700);

  assert.equal(
    frame.outboundMessages.length,
    1,
    "a user scroll immediately after an applied sync must not be swallowed"
  );
  assert.equal(frame.outboundMessages[0].position.y, 700);

  console.log("bidirectional scroll handoff regression: PASS");

  const staging = createFrameHarness({ elementScroller: true });
  const production = createFrameHarness();
  await staging.activate();
  await production.activate();

  staging.userScroll(900);
  assert.equal(
    staging.outboundMessages[0].position.kind,
    "page",
    "a primary element scroller must be normalized to a page scroll"
  );
  production.apply(staging.outboundMessages[0].position);
  assert.equal(
    production.currentY(),
    900,
    "an element-backed page must synchronize into a viewport-backed page"
  );

  production.userScroll(1200);
  assert.equal(production.outboundMessages[0].position.kind, "page");
  staging.apply(production.outboundMessages[0].position);
  assert.equal(
    staging.currentY(),
    1200,
    "a viewport-backed page must synchronize into an element-backed page"
  );

  console.log("mixed page-scroller regression: PASS");

  staging.navigateHistory(-1);
  staging.navigateHistory(1);
  staging.navigateHistory(2);
  assert.deepEqual(
    staging.historyCalls,
    [-1, 1],
    "history commands must accept only one-step back and forward navigation"
  );

  console.log("reference history regression: PASS");

  staging.userScroll(2400);
  staging.resizeContent(1000);
  staging.reflowScroll({ kind: "page", x: 0, y: 2400 });
  assert.equal(
    staging.currentY(),
    200,
    "a mobile scroll offset must be clamped to the desktop page range after reflow"
  );

  console.log("responsive reflow scroll regression: PASS");

  const lifecycle = createFrameHarness();
  await lifecycle.activate();
  lifecycle.windowEvent("load");
  lifecycle.windowEvent("pagehide");
  assert.deepEqual(
    lifecycle.outboundMessages.map((message) => message.type),
    ["FRAME_READY", "URL_CHANGED", "FRAME_LOADING"],
    "comparison frames must report their loading lifecycle independently"
  );

  console.log("frame loading lifecycle regression: PASS");

  const historyNavigation = createFrameHarness();
  await historyNavigation.activate();
  historyNavigation.reportHistoryUrl(
    "https://frame.example/products/photo-book?size=large#details"
  );
  assert.deepEqual(
    { ...historyNavigation.outboundMessages[0] },
    {
      channel: "parity-scrollr-sync-v1",
      type: "URL_CHANGED",
      url: "https://frame.example/products/photo-book?size=large#details"
    },
    "SPA history updates must be relayed to the comparison controller"
  );

  console.log("frame URL reporting regression: PASS");

  const captureFrame = createFrameHarness();
  await captureFrame.activate();
  captureFrame.captureMetrics();
  assert.equal(captureFrame.outboundMessages[0].type, "CAPTURE_METRICS_RESULT");
  assert.equal(captureFrame.outboundMessages[0].metrics.scrollHeight, 3000);
  assert.equal(captureFrame.outboundMessages[0].metrics.clientHeight, 800);

  captureFrame.captureScroll(2500);
  assert.equal(captureFrame.outboundMessages[1].type, "CAPTURE_SCROLL_RESULT");
  assert.equal(captureFrame.outboundMessages[1].metrics.y, 2200);

  console.log("full-page capture metrics regression: PASS");

  staging.pageWrapper.rectangle = { left: 80, top: 50, width: 1000, height: 700 };
  staging.pageWrapper.clientWidth = 996;
  staging.pageWrapper.clientHeight = 696;
  staging.pageWrapper.clientLeft = 2;
  staging.pageWrapper.clientTop = 2;
  staging.captureMetrics();
  const nestedMetrics = staging.outboundMessages.at(-1).metrics;
  assert.equal(nestedMetrics.nestedScroller, true);
  assert.equal(nestedMetrics.viewportWidth, 1200);
  assert.equal(nestedMetrics.viewportHeight, 800);
  assert.deepEqual({ ...nestedMetrics.captureRegion }, { left: 82, top: 52, width: 996, height: 696 },
    "capture metrics identify the scrolling client area, excluding borders");

  const automaticCapture = createFrameHarness({ shopifyPreviewBar: true });
  await automaticCapture.activate();
  assert.equal(automaticCapture.previewBarDisplay(), "", "normal browsing keeps the preview bar visible");
  automaticCapture.prepareCapture();
  assert.equal(automaticCapture.previewBarDisplay(), "none", "recognized preview bars are hidden without a profile setting");
  automaticCapture.cleanupCapture();
  assert.equal(automaticCapture.previewBarDisplay(), "", "automatic suppression ends with capture");

  const previewCapture = createFrameHarness({ shopifyPreviewBar: true });
  await previewCapture.activate();
  previewCapture.prepareCapture();
  assert.equal(previewCapture.previewBarDisplay(), "none");
  assert.equal(previewCapture.outboundMessages[0].type, "CAPTURE_PREPARE_RESULT");
  assert.equal(previewCapture.outboundMessages[0].result.hiddenOverlays, 1);

  previewCapture.cleanupCapture();
  assert.equal(previewCapture.previewBarDisplay(), "");
  assert.equal(previewCapture.outboundMessages[1].type, "CAPTURE_CLEANUP_RESULT");

  for (const previewBarVariant of ["relative", "admin-body"]) {
    const modernPreview = createFrameHarness({
      shopifyPreviewBar: true, previewBarVariant
    });
    await modernPreview.activate();
    modernPreview.previewBar.style.setProperty("display", "flex", "important");
    modernPreview.prepareCapture();
    assert.equal(modernPreview.previewBarDisplay(), "none",
      `${previewBarVariant}: the preview frame must be hidden during capture`);
    assert.equal(modernPreview.body.style.getPropertyValue("display"), "",
      "the storefront body must never be hidden, even if it has the shopify-admin class");
    modernPreview.previewBar.style.setProperty("display", "block");
    modernPreview.mutatePreviewBar();
    assert.equal(modernPreview.previewBarDisplay(), "none", "keep a rerendered preview hidden during scrolling");
    modernPreview.cleanupCapture();
    assert.equal(modernPreview.previewBarDisplay(), "flex", "restore the exact previous display value");
    assert.equal(modernPreview.previewBar.style.getPropertyPriority("display"), "important");
    modernPreview.mutatePreviewBar();
    modernPreview.previewFrameLoaded();
    assert.equal(modernPreview.previewBarDisplay(), "flex", "cleanup must stop enforcing capture styles");
  }

  const unrelatedFrame = createFrameHarness({
    shopifyPreviewBar: true, previewBarVariant: "ordinary"
  });
  await unrelatedFrame.activate();
  unrelatedFrame.prepareCapture();
  assert.equal(unrelatedFrame.previewBarDisplay(), "", "unrelated embedded frames remain visible");
  unrelatedFrame.cleanupCapture();

  const latePreview = createFrameHarness({
    shopifyPreviewBar: true, previewBarVariant: "ordinary"
  });
  await latePreview.activate();
  latePreview.prepareCapture();
  latePreview.previewBar.contentDocument.body.classList.contains = (name) => name === "shopify-admin";
  latePreview.previewFrameLoaded();
  assert.equal(latePreview.previewBarDisplay(), "none", "detect the preview body when its iframe finishes loading");
  latePreview.cleanupCapture();
  assert.equal(latePreview.previewBarDisplay(), "");

  const foreignFrame = createFrameHarness({
    shopifyPreviewBar: true, previewBarVariant: "ordinary"
  });
  Object.defineProperty(foreignFrame.previewBar, "contentDocument", {
    get() { throw new Error("Cross-origin frame access denied"); }
  });
  await foreignFrame.activate();
  foreignFrame.prepareCapture();
  assert.equal(foreignFrame.previewBarDisplay(), "", "foreign, unrecognized frames stay untouched");
  foreignFrame.cleanupCapture();

  console.log("Shopify preview-bar suppression regression: PASS");

  const imageFrame = createFrameHarness({ imageReference: true });
  await imageFrame.activate();
  assert.equal(imageFrame.activationRequestCount(), 0, "the local image needs no site grant");
  imageFrame.captureMetrics();
  assert.equal(imageFrame.outboundMessages[0].type, "CAPTURE_METRICS_RESULT");
  console.log("local image scroll coordination regression: PASS");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
