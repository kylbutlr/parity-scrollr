(() => {
  const CHANNEL = "parity-scrollr-sync-v1";

  let cachedPrimaryScroller = null;
  let captureOverlayObserver = null;
  let pendingAppliedPosition = null;
  let pendingFrame = 0;
  const hiddenCaptureOverlays = new Map();
  const SHOPIFY_CAPTURE_OVERLAY_SELECTORS = [
    'iframe#PBarNextFrame[src*="cdn.shopify.com/shopifycloud/preview-bar/"]',
    'iframe#preview-bar-iframe[src*="shopify"]'
  ];
  let captureOverlaySelectors = [];

  function hideCaptureOverlays() {
    for (const selector of captureOverlaySelectors) {
      for (const element of document.querySelectorAll(selector)) {
        if (hiddenCaptureOverlays.has(element)) {
          continue;
        }

        hiddenCaptureOverlays.set(element, {
          display: element.style.getPropertyValue("display"),
          priority: element.style.getPropertyPriority("display")
        });
        element.style.setProperty("display", "none", "important");
      }
    }

    return hiddenCaptureOverlays.size;
  }

  function prepareCaptureOverlays() {
    restoreCaptureOverlays();
    const hiddenOverlays = hideCaptureOverlays();
    captureOverlayObserver = new MutationObserver(hideCaptureOverlays);
    captureOverlayObserver.observe(document.documentElement, {
      attributeFilter: ["src"],
      attributes: true,
      childList: true,
      subtree: true
    });
    return hiddenOverlays;
  }

  function restoreCaptureOverlays() {
    captureOverlayObserver?.disconnect();
    captureOverlayObserver = null;
    const restoredOverlays = hiddenCaptureOverlays.size;

    for (const [element, previousStyle] of hiddenCaptureOverlays) {
      if (previousStyle.display) {
        element.style.setProperty("display", previousStyle.display, previousStyle.priority);
      } else {
        element.style.removeProperty("display");
      }
    }

    hiddenCaptureOverlays.clear();
    return restoredOverlays;
  }

  function positionsMatch(first, second) {
    return (
      first?.kind === second?.kind &&
      first?.selector === second?.selector &&
      Math.abs(first.x - second.x) <= 1 &&
      Math.abs(first.y - second.y) <= 1
    );
  }

  function viewportCanScroll() {
    const root = document.scrollingElement;
    if (!root || root.scrollHeight <= root.clientHeight + 1) {
      return false;
    }

    const htmlOverflow = getComputedStyle(document.documentElement).overflowY;
    const bodyOverflow = document.body ? getComputedStyle(document.body).overflowY : "visible";
    const viewportOverflow = htmlOverflow === "visible" ? bodyOverflow : htmlOverflow;

    return viewportOverflow !== "hidden" && viewportOverflow !== "clip";
  }

  function isScrollableElement(element) {
    if (!(element instanceof Element)) {
      return false;
    }

    const overflow = getComputedStyle(element).overflowY;
    return (
      element.scrollHeight > element.clientHeight + 1 &&
      (overflow === "auto" || overflow === "scroll")
    );
  }

  function getPrimaryScroller() {
    const root = document.scrollingElement;

    if (cachedPrimaryScroller === root && viewportCanScroll()) {
      return cachedPrimaryScroller;
    }

    if (
      cachedPrimaryScroller &&
      cachedPrimaryScroller !== root &&
      cachedPrimaryScroller.isConnected &&
      isScrollableElement(cachedPrimaryScroller)
    ) {
      return cachedPrimaryScroller;
    }

    if (viewportCanScroll()) {
      cachedPrimaryScroller = root;
      return cachedPrimaryScroller;
    }

    cachedPrimaryScroller = [...document.querySelectorAll("*")]
      .filter(isScrollableElement)
      .sort(
        (first, second) =>
          second.scrollHeight - second.clientHeight - (first.scrollHeight - first.clientHeight)
      )[0] || root;

    return cachedPrimaryScroller;
  }

  function readPrimaryScroll(scroller) {
    if (scroller === document.scrollingElement) {
      return {
        kind: "page",
        x: window.scrollX,
        y: window.scrollY
      };
    }

    return {
      kind: "page",
      x: scroller?.scrollLeft || 0,
      y: scroller?.scrollTop || 0
    };
  }

  function applyPrimaryScroll(position, clampToRange = false) {
    const primaryScroller = getPrimaryScroller();
    const maxX = Math.max(
      0,
      (primaryScroller?.scrollWidth || 0) - (primaryScroller?.clientWidth || 0)
    );
    const maxY = Math.max(
      0,
      (primaryScroller?.scrollHeight || 0) - (primaryScroller?.clientHeight || 0)
    );
    const x = clampToRange ? Math.min(Math.max(0, position.x), maxX) : position.x;
    const y = clampToRange ? Math.min(Math.max(0, position.y), maxY) : position.y;

    pendingAppliedPosition = { kind: "page", x, y };

    if (primaryScroller === document.scrollingElement) {
      window.scrollTo({ left: x, top: y, behavior: "instant" });
    } else {
      primaryScroller?.scrollTo({ left: x, top: y, behavior: "instant" });
    }

    pendingAppliedPosition = readPrimaryScroll(primaryScroller);
    return pendingAppliedPosition;
  }

  function readCaptureMetrics() {
    const primaryScroller = getPrimaryScroller();
    const position = readPrimaryScroll(primaryScroller);

    return {
      x: position.x,
      y: position.y,
      clientHeight: primaryScroller?.clientHeight || window.innerHeight || 0,
      clientWidth: primaryScroller?.clientWidth || window.innerWidth || 0,
      scrollHeight: primaryScroller?.scrollHeight || 0,
      scrollWidth: primaryScroller?.scrollWidth || 0
    };
  }

  function selectorFor(element) {
    if (!(element instanceof Element)) {
      return null;
    }

    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const parts = [];
    let current = element;

    while (current && current !== document.body && parts.length < 7) {
      let part = current.localName;
      const siblings = current.parentElement
        ? [...current.parentElement.children].filter((child) => child.localName === current.localName)
        : [];

      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }

      parts.unshift(part);
      current = current.parentElement;
    }

    return parts.length ? parts.join(" > ") : null;
  }

  function readScroll(target) {
    const primaryScroller = getPrimaryScroller();

    if (
      target === document ||
      target === document.documentElement ||
      target === document.body ||
      target === document.scrollingElement ||
      target === primaryScroller
    ) {
      return readPrimaryScroll(primaryScroller);
    }

    if (target instanceof Element) {
      return {
        kind: "element",
        selector: selectorFor(target),
        x: target.scrollLeft,
        y: target.scrollTop
      };
    }

    return null;
  }

  function activate(siteProfile) {
    if (globalThis.__parityScrollrActive) {
      return;
    }
    globalThis.__parityScrollrActive = true;
    captureOverlaySelectors = siteProfile === "shopify" ? SHOPIFY_CAPTURE_OVERLAY_SELECTORS : [];
    let lastAnnouncedUrl = null;

    function announceFrameState(type) {
      window.parent.postMessage(
        {
          channel: CHANNEL,
          type
        },
        "*"
      );
    }

    function announceReady() {
      announceFrameState("FRAME_READY");
      announceUrl();
    }

    function announceUrl(value = location.href) {
      const url = value;
      if (url === lastAnnouncedUrl) {
        return;
      }

      lastAnnouncedUrl = url;
      window.parent.postMessage(
        {
          channel: CHANNEL,
          type: "URL_CHANGED",
          url
        },
        "*"
      );
    }

    window.addEventListener(
      "load",
      () => {
        cachedPrimaryScroller = null;
        announceReady();
      },
      { once: true }
    );

    window.addEventListener("pagehide", () => announceFrameState("FRAME_LOADING"));
    window.addEventListener("pageshow", announceReady);
    window.addEventListener("popstate", () => announceUrl());
    window.addEventListener("hashchange", () => announceUrl());
    setInterval(announceUrl, 250);

    if (document.readyState === "complete") {
      announceReady();
    }

    document.addEventListener(
      "scroll",
      (event) => {
        const position = readScroll(event.target);
        if (!position) {
          return;
        }

        if (positionsMatch(pendingAppliedPosition, position)) {
          return;
        }

        // Any scroll that differs from the applied position is real user
        // input and must be relayed immediately, even during a fast handoff.
        pendingAppliedPosition = null;

        cancelAnimationFrame(pendingFrame);
        pendingFrame = requestAnimationFrame(() => {
          window.parent.postMessage(
            {
              channel: CHANNEL,
              type: "SCROLL_POSITION",
              position
            },
            "*"
          );
        });
      },
      true
    );

    window.addEventListener("message", (event) => {
      if (event.source !== window.parent || event.data?.channel !== CHANNEL) {
        return;
      }

      if (event.data.type === "CAPTURE_PREPARE_REQUEST") {
        window.parent.postMessage(
          {
            channel: CHANNEL,
            type: "CAPTURE_PREPARE_RESULT",
            requestId: event.data.requestId,
            result: { hiddenOverlays: prepareCaptureOverlays() }
          },
          "*"
        );
        return;
      }

      if (event.data.type === "CAPTURE_CLEANUP_REQUEST") {
        window.parent.postMessage(
          {
            channel: CHANNEL,
            type: "CAPTURE_CLEANUP_RESULT",
            requestId: event.data.requestId,
            result: { restoredOverlays: restoreCaptureOverlays() }
          },
          "*"
        );
        return;
      }

      if (event.data.type === "CAPTURE_METRICS_REQUEST") {
        cachedPrimaryScroller = null;
        window.parent.postMessage(
          {
            channel: CHANNEL,
            type: "CAPTURE_METRICS_RESULT",
            requestId: event.data.requestId,
            metrics: readCaptureMetrics()
          },
          "*"
        );
        return;
      }

      if (event.data.type === "CAPTURE_SCROLL_REQUEST") {
        cachedPrimaryScroller = null;
        applyPrimaryScroll(
          {
            kind: "page",
            x: Number.isFinite(event.data.x) ? event.data.x : 0,
            y: Number.isFinite(event.data.y) ? event.data.y : 0
          },
          true
        );

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.parent.postMessage(
              {
                channel: CHANNEL,
                type: "CAPTURE_SCROLL_RESULT",
                requestId: event.data.requestId,
                metrics: readCaptureMetrics()
              },
              "*"
            );
          });
        });
        return;
      }

      if (event.data.type === "NAVIGATE_HISTORY") {
        if (event.data.delta === -1 || event.data.delta === 1) {
          history.go(event.data.delta);
        }
        return;
      }

      if (event.data.type === "REFLOW_SCROLL") {
        const position = event.data.position;
        if (position?.kind === "page" || position?.kind === "viewport") {
          cachedPrimaryScroller = null;
          const appliedPosition = applyPrimaryScroll(position, true);
          window.parent.postMessage(
            {
              channel: CHANNEL,
              type: "REFLOWED_SCROLL_POSITION",
              position: appliedPosition
            },
            "*"
          );
        }
        return;
      }

      if (event.data.type !== "APPLY_SCROLL") {
        return;
      }

      const position = event.data.position;
      if (
        !position ||
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y)
      ) {
        return;
      }

      if (position.kind === "page" || position.kind === "viewport") {
        applyPrimaryScroll(position);
        return;
      }

      if (position.kind === "element" && position.selector) {
        try {
          const target = document.querySelector(position.selector);
          if (target) {
            pendingAppliedPosition = position;
            target.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
            pendingAppliedPosition = {
              kind: "element",
              selector: position.selector,
              x: target.scrollLeft,
              y: target.scrollTop
            };
          }
        } catch {
          pendingAppliedPosition = null;
          // A selector can become stale after a client-side rerender. The next
          // user scroll produces a fresh selector, so no recovery is required.
        }
      }
    });
  }

  if (window.parent !== window && window.parent === window.top) {
    chrome.runtime
      .sendMessage({ type: "IS_COMPARISON_FRAME" })
      .then((result) => {
        if (result?.active) {
          activate(result.siteProfile);
        }
      })
      .catch(() => {});
  }
})();
