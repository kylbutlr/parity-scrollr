const CHANNEL = "parity-scrollr-sync-v1";
const referenceFrame = document.querySelector("#reference-frame");
const replicaFrame = document.querySelector("#replica-frame");
const referenceSiteSandbox = referenceFrame.getAttribute("sandbox");
const referenceAddress = document.querySelector("#reference-address");
const referencePaneLabel = document.querySelector("#reference-pane-label");
const referenceWidthWarning = document.querySelector("#reference-width-warning");
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
const comparisonOptions = document.querySelector("#comparison-options");
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
const referenceCompatibilityRetry = document.querySelector("#reference-compatibility-retry");
const replicaCompatibilityRetry = document.querySelector("#replica-compatibility-retry");
const referenceCompatibilityScope = document.querySelector("#reference-compatibility-scope");
const replicaCompatibilityScope = document.querySelector("#replica-compatibility-scope");
const fullCaptureControls = [
  ...document.querySelectorAll(".toolbar button, .toolbar input, .toolbar select"),
  helpButton,
  dismissGuideButton
];

const FRAME_READY_TIMEOUT = 15000;
const FRAME_CAPTURE_TIMEOUT = 8000;
const MAX_FULL_PAGE_CAPTURES = 60;
function captureColor(token) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}
const frameStatuses = new Map([
  [
    referenceFrame,
    {
      element: referenceStatus,
      label: "reference",
      message: referenceStatusMessage,
      retry: referenceCompatibilityRetry,
      scope: referenceCompatibilityScope,
      timer: 0
    }
  ],
  [
    replicaFrame,
    {
      element: replicaStatus,
      label: "implementation",
      message: replicaStatusMessage,
      retry: replicaCompatibilityRetry,
      scope: replicaCompatibilityScope,
      timer: 0
    }
  ]
]);

let pair;
let comparisonTabId = null;
let captureAccess = false;
let viewportSize = { width: 1440, height: 900 };
let lastPagePosition = { kind: "page", x: 0, y: 0 };
const framePositions = new Map();
let reflowFrame = 0;
let reflowTimer = 0;
let captureRequestId = 0;
let fullPageCaptureState = null;
let fullPageFeedbackTimer = 0;
let compatibilityRetryInProgress = false;
let automaticCompatibilityRetryAttempted = false;
const pendingCaptureRequests = new Map();
const frameBaseUrls = new Map();
const currentFrameUrls = new Map();
const pendingMirroredFrames = new Set();

class FullPageCaptureCancelled extends Error {}

function isImageReference() {
  return pair?.referenceKind === "image";
}

function imageReferenceUrl(imageId) {
  return chrome.runtime.getURL(`image-reference.html?id=${encodeURIComponent(imageId)}`);
}

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
  status.state = state;
  status.element.classList.toggle("is-warning", state === "warning");
  status.retry.hidden = true;
  status.retry.disabled = false;
  status.retry.textContent = "Retry with Compatibility mode";
  status.scope.hidden = true;

  if (state === "ready") {
    status.element.hidden = true;
    return;
  }

  status.element.hidden = false;
  if (state === "image-error") {
    status.message.textContent = "The design image could not load.";
    status.scope.textContent = "End this comparison and import the image again.";
    status.scope.hidden = false;
    return;
  }
  if (state === "warning") {
    if (frame === referenceFrame && isImageReference()) {
      setFrameStatus(frame, "image-error");
      return;
    }
    const label = `${status.label[0].toUpperCase()}${status.label.slice(1)}`;
    if (pair?.options?.compatibilityMode === true) {
      status.message.textContent = `${label} still cannot load in Compatibility mode.`;
      status.scope.textContent = "Open it in a tab to check sign-in, bot protection, or other site restrictions.";
      status.scope.hidden = false;
      return;
    }

    if (compatibilityRetryInProgress) {
      status.message.textContent = "Retrying with Compatibility mode…";
      return;
    }
    if (!automaticCompatibilityRetryAttempted && pair && comparisonTabId && !fullPageCaptureState) {
      automaticCompatibilityRetryAttempted = true;
      retryWithCompatibilityMode({ automatic: true });
      return;
    }

    status.message.textContent = `${label} may block side-by-side display.`;
    status.scope.textContent = "Compatibility mode retries with some page protections temporarily disabled for the selected sites in this tab. This can change which scripts and resources the pages load. It turns off when the comparison ends.";
    status.scope.hidden = false;
    status.retry.hidden = false;
    return;
  }

  status.message.textContent = `Loading ${status.label}…`;
  status.timer = setTimeout(() => setFrameStatus(frame, "warning"), FRAME_READY_TIMEOUT);
}

function setBothFramesLoading() {
  setFrameStatus(referenceFrame, "loading");
  setFrameStatus(replicaFrame, "loading");
}

function setCompatibilityRetryBusy(isBusy) {
  for (const retry of [referenceCompatibilityRetry, replicaCompatibilityRetry]) {
    retry.disabled = isBusy;
    retry.textContent = isBusy ? "Enabling…" : "Retry with Compatibility mode";
  }
}

function showCompatibilityRetryError(message, frames) {
  for (const frame of frames) {
    const status = frameStatuses.get(frame);
    status.state = "warning";
    status.element.hidden = false;
    status.element.classList.add("is-warning");
    status.message.textContent = "Compatibility mode could not be enabled.";
    status.scope.textContent = `${message} Try again, or open the page in a regular tab.`;
    status.scope.hidden = false;
    status.retry.hidden = false;
  }
}

function reloadCurrentFrames(frames = [referenceFrame, replicaFrame]) {
  for (const frame of frames) {
    setFrameStatus(frame, "loading");
    frame.src = frame === referenceFrame
      ? isImageReference() ? imageReferenceUrl(pair.referenceImage.imageId) : currentFrameUrls.get(frame) || pair.referenceUrl
      : currentFrameUrls.get(frame) || pair.replicaUrl;
  }
}

async function retryWithCompatibilityMode({ automatic = false } = {}) {
  if (compatibilityRetryInProgress || !pair || !comparisonTabId || fullPageCaptureState) {
    return;
  }

  const frames = [...frameStatuses].filter(([frame, status]) =>
    !(frame === referenceFrame && isImageReference()) && status.state !== "ready"
  ).map(([frame]) => frame);
  if (!frames.length) return;
  compatibilityRetryInProgress = true;
  setCompatibilityRetryBusy(true);
  for (const frame of frames) {
    const status = frameStatuses.get(frame);
    clearTimeout(status.timer);
    status.timer = 0;
    status.message.textContent = `Retrying ${status.label} with Compatibility mode…`;
    status.retry.hidden = true;
  }
  if (automatic) modeIndicator.textContent = "Preview not ready; trying Compatibility mode automatically…";

  try {
    const result = await chrome.runtime.sendMessage({
      type: "PREPARE_COMPARISON_TAB",
      origins: pair.origins,
      broadHostAccess: pair.options?.broadHostAccess === true,
      compatibilityMode: true,
      imageId: pair.referenceImage?.imageId
    });
    if (!result?.ok || result.session?.compatibilityMode !== true) {
      throw new Error(result?.error || "The temporary comparison setting was not applied.");
    }

    pair = {
      ...pair,
      options: {
        ...pair.options,
        compatibilityMode: true
      }
    };
    modeIndicator.textContent = automatic
      ? "Compatibility mode enabled automatically for the selected sites in this tab"
      : isImageReference()
      ? "Compatibility mode is on for the implementation site in this tab"
      : "Compatibility mode is on for these two sites in this tab";
    reloadCurrentFrames(frames);
  } catch (error) {
    if (automatic) modeIndicator.textContent = "Automatic Compatibility retry failed. See the page warning.";
    showCompatibilityRetryError(error.message, frames);
  } finally {
    compatibilityRetryInProgress = false;
    setCompatibilityRetryBusy(false);
  }
}

referenceCompatibilityRetry.addEventListener("click", () => retryWithCompatibilityMode());
replicaCompatibilityRetry.addEventListener("click", () => retryWithCompatibilityMode());

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
    enabled
      ? isImageReference() ? "Blink design comparison" : "Blink website comparison"
      : isImageReference() ? "Side-by-side design comparison" : "Side-by-side website comparison"
  );
  blinkRevealButton.hidden = !enabled;
  setReplicaPreview(false);
  updateViewportFrames();
}

function sendScrollReflow() {
  if (fullPageCaptureState) return;
  for (const frame of [referenceFrame, replicaFrame]) {
    frame.contentWindow?.postMessage({
      channel: CHANNEL,
      type: "REFLOW_SCROLL",
      position: syncToggle.checked
        ? lastPagePosition
        : framePositions.get(frame) || { kind: "page", x: 0, y: 0 }
    }, "*");
  }
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

  if (isImageReference()) {
    const { cssWidth, pixelWidth } = pair.referenceImage;
    const notes = [];
    if (viewportSize.width !== cssWidth) {
      notes.push(`Design is ${cssWidth}px wide; select a matching frame for ${viewportSize.width}px QA.`);
    }
    if (pixelWidth < cssWidth) {
      notes.push(`Image is ${pixelWidth}px wide; import a higher-resolution export for pixel comparison.`);
    }
    referenceWidthWarning.textContent = notes.join(" ");
    referenceWidthWarning.hidden = notes.length === 0;
    referenceWidthWarning.title = referenceWidthWarning.textContent;
  }

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
  if (position?.kind === "page") framePositions.set(target, position);
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
  if (sourceFrame === referenceFrame && isImageReference()) {
    return;
  }
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
      framePositions.set(frameForWindow(event.source), event.data.position);
    }
    relayScroll(event.source, event.data.position);
  } else if (event.data.type === "REFLOWED_SCROLL_POSITION") {
    if (event.data.position?.kind === "page") {
      framePositions.set(frameForWindow(event.source), event.data.position);
    }
    relayScroll(event.source, event.data.position);
  } else if (event.data.type === "URL_CHANGED") {
    handleFrameUrlChange(event.source, event.data.url);
  } else if (event.data.type === "REFERENCE_IMAGE_ERROR" && isImageReference()) {
    setFrameStatus(referenceFrame, "image-error");
    referenceStatusMessage.textContent = event.data.message || "The design image could not load.";
  }
});

function setPair(nextPair) {
  pair = { ...pair, ...nextPair };
  lastPagePosition = { kind: "page", x: 0, y: 0 };
  framePositions.clear();
  const image = isImageReference();
  if (image) {
    // This extension-owned page shares our origin, so these two sandbox grants cannot isolate it.
    referenceFrame.removeAttribute("sandbox");
  } else {
    referenceFrame.setAttribute("sandbox", referenceSiteSandbox);
  }
  frameBaseUrls.set(referenceFrame, image ? null : pair.referenceUrl);
  frameBaseUrls.set(replicaFrame, pair.replicaUrl);
  currentFrameUrls.set(referenceFrame, image ? null : pair.referenceUrl);
  currentFrameUrls.set(replicaFrame, pair.replicaUrl);
  pendingMirroredFrames.clear();
  updateFrameAddress(referenceFrame, image
    ? `${pair.referenceImage.name} · ${pair.referenceImage.cssWidth}px design`
    : pair.referenceUrl);
  updateFrameAddress(replicaFrame, pair.replicaUrl);
  referencePaneLabel.textContent = image ? "DESIGN IMAGE" : "REFERENCE";
  referenceFrame.title = image ? "Design image reference" : "Reference site";
  document.querySelector("#reference-open").hidden = image;
  for (const selector of ["#reference-back-button", "#reference-forward-button", "#swap-button"]) {
    document.querySelector(selector).disabled = image;
  }
  urlParityToggle.checked = image ? false : urlParityToggle.checked;
  urlParityToggle.disabled = image;
  urlDetailsToggle.disabled = image || !urlParityToggle.checked;
  updateViewportFrames();
  setBothFramesLoading();
  referenceFrame.src = image
    ? imageReferenceUrl(pair.referenceImage.imageId)
    : pair.referenceUrl;
  replicaFrame.src = pair.replicaUrl;
}

function resetToTop() {
  lastPagePosition = { kind: "page", x: 0, y: 0 };
  framePositions.set(referenceFrame, lastPagePosition);
  framePositions.set(replicaFrame, lastPagePosition);
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
  reloadCurrentFrames();
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
    setGuideOpen(false);
    if (comparisonOptions) comparisonOptions.open = false;
    await new Promise(requestAnimationFrame);
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
  setGuideOpen(false);
  if (comparisonOptions) {
    comparisonOptions.open = false;
    comparisonOptions.inert = true;
  }
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
  if (comparisonOptions) comparisonOptions.inert = false;
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
  patternContext.fillStyle = captureColor("--ui-canvas");
  patternContext.fillRect(0, 0, 24, 24);
  patternContext.fillStyle = captureColor("--ui-surface");
  patternContext.fillRect(0, 0, 12, 12);
  patternContext.fillRect(12, 12, 12, 12);
  context.fillStyle = context.createPattern(patternCanvas, "repeat") || captureColor("--ui-canvas");
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
  ].map((configuration) => {
    const region = ParityFullPage.captureRegion(configuration.firstMetrics);
    const pixelsPerCss = (configuration.rectangle.height /
      (region ? configuration.firstMetrics.viewportHeight : configuration.firstMetrics.clientHeight)) * yRatio;
    const horizontalScale = region
      ? configuration.rectangle.width / configuration.firstMetrics.viewportWidth * xRatio
      : xRatio;
    return {
      ...configuration,
      region,
      horizontalScale,
      pixelsPerCss,
      topHeight: region ? region.top * pixelsPerCss : 0,
      bottomHeight: region ? Math.max(0, configuration.firstMetrics.viewportHeight - region.top - region.height) * pixelsPerCss : 0
    };
  });
  const contentHeight = Math.max(
    ...paneConfigurations.map(
      (configuration) => configuration.topHeight +
        configuration.finalMetrics.scrollHeight * configuration.pixelsPerCss + configuration.bottomHeight
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
      const frameX = configuration.rectangle.left * xRatio;
      const frameTop = configuration.rectangle.top * yRatio;
      const frameWidth = configuration.rectangle.width * xRatio;
      const sourceX = frameX + (configuration.region?.left || 0) * configuration.horizontalScale;
      const sourceWidth = configuration.region
        ? configuration.region.width * configuration.horizontalScale : frameWidth;
      const sourceTop = frameTop + configuration.topHeight;
      const sourceBottom = configuration.region
        ? sourceTop + configuration.region.height * configuration.pixelsPerCss
        : configuration.rectangle.bottom * yRatio;

      if (configuration.region && recordIndex === 0) {
        // Keep static page chrome once, then extend only the scrolling area.
        if (configuration.topHeight > 0) {
          context.drawImage(image, frameX, frameTop, frameWidth, configuration.topHeight,
            frameX, headerHeight, frameWidth, configuration.topHeight);
        }
        const sideHeight = configuration.region.height * configuration.pixelsPerCss;
        const leftWidth = sourceX - frameX;
        const rightX = sourceX + sourceWidth;
        const rightWidth = frameX + frameWidth - rightX;
        for (const [sideX, sideWidth] of [[frameX, leftWidth], [rightX, rightWidth]]) {
          if (sideWidth > 0) {
            context.drawImage(image, sideX, sourceTop, sideWidth, sideHeight,
              sideX, headerHeight + configuration.topHeight, sideWidth, sideHeight);
          }
        }
      }
      const band = ParityFullPage.calculateStitchBand(
        metrics,
        paneState.previousY,
        configuration.pixelsPerCss,
        recordIndex === 0
      );

      if (band.pixelHeight > 0.5) {
        const sourceY = band.sourceFromBottom
          ? sourceBottom - band.pixelHeight
          : sourceTop;
        const destinationY = headerHeight + configuration.topHeight + paneState.appendedPixels;

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
      if (recordIndex === records.length - 1 && configuration.bottomHeight > 0) {
        context.drawImage(image, frameX, sourceBottom, frameWidth, configuration.bottomHeight,
          frameX, headerHeight + configuration.topHeight + paneState.appendedPixels,
          frameWidth, configuration.bottomHeight);
      }
    }

    record.dataUrl = "";
  }

  const dividerX = geometry.comparison.left * xRatio + (geometry.comparison.width * xRatio) / 2;
  context.fillStyle = captureColor("--ui-border-strong");
  context.fillRect(dividerX, headerHeight, Math.max(1, xRatio), contentHeight);
  context.strokeStyle = captureColor("--ui-border-strong");
  context.lineWidth = Math.max(1, xRatio);

  paneConfigurations.forEach((configuration, index) => {
    context.strokeRect(
      configuration.rectangle.left * xRatio,
      headerHeight,
      configuration.rectangle.width * xRatio,
      configuration.topHeight + paneStates[index].appendedPixels + configuration.bottomHeight
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
  clearTimeout(fullPageFeedbackTimer);
  fullPageFeedbackTimer = 0;
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
    originalMetrics.forEach((metrics) => ParityFullPage.captureRegion(metrics));
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
      captureStatus.textContent = `Full-page capture failed: ${error.message}`;
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

    if (outcome === "saved") {
      fullPageFeedbackTimer = setTimeout(() => {
        fullPageFeedbackTimer = 0;
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
  if (isImageReference()) {
    return;
  }
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
  if (event.key === "Escape" && comparisonOptions?.open && !fullPageCaptureState) {
    event.preventDefault();
    comparisonOptions.open = false;
    comparisonOptions.querySelector("summary").focus();
    return;
  }
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
    const activeKey = `activeComparison_${comparisonTabId}`;
    const [stored, preferences] = await Promise.all([
      chrome.storage.session.get([storageKey, activeKey]),
      chrome.storage.local.get(["viewportSize", "maxHeight", "comparisonGuideDismissed"])
    ]);
    const activeSession = stored[activeKey];
    storedPair = activeSession?.comparisonId === comparisonId
      ? activeSession.comparison
      : stored[storageKey];

    if (
      !storedPair?.replicaUrl ||
      (storedPair.referenceKind === "image"
        ? !storedPair.referenceImage?.imageId
        : !storedPair.referenceUrl)
    ) {
      throw new Error("The comparison details expired. Start a new comparison from the extension button.");
    }

    const result = await chrome.runtime.sendMessage({
      type: "PREPARE_COMPARISON_TAB",
      comparisonId,
      comparison: storedPair,
      origins: storedPair.origins,
      broadHostAccess: storedPair.options?.broadHostAccess === true,
      compatibilityMode: storedPair.options?.compatibilityMode === true,
      imageId: storedPair.referenceImage?.imageId
    });
    if (!result?.ok) {
      throw new Error(result?.error || "The comparison tab could not be prepared.");
    }
    await chrome.storage.session.remove(storageKey);

    urlDetailsToggle.checked = storedPair.options?.includeUrlDetails === true;
    urlDetailsToggle.disabled = true;
    modeIndicator.textContent = result.session.compatibilityMode
      ? storedPair.referenceKind === "image"
        ? "Compatibility mode is on for the implementation site in this tab"
        : "Compatibility mode is on for these two sites in this tab"
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
      setViewportSize(
        storedPair.referenceKind === "image"
          ? storedPair.referenceImage.cssWidth
          : preferredViewport.width,
        preferredViewport.height,
        false
      );
    } else {
      setViewportSize(
        storedPair.referenceKind === "image"
          ? storedPair.referenceImage.cssWidth
          : viewportSize.width,
        viewportSize.height,
        false
      );
    }

    setPair(storedPair);
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
