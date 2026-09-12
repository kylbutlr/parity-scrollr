const CHANNEL = "parity-scrollr-sync-v1";
const referenceFrame = document.querySelector("#reference-frame");
const replicaFrame = document.querySelector("#replica-frame");
const referenceAddress = document.querySelector("#reference-address");
const replicaAddress = document.querySelector("#replica-address");
const syncToggle = document.querySelector("#sync-toggle");
const urlParityToggle = document.querySelector("#url-parity-toggle");
const urlDetailsToggle = document.querySelector("#url-details-toggle");
const blinkToggle = document.querySelector("#blink-toggle");
const blinkRevealButton = document.querySelector("#blink-reveal-button");
const captureButton = document.querySelector("#capture-button");
const fullPageButton = document.querySelector("#full-page-button");
const modeIndicator = document.querySelector("#mode-indicator");
const captureStatus = document.querySelector("#capture-status");
const loading = document.querySelector("#loading");
const fatalError = document.querySelector("#fatal-error");
const fatalErrorMessage = document.querySelector("#fatal-error-message");
const helpButton = document.querySelector("#help-button");
const quickGuide = document.querySelector("#quick-guide");
const dismissGuideButton = document.querySelector("#dismiss-guide-button");
const viewportPreset = document.querySelector("#viewport-preset");
const viewportWidthInput = document.querySelector("#viewport-width");
const viewportHeightInput = document.querySelector("#viewport-height");
const maxHeightToggle = document.querySelector("#max-height-toggle");
const scaleIndicator = document.querySelector("#scale-indicator");
const referenceStage = document.querySelector("#reference-stage");
const replicaStage = document.querySelector("#replica-stage");
const referenceShell = document.querySelector("#reference-shell");
const replicaShell = document.querySelector("#replica-shell");
const comparison = document.querySelector("#comparison");
const referenceStatus = document.querySelector("#reference-status");
const replicaStatus = document.querySelector("#replica-status");
const referenceStatusMessage = document.querySelector("#reference-status-message");
const replicaStatusMessage = document.querySelector("#replica-status-message");
const fullCaptureControls = [
  ...document.querySelectorAll(".toolbar button, .toolbar input, .toolbar select")
];

const FRAME_READY_TIMEOUT = 15000;
const FRAME_CAPTURE_TIMEOUT = 8000;
const MAX_FULL_PAGE_CAPTURES = 60;
const CAPTURE_THEME = Object.freeze({
  borderStrong: "#465351",
  canvas: "#0d1010",
  surface: "#171b1b"
});
const frameStatuses = new Map([
  [
    referenceFrame,
    { element: referenceStatus, message: referenceStatusMessage, label: "reference", timer: 0 }
  ],
  [
    replicaFrame,
    { element: replicaStatus, message: replicaStatusMessage, label: "implementation", timer: 0 }
  ]
]);

let pair;
let comparisonTabId = null;
let captureAccess = false;
let viewportSize = { width: 1440, height: 900 };
let lastPagePosition = { kind: "page", x: 0, y: 0 };
let reflowFrame = 0;
let reflowTimer = 0;
let captureRequestId = 0;
let fullPageCaptureState = null;
const pendingCaptureRequests = new Map();
const frameBaseUrls = new Map();
const currentFrameUrls = new Map();
const pendingMirroredFrames = new Set();

class FullPageCaptureCancelled extends Error {}

function delay(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function requestFrameCaptureData(frame, type, expectedType, payload = {}) {
  return new Promise((resolve, reject) => {
    captureRequestId += 1;
    const requestId = captureRequestId;
    const timer = setTimeout(() => {
      pendingCaptureRequests.delete(requestId);
      reject(new Error("A page did not respond during full-page capture."));
    }, FRAME_CAPTURE_TIMEOUT);

    pendingCaptureRequests.set(requestId, {
      expectedType,
      frameWindow: frame.contentWindow,
      reject,
      resolve,
      timer
    });

    frame.contentWindow?.postMessage(
      {
        channel: CHANNEL,
        type,
        requestId,
        ...payload
      },
      "*"
    );
  });
}

function readFrameCaptureMetrics(frame) {
  return requestFrameCaptureData(
    frame,
    "CAPTURE_METRICS_REQUEST",
    "CAPTURE_METRICS_RESULT"
  );
}

function scrollFrameForCapture(frame, x, y) {
  return requestFrameCaptureData(
    frame,
    "CAPTURE_SCROLL_REQUEST",
    "CAPTURE_SCROLL_RESULT",
    { x, y }
  );
}

function prepareFrameForCapture(frame) {
  return requestFrameCaptureData(
    frame,
    "CAPTURE_PREPARE_REQUEST",
    "CAPTURE_PREPARE_RESULT"
  );
}

function cleanupFrameAfterCapture(frame) {
  return requestFrameCaptureData(
    frame,
    "CAPTURE_CLEANUP_REQUEST",
    "CAPTURE_CLEANUP_RESULT"
  );
}

function setFrameStatus(frame, state) {
  const status = frameStatuses.get(frame);
  if (!status) {
    return;
  }

  clearTimeout(status.timer);
  status.timer = 0;
  status.element.classList.toggle("is-warning", state === "warning");

  if (state === "ready") {
    status.element.hidden = true;
    return;
  }

  status.element.hidden = false;
  if (state === "warning") {
    status.message.textContent = `${status.label[0].toUpperCase()}${status.label.slice(1)} is taking longer than expected. If it stays blank, restart with Compatibility mode.`;
    return;
  }

  status.message.textContent = `Loading ${status.label}…`;
  status.timer = setTimeout(() => setFrameStatus(frame, "warning"), FRAME_READY_TIMEOUT);
}

function setBothFramesLoading() {
  setFrameStatus(referenceFrame, "loading");
  setFrameStatus(replicaFrame, "loading");
}

function setReplicaPreview(showReplica) {
  const active = blinkToggle.checked && showReplica;
  comparison.classList.toggle("is-showing-replica", active);
  blinkRevealButton.classList.toggle("is-active", active);
  blinkRevealButton.setAttribute("aria-pressed", String(active));
  blinkRevealButton.textContent = active ? "Showing implementation" : "Hold B · Implementation";
}

function setBlinkMode(enabled) {
  comparison.classList.toggle("is-blinking", enabled);
  comparison.setAttribute(
    "aria-label",
    enabled ? "Blink website comparison" : "Side-by-side website comparison"
  );
  blinkRevealButton.hidden = !enabled;
  setReplicaPreview(false);
  updateViewportFrames();
}

function sendScrollReflow() {
  const message = {
    channel: CHANNEL,
    type: "REFLOW_SCROLL",
    position: lastPagePosition
  };
  referenceFrame.contentWindow?.postMessage(message, "*");
  replicaFrame.contentWindow?.postMessage(message, "*");
}

function scheduleScrollReflow() {
  if (!pair) {
    return;
  }

  cancelAnimationFrame(reflowFrame);
  clearTimeout(reflowTimer);
  reflowFrame = requestAnimationFrame(sendScrollReflow);
  reflowTimer = setTimeout(sendScrollReflow, 250);
}

function updateViewportFrames() {
  const containerWidth = Math.min(referenceStage.clientWidth, replicaStage.clientWidth);
  const containerHeight = Math.min(referenceStage.clientHeight, replicaStage.clientHeight);
  const {
    scale,
    renderedWidth,
    renderedHeight,
    effectiveViewportHeight
  } = ParityViewport.calculateViewportFit(
    viewportSize.width,
    viewportSize.height,
    containerWidth,
    containerHeight,
    { maxHeight: maxHeightToggle.checked }
  );

  for (const shell of [referenceShell, replicaShell]) {
    shell.style.width = `${renderedWidth}px`;
    shell.style.height = `${renderedHeight}px`;
  }

  for (const frame of [referenceFrame, replicaFrame]) {
    frame.style.width = `${viewportSize.width}px`;
    frame.style.height = `${effectiveViewportHeight}px`;
    frame.style.transform = `scale(${scale})`;
  }

  const displayedHeight = Math.round(effectiveViewportHeight);
  scaleIndicator.textContent = `${Math.round(scale * 100)}%`;
  scaleIndicator.title = `${viewportSize.width} × ${displayedHeight} CSS px${
    maxHeightToggle.checked ? " with max height" : ""
  }, displayed at ${Math.round(scale * 100)}%`;

  scheduleScrollReflow();
}

function matchingPresetValue(width, height) {
  const value = `${width}x${height}`;
  return [...viewportPreset.options].some((option) => option.value === value) ? value : "custom";
}

function setViewportSize(width, height, persist = true) {
  viewportSize = { width, height };
  viewportWidthInput.value = width;
  viewportHeightInput.value = height;
  viewportPreset.value = matchingPresetValue(width, height);
  updateViewportFrames();

  if (persist) {
    chrome.storage.local.set({ viewportSize });
  }
}

function applyViewportInputs() {
  if (!viewportWidthInput.reportValidity() || !viewportHeightInput.reportValidity()) {
    return;
  }

  const width = Number.parseInt(viewportWidthInput.value, 10);
  const height = Number.parseInt(viewportHeightInput.value, 10);

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return;
  }

  setViewportSize(width, height);
}

viewportPreset.addEventListener("change", () => {
  if (viewportPreset.value === "custom") {
    viewportWidthInput.focus();
    viewportWidthInput.select();
    return;
  }

  const [width, height] = viewportPreset.value.split("x").map(Number);
  setViewportSize(width, height);
});

for (const input of [viewportWidthInput, viewportHeightInput]) {
  input.addEventListener("input", () => {
    viewportPreset.value = "custom";
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyViewportInputs();
    }
  });
}

document.querySelector("#apply-viewport").addEventListener("click", applyViewportInputs);

maxHeightToggle.addEventListener("change", () => {
  updateViewportFrames();
  chrome.storage.local.set({ maxHeight: maxHeightToggle.checked });
});

urlParityToggle.addEventListener("change", () => {
  if (!urlParityToggle.checked) {
    pendingMirroredFrames.clear();
  }
  urlDetailsToggle.disabled = !urlParityToggle.checked;
});

function setGuideOpen(open, returnFocus = false) {
  quickGuide.hidden = !open;
  helpButton.setAttribute("aria-expanded", String(open));
  if (!open && returnFocus) {
    helpButton.focus();
  }
}

helpButton.addEventListener("click", () => {
  if (quickGuide.hidden) {
    setGuideOpen(true);
    return;
  }
  setGuideOpen(false);
  chrome.storage.local.set({ comparisonGuideDismissed: true }).catch(() => {});
});

dismissGuideButton.addEventListener("click", async () => {
  setGuideOpen(false, true);
  await chrome.storage.local.set({ comparisonGuideDismissed: true });
});

new ResizeObserver(updateViewportFrames).observe(document.querySelector("#comparison"));

function relayScroll(source, position) {
  if (!syncToggle.checked) {
    return;
  }

  const target = source === referenceFrame.contentWindow ? replicaFrame : referenceFrame;
  target.contentWindow?.postMessage(
    {
      channel: CHANNEL,
      type: "APPLY_SCROLL",
      position
    },
    "*"
  );
}

function frameForWindow(frameWindow) {
  return frameWindow === referenceFrame.contentWindow ? referenceFrame : replicaFrame;
}

function oppositeFrame(frame) {
  return frame === referenceFrame ? replicaFrame : referenceFrame;
}

function updateFrameAddress(frame, url) {
  const address = frame === referenceFrame ? referenceAddress : replicaAddress;
  address.textContent = url;
  address.title = url;
}

function handleFrameUrlChange(sourceWindow, value) {
  const sourceFrame = frameForWindow(sourceWindow);
  const sourceUrl = ParityUrl.normalizeUrl(value);
  if (!sourceUrl) {
    return;
  }

  currentFrameUrls.set(sourceFrame, sourceUrl);
  updateFrameAddress(sourceFrame, sourceUrl);

  if (pendingMirroredFrames.has(sourceFrame)) {
    pendingMirroredFrames.delete(sourceFrame);
    return;
  }

  if (!urlParityToggle.checked) {
    return;
  }

  const targetFrame = oppositeFrame(sourceFrame);
  const targetUrl = ParityUrl.matchingUrl(sourceUrl, frameBaseUrls.get(targetFrame), {
    includeDetails: urlDetailsToggle.checked
  });
  if (!targetUrl || targetUrl === currentFrameUrls.get(targetFrame)) {
    return;
  }

  pendingMirroredFrames.add(targetFrame);
  currentFrameUrls.set(targetFrame, targetUrl);
  updateFrameAddress(targetFrame, targetUrl);
  setFrameStatus(targetFrame, "loading");
  targetFrame.src = targetUrl;
}

window.addEventListener("message", (event) => {
  const isKnownFrame =
    event.source === referenceFrame.contentWindow || event.source === replicaFrame.contentWindow;

  if (!isKnownFrame || event.data?.channel !== CHANNEL) {
    return;
  }

  const pendingCaptureRequest = pendingCaptureRequests.get(event.data.requestId);
  if (
    pendingCaptureRequest &&
    pendingCaptureRequest.frameWindow === event.source &&
    pendingCaptureRequest.expectedType === event.data.type
  ) {
    clearTimeout(pendingCaptureRequest.timer);
    pendingCaptureRequests.delete(event.data.requestId);
    pendingCaptureRequest.resolve(event.data.metrics ?? event.data.result);
    return;
  }

  if (event.data.type === "FRAME_LOADING") {
    setFrameStatus(
      event.source === referenceFrame.contentWindow ? referenceFrame : replicaFrame,
      "loading"
    );
  } else if (event.data.type === "FRAME_READY") {
    setFrameStatus(
      event.source === referenceFrame.contentWindow ? referenceFrame : replicaFrame,
      "ready"
    );
  } else if (event.data.type === "SCROLL_POSITION") {
    if (event.data.position?.kind === "page") {
      lastPagePosition = event.data.position;
    }
    relayScroll(event.source, event.data.position);
  } else if (event.data.type === "REFLOWED_SCROLL_POSITION") {
    relayScroll(event.source, event.data.position);
  } else if (event.data.type === "URL_CHANGED") {
    handleFrameUrlChange(event.source, event.data.url);
  }
});

function setPair(nextPair) {
  pair = { ...pair, ...nextPair };
  frameBaseUrls.set(referenceFrame, pair.referenceUrl);
  frameBaseUrls.set(replicaFrame, pair.replicaUrl);
  currentFrameUrls.set(referenceFrame, pair.referenceUrl);
  currentFrameUrls.set(replicaFrame, pair.replicaUrl);
  pendingMirroredFrames.clear();
  updateFrameAddress(referenceFrame, pair.referenceUrl);
  updateFrameAddress(replicaFrame, pair.replicaUrl);
  setBothFramesLoading();
  referenceFrame.src = pair.referenceUrl;
  replicaFrame.src = pair.replicaUrl;
}

function resetToTop() {
  const message = {
    channel: CHANNEL,
    type: "APPLY_SCROLL",
    position: { kind: "page", x: 0, y: 0 }
  };
  referenceFrame.contentWindow?.postMessage(message, "*");
  replicaFrame.contentWindow?.postMessage(message, "*");
}

document.querySelector("#top-button").addEventListener("click", resetToTop);

function navigateReferenceHistory(delta) {
  referenceFrame.contentWindow?.postMessage(
    {
      channel: CHANNEL,
      type: "NAVIGATE_HISTORY",
      delta
    },
    "*"
  );
}

document.querySelector("#reference-back-button").addEventListener("click", () => {
  navigateReferenceHistory(-1);
});

document.querySelector("#reference-forward-button").addEventListener("click", () => {
  navigateReferenceHistory(1);
});

document.querySelector("#swap-button").addEventListener("click", () => {
  setPair({
    referenceUrl: pair.replicaUrl,
    replicaUrl: pair.referenceUrl
  });
});

async function injectComparisonFrames() {
  if (!comparisonTabId) {
    return;
  }
  await chrome.scripting.executeScript({
    target: { tabId: comparisonTabId, allFrames: true },
    files: ["scroll-sync.js"],
    injectImmediately: true
  });
}

for (const frame of [referenceFrame, replicaFrame]) {
  frame.addEventListener("load", () => {
    injectComparisonFrames().catch(() => setFrameStatus(frame, "warning"));
  });
}

function renderCaptureAccess() {
  captureButton.disabled = !captureAccess;
  fullPageButton.disabled = !captureAccess;
  captureStatus.textContent = captureAccess
    ? "Capture ready. Screenshots are saved locally."
    : "To enable capture, click the Parity Scrollr toolbar icon in this tab.";
}

async function refreshCaptureAccess() {
  if (!comparisonTabId) {
    return;
  }
  const [session, broad] = await Promise.all([
    chrome.storage.session.get(`captureAccess_${comparisonTabId}`),
    chrome.permissions.contains({ origins: ParitySettings.BROAD_ORIGINS })
  ]);
  captureAccess = broad || session[`captureAccess_${comparisonTabId}`] === true;
  renderCaptureAccess();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes[`captureAccess_${comparisonTabId}`]) {
    refreshCaptureAccess().catch(() => {});
  }
});

document.querySelector("#reload-button").addEventListener("click", () => {
  setBothFramesLoading();
  referenceFrame.src = currentFrameUrls.get(referenceFrame) || pair.referenceUrl;
  replicaFrame.src = currentFrameUrls.get(replicaFrame) || pair.replicaUrl;
});

blinkToggle.addEventListener("change", () => {
  setBlinkMode(blinkToggle.checked);
});

blinkRevealButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  setReplicaPreview(true);
});

window.addEventListener("pointerup", () => setReplicaPreview(false));
window.addEventListener("pointercancel", () => setReplicaPreview(false));
window.addEventListener("blur", () => setReplicaPreview(false));

function screenshotFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `parity-scrollr-${timestamp}.png`;
}

async function captureComparison() {
  if (!captureAccess) {
    captureStatus.textContent = "Capture is not enabled. Click the extension toolbar icon in this tab first.";
    return;
  }
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: "png" });
    const download = document.createElement("a");
    download.href = dataUrl;
    download.download = screenshotFilename();
    download.click();
    captureButton.textContent = "Saved";
    captureButton.title = "Visible comparison saved as a PNG";
    captureStatus.textContent = "Visible comparison saved locally.";
  } catch (error) {
    captureButton.textContent = "Capture failed";
    captureButton.title = error.message;
    captureStatus.textContent = `Capture failed: ${error.message} Keep this tab active and try again.`;
  }

  setTimeout(() => {
    captureButton.textContent = "Capture view";
    captureButton.title = "Download the visible comparison as a PNG";
  }, 1800);
}

captureButton.addEventListener("click", captureComparison);

function throwIfFullPageCaptureCancelled(state) {
  if (state.cancelled) {
    throw new FullPageCaptureCancelled();
  }
}

function lockFullPageCaptureControls(state) {
  state.disabledControls = new Map();
  for (const control of fullCaptureControls) {
    if (control === fullPageButton) {
      continue;
    }
    state.disabledControls.set(control, control.disabled);
    control.disabled = true;
  }
}

function unlockFullPageCaptureControls(state) {
  for (const [control, wasDisabled] of state.disabledControls || []) {
    control.disabled = wasDisabled;
  }
}

function captureRectangle(element) {
  const rectangle = element.getBoundingClientRect();
  return {
    bottom: rectangle.bottom,
    height: rectangle.height,
    left: rectangle.left,
    right: rectangle.right,
    top: rectangle.top,
    width: rectangle.width
  };
}

function loadCaptureImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A temporary screenshot could not be decoded."));
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("The full-page image could not be encoded."));
      }
    }, "image/png");
  });
}

function paintCaptureBackground(context, width, top, height) {
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = 24;
  patternCanvas.height = 24;
  const patternContext = patternCanvas.getContext("2d");
  patternContext.fillStyle = CAPTURE_THEME.canvas;
  patternContext.fillRect(0, 0, 24, 24);
  patternContext.fillStyle = CAPTURE_THEME.surface;
  patternContext.fillRect(0, 0, 12, 12);
  patternContext.fillRect(12, 12, 12, 12);
  context.fillStyle = context.createPattern(patternCanvas, "repeat") || CAPTURE_THEME.canvas;
  context.fillRect(0, top, width, height);
}

async function verifyCaptureTabIsActive(captureTab) {
  const [activeTab] = await chrome.tabs.query({ active: true, windowId: captureTab.windowId });
  if (activeTab?.id !== captureTab.id) {
    throw new Error("Keep the Parity Scrollr tab active until the full-page capture finishes.");
  }
}

async function positionFramesForCapture(targetY) {
  await Promise.all([
    scrollFrameForCapture(referenceFrame, 0, targetY),
    scrollFrameForCapture(replicaFrame, 0, targetY)
  ]);
  await delay(550);
  return Promise.all([
    readFrameCaptureMetrics(referenceFrame),
    readFrameCaptureMetrics(replicaFrame)
  ]);
}

async function collectFullPageCaptures(captureTab, state) {
  const records = [];
  let targetY = 0;
  let metrics = await positionFramesForCapture(targetY);
  if (
    metrics.some(
      (entry) =>
        !Number.isFinite(entry.clientHeight) ||
        !Number.isFinite(entry.scrollHeight) ||
        entry.clientHeight <= 0 ||
        entry.scrollHeight <= 0
    )
  ) {
    throw new Error("A page reported invalid dimensions for full-page capture.");
  }
  const step = Math.max(
    1,
    Math.floor(Math.min(...metrics.map((entry) => entry.clientHeight)) * 0.9)
  );

  while (records.length < MAX_FULL_PAGE_CAPTURES) {
    throwIfFullPageCaptureCancelled(state);
    await verifyCaptureTabIsActive(captureTab);

    const dataUrl = await chrome.tabs.captureVisibleTab(captureTab.windowId, { format: "png" });
    records.push({ dataUrl, metrics });
    fullPageButton.textContent = `Cancel · ${records.length} captured`;

    const nextTarget = ParityFullPage.nextCaptureTarget(targetY, step, metrics);
    if (nextTarget === null) {
      return records;
    }
    if (nextTarget <= targetY) {
      throw new Error("A page stopped advancing before the full capture was complete.");
    }

    targetY = nextTarget;
    metrics = await positionFramesForCapture(targetY);
  }

  throw new Error("The pages are too long or kept growing while they were being captured.");
}

async function stitchFullPageCaptures(records, geometry, state) {
  const firstImage = await loadCaptureImage(records[0].dataUrl);
  const xRatio = firstImage.naturalWidth / geometry.windowWidth;
  const yRatio = firstImage.naturalHeight / geometry.windowHeight;
  const headerHeight = Math.round(
    Math.min(geometry.reference.top, geometry.replica.top) * yRatio
  );
  const firstMetrics = records[0].metrics;
  const finalMetrics = records.at(-1).metrics;
  const paneConfigurations = [
    {
      finalMetrics: finalMetrics[0],
      firstMetrics: firstMetrics[0],
      rectangle: geometry.reference
    },
    {
      finalMetrics: finalMetrics[1],
      firstMetrics: firstMetrics[1],
      rectangle: geometry.replica
    }
  ].map((configuration) => ({
    ...configuration,
    pixelsPerCss:
      (configuration.rectangle.height / configuration.firstMetrics.clientHeight) * yRatio
  }));
  const contentHeight = Math.max(
    ...paneConfigurations.map(
      (configuration) => configuration.finalMetrics.scrollHeight * configuration.pixelsPerCss
    )
  );
  const rawWidth = firstImage.naturalWidth;
  const rawHeight = Math.ceil(headerHeight + contentHeight);
  const outputScale = ParityFullPage.calculateOutputScale(rawWidth, rawHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rawWidth * outputScale));
  canvas.height = Math.max(1, Math.round(rawHeight * outputScale));
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("The browser could not create a canvas for the stitched image.");
  }

  context.scale(outputScale, outputScale);
  context.drawImage(
    firstImage,
    0,
    0,
    firstImage.naturalWidth,
    headerHeight,
    0,
    0,
    rawWidth,
    headerHeight
  );
  paintCaptureBackground(context, rawWidth, headerHeight, rawHeight - headerHeight);

  const paneStates = paneConfigurations.map(() => ({ appendedPixels: 0, previousY: 0 }));

  for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
    throwIfFullPageCaptureCancelled(state);
    const record = records[recordIndex];
    const image = recordIndex === 0 ? firstImage : await loadCaptureImage(record.dataUrl);

    for (let paneIndex = 0; paneIndex < paneConfigurations.length; paneIndex += 1) {
      const configuration = paneConfigurations[paneIndex];
      const paneState = paneStates[paneIndex];
      const metrics = record.metrics[paneIndex];
      const band = ParityFullPage.calculateStitchBand(
        metrics,
        paneState.previousY,
        configuration.pixelsPerCss,
        recordIndex === 0
      );

      if (band.pixelHeight > 0.5) {
        const sourceX = configuration.rectangle.left * xRatio;
        const sourceWidth = configuration.rectangle.width * xRatio;
        const sourceTop = configuration.rectangle.top * yRatio;
        const sourceBottom = configuration.rectangle.bottom * yRatio;
        const sourceY = band.sourceFromBottom
          ? sourceBottom - band.pixelHeight
          : sourceTop;
        const destinationY = headerHeight + paneState.appendedPixels;

        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          band.pixelHeight,
          sourceX,
          destinationY,
          sourceWidth,
          band.pixelHeight
        );
        paneState.appendedPixels += band.pixelHeight;
      }

      paneState.previousY = metrics.y;
    }

    record.dataUrl = "";
  }

  const dividerX = geometry.comparison.left * xRatio + (geometry.comparison.width * xRatio) / 2;
  context.fillStyle = CAPTURE_THEME.borderStrong;
  context.fillRect(dividerX, headerHeight, Math.max(1, xRatio), contentHeight);
  context.strokeStyle = "rgba(255, 255, 255, 0.2)";
  context.lineWidth = Math.max(1, xRatio);

  paneConfigurations.forEach((configuration, index) => {
    context.strokeRect(
      configuration.rectangle.left * xRatio,
      headerHeight,
      configuration.rectangle.width * xRatio,
      paneStates[index].appendedPixels
    );
  });

  return { canvas, outputScale };
}

function fullPageScreenshotFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `parity-scrollr-full-page-${timestamp}.png`;
}

async function downloadFullPageCanvas(canvas) {
  const blob = await canvasToBlob(canvas);
  const objectUrl = URL.createObjectURL(blob);
  const download = document.createElement("a");
  download.href = objectUrl;
  download.download = fullPageScreenshotFilename();
  download.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
}

async function runFullPageCapture() {
  if (!captureAccess) {
    captureStatus.textContent = "Capture is not enabled. Click the extension toolbar icon in this tab first.";
    return;
  }
  const state = { cancelled: false };
  fullPageCaptureState = state;
  lockFullPageCaptureControls(state);
  fullPageButton.classList.add("is-capturing");
  fullPageButton.textContent = "Capture full page";
  fullPageButton.title = "Click to cancel the full-page capture";

  let originalBlinkMode = false;
  let originalMetrics = null;
  let outcome = "failed";
  let outcomeTitle = "Full-page capture failed.";

  try {
    const captureTab = await chrome.tabs.getCurrent();
    if (!captureTab?.id) {
      throw new Error("The comparison tab could not be identified.");
    }

    originalMetrics = await Promise.all([
      readFrameCaptureMetrics(referenceFrame),
      readFrameCaptureMetrics(replicaFrame)
    ]);
    state.capturePreparationStarted = true;
    await Promise.all([
      prepareFrameForCapture(referenceFrame),
      prepareFrameForCapture(replicaFrame)
    ]);
    originalBlinkMode = blinkToggle.checked;

    if (originalBlinkMode) {
      blinkToggle.checked = false;
      setBlinkMode(false);
      await delay(300);
    }

    const geometry = {
      comparison: captureRectangle(comparison),
      reference: captureRectangle(referenceShell),
      replica: captureRectangle(replicaShell),
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth
    };
    const records = await collectFullPageCaptures(captureTab, state);
    throwIfFullPageCaptureCancelled(state);
    fullPageButton.textContent = "Stitching…";
    const { canvas, outputScale } = await stitchFullPageCaptures(records, geometry, state);
    throwIfFullPageCaptureCancelled(state);
    await downloadFullPageCanvas(canvas);
    outcome = "saved";
    outcomeTitle =
      outputScale < 1
        ? "Full-page comparison saved as a scaled PNG to stay within browser image limits."
        : "Full-page comparison saved as a PNG.";
    captureStatus.textContent = outcomeTitle;
  } catch (error) {
    if (error instanceof FullPageCaptureCancelled) {
      outcome = "cancelled";
      outcomeTitle = "Full-page capture cancelled.";
    } else {
      outcomeTitle = error.message;
      captureStatus.textContent = `Full-page capture failed: ${error.message} Keep this tab active and try again.`;
    }
  } finally {
    fullPageButton.disabled = true;
    fullPageButton.textContent = "Restoring…";

    if (originalBlinkMode) {
      blinkToggle.checked = true;
      setBlinkMode(true);
      await delay(300);
    }

    if (originalMetrics) {
      await Promise.allSettled([
        scrollFrameForCapture(referenceFrame, originalMetrics[0].x, originalMetrics[0].y),
        scrollFrameForCapture(replicaFrame, originalMetrics[1].x, originalMetrics[1].y)
      ]);
    }

    if (state.capturePreparationStarted) {
      await Promise.allSettled([
        cleanupFrameAfterCapture(referenceFrame),
        cleanupFrameAfterCapture(replicaFrame)
      ]);
    }

    unlockFullPageCaptureControls(state);
    fullPageCaptureState = null;
    fullPageButton.disabled = false;
    fullPageButton.classList.remove("is-capturing");
    fullPageButton.title = outcomeTitle;
    fullPageButton.textContent = outcome === "saved"
      ? "Saved full page"
      : outcome === "cancelled"
        ? "Capture full page"
        : "Full capture failed";

    if (outcome !== "cancelled") {
      setTimeout(() => {
        fullPageButton.textContent = "Capture full page";
        fullPageButton.title = "Scroll and stitch both entire pages into one PNG";
      }, 2400);
    }
  }
}

fullPageButton.addEventListener("click", () => {
  if (fullPageCaptureState) {
    fullPageCaptureState.cancelled = true;
    fullPageButton.textContent = "Cancelling…";
    return;
  }

  runFullPageCapture();
});

document.querySelector("#reference-open").addEventListener("click", () => {
  chrome.tabs.create({ url: currentFrameUrls.get(referenceFrame) || pair.referenceUrl });
});

document.querySelector("#replica-open").addEventListener("click", () => {
  chrome.tabs.create({ url: currentFrameUrls.get(replicaFrame) || pair.replicaUrl });
});

document.querySelector("#settings-button").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.querySelector("#fatal-end-button").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "END_COMPARISON" }).catch(() => {});
  if (comparisonTabId) {
    chrome.tabs.remove(comparisonTabId);
  }
});

document.querySelector("#end-button").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "END_COMPARISON" }).catch(() => {});
  if (comparisonTabId) {
    chrome.tabs.remove(comparisonTabId);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !quickGuide.hidden && !fullPageCaptureState) {
    event.preventDefault();
    setGuideOpen(false, true);
    chrome.storage.local.set({ comparisonGuideDismissed: true }).catch(() => {});
    return;
  }

  if (fullPageCaptureState) {
    if (event.key === "Escape") {
      fullPageCaptureState.cancelled = true;
      fullPageButton.textContent = "Cancelling…";
    }
    return;
  }

  const target = event.target;
  const isEditing =
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    target?.isContentEditable;

  if (isEditing) {
    return;
  }

  if (event.key.toLowerCase() === "b" && blinkToggle.checked) {
    event.preventDefault();
    setReplicaPreview(true);
  } else if (event.key.toLowerCase() === "s") {
    syncToggle.checked = !syncToggle.checked;
  } else if (event.key === "0") {
    resetToTop();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key.toLowerCase() === "b") {
    setReplicaPreview(false);
  }
});

async function initialize() {
  let storageKey = null;
  let storedPair = null;
  try {
    const currentTab = await chrome.tabs.getCurrent();
    comparisonTabId = currentTab?.id || null;
    const comparisonId = new URLSearchParams(location.search).get("id");
    if (!comparisonId) {
      throw new Error("This comparison link is incomplete. Start a new comparison from the extension button.");
    }

    storageKey = `comparison_${comparisonId}`;
    const [stored, preferences] = await Promise.all([
      chrome.storage.session.get(storageKey),
      chrome.storage.local.get(["viewportSize", "maxHeight", "comparisonGuideDismissed"])
    ]);
    storedPair = stored[storageKey];

    if (!storedPair?.referenceUrl || !storedPair?.replicaUrl) {
      throw new Error("The comparison details expired. Start a new comparison from the extension button.");
    }

    const result = await chrome.runtime.sendMessage({
      type: "PREPARE_COMPARISON_TAB",
      origins: storedPair.origins,
      broadHostAccess: storedPair.options?.broadHostAccess === true,
      compatibilityMode: storedPair.options?.compatibilityMode === true,
      siteProfile: storedPair.options?.siteProfile
    });
    if (!result?.ok) {
      throw new Error(result?.error || "The comparison tab could not be prepared.");
    }
    await chrome.storage.session.remove(storageKey);

    urlDetailsToggle.checked = storedPair.options?.includeUrlDetails === true;
    urlDetailsToggle.disabled = true;
    modeIndicator.textContent = result.session.compatibilityMode
      ? "Compatibility mode is on for these two sites in this tab"
      : "Standard mode: site protections are unchanged";
    await refreshCaptureAccess();

    maxHeightToggle.checked = preferences.maxHeight === true;

    const preferredViewport = preferences.viewportSize;
    if (
      Number.isInteger(preferredViewport?.width) &&
      Number.isInteger(preferredViewport?.height) &&
      preferredViewport.width >= 240 &&
      preferredViewport.width <= 3840 &&
      preferredViewport.height >= 320 &&
      preferredViewport.height <= 2160
    ) {
      setViewportSize(preferredViewport.width, preferredViewport.height, false);
    } else {
      setViewportSize(viewportSize.width, viewportSize.height, false);
    }

    setPair(storedPair);
    await injectComparisonFrames();
    loading.hidden = true;
    if (preferences.comparisonGuideDismissed !== true) {
      setGuideOpen(true);
    }
  } catch (error) {
    if (comparisonTabId) {
      await chrome.runtime.sendMessage({ type: "END_COMPARISON" }).catch(() => {});
    }
    if (storageKey && storedPair?.origins) {
      await chrome.runtime.sendMessage({
        type: "CANCEL_COMPARISON_LAUNCH",
        storageKey,
        origins: storedPair.origins
      }).catch(() => {});
    }
    loading.hidden = true;
    fatalErrorMessage.textContent = error.message;
    fatalError.hidden = false;
  }
}

initialize();
