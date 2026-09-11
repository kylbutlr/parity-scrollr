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
}

function createFrameHarness({ elementScroller = false, shopifyPreviewBar = false, siteProfile = "none" } = {}) {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const outboundMessages = [];

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
    previewBar.id = "PBarNextFrame";
  }
  const historyCalls = [];
  const location = { href: "https://frame.example/" };

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
    querySelector(selector) {
      return elementScroller && selector === "div" ? pageWrapper : null;
    },
    querySelectorAll(selector) {
      if (selector === "*") {
        return pageWrapper ? [pageWrapper] : [];
      }
      if (previewBar && selector.includes("PBarNextFrame")) {
        return [previewBar];
      }
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
        sendMessage: async () => ({ active: true, siteProfile })
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
      disconnect() {}
      observe() {}
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

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "scroll-sync.js"), "utf8"),
    context,
    { filename: "scroll-sync.js" }
  );

  return {
    async activate() {
      await Promise.resolve();
      await Promise.resolve();
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
    previewBarDisplay() {
      return previewBar?.style.getPropertyValue("display");
    },
    windowEvent(type) {
      windowListeners.get(type)?.();
    }
  };
}

(async () => {
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

  const nonShopifyCapture = createFrameHarness({ shopifyPreviewBar: true });
  await nonShopifyCapture.activate();
  nonShopifyCapture.prepareCapture();
  assert.equal(nonShopifyCapture.previewBarDisplay(), "");

  const previewCapture = createFrameHarness({ shopifyPreviewBar: true, siteProfile: "shopify" });
  await previewCapture.activate();
  previewCapture.prepareCapture();
  assert.equal(previewCapture.previewBarDisplay(), "none");
  assert.equal(previewCapture.outboundMessages[0].type, "CAPTURE_PREPARE_RESULT");
  assert.equal(previewCapture.outboundMessages[0].result.hiddenOverlays, 1);

  previewCapture.cleanupCapture();
  assert.equal(previewCapture.previewBarDisplay(), "");
  assert.equal(previewCapture.outboundMessages[1].type, "CAPTURE_CLEANUP_RESULT");

  console.log("Shopify preview-bar suppression regression: PASS");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
