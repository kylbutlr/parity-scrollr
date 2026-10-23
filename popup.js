const referenceInput = document.querySelector("#reference-url");
const referenceKindInput = document.querySelector("#reference-kind");
const referenceUrlField = document.querySelector("#reference-url-field");
const referenceImageField = document.querySelector("#reference-image-field");
const referenceImageInput = document.querySelector("#reference-image");
const referenceImageHelp = document.querySelector("#reference-image-help");
const referenceCssWidthInput = document.querySelector("#reference-css-width");
const setupIntro = document.querySelector("#setup-intro");
const replicaInput = document.querySelector("#replica-url");
const useCurrentButton = document.querySelector("#use-current");
const setupView = document.querySelector("#setup-view");
const accessReviewView = document.querySelector("#access-review-view");
const captureReadyView = document.querySelector("#capture-ready-view");
const accessNote = document.querySelector("#access-note");
const form = document.querySelector("#compare-form");
const errorMessage = document.querySelector("#error");
const referenceState = document.querySelector("#reference-state");
const accessReviewTitle = document.querySelector("#access-review-title");
const accessReviewEyebrow = document.querySelector("#access-review-eyebrow");
const permissionWarning = document.querySelector("#permission-warning");
const requestedSites = document.querySelector("#requested-sites");
const accessRetention = document.querySelector("#access-retention");
const accessReviewError = document.querySelector("#access-review-error");
const confirmAccessButton = document.querySelector("#confirm-access");
const accessLoadPurpose = document.querySelector("#access-load-purpose");
const accessCoordinatePurpose = document.querySelector("#access-coordinate-purpose");

const MAX_REFERENCE_IMAGE_BYTES = 32 * 1024 * 1024;
const MAX_REFERENCE_IMAGE_PIXELS = 32_000_000;

let activeTab = null;
let settings = ParitySettings.normalize();
let pendingReview = null;

function isImageReference() {
  return referenceKindInput.value === "image";
}

function renderReferenceKind() {
  const image = isImageReference();
  referenceUrlField.hidden = image;
  referenceImageField.hidden = !image;
  referenceInput.required = !image;
  referenceImageInput.required = image;
  referenceCssWidthInput.required = image;
  setupIntro.textContent = image
    ? "Choose a local design export and the live page you want to compare with it."
    : "The page you are viewing is the reference. Add the page you want to compare with it.";
  renderAccessNote();
}

async function inspectReferenceImage(file) {
  if (!file || !["image/png", "image/jpeg"].includes(file.type)) {
    throw new Error("Choose a PNG or JPEG export of the design frame.");
  }
  if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error("The design image must be 32 MiB or smaller. Export a smaller PNG or JPEG.");
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("The design image could not be opened. Export the frame again as PNG or JPEG.");
  }
  const { width, height } = bitmap;
  bitmap.close();
  if (
    width < 1 || height < 1 || height > 28000 ||
    width * height > MAX_REFERENCE_IMAGE_PIXELS
  ) {
    throw new Error("The design image exceeds the supported dimensions. Export a smaller frame.");
  }
  return { width, height };
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only regular http:// or https:// pages can be compared.");
  }
  if (url.username || url.password) {
    throw new Error("URLs containing embedded usernames or passwords are not supported.");
  }
  const unsupportedReason = ParitySiteAccess.unsupportedComparisonReason(url.href);
  if (unsupportedReason) {
    throw new Error(unsupportedReason);
  }

  return url.href;
}

async function useCurrentTab() {
  const url = activeTab?.url || "";
  const isWebsite = url.startsWith("http://") || url.startsWith("https://");
  const unsupportedReason = isWebsite
    ? ParitySiteAccess.unsupportedComparisonReason(url)
    : null;
  if (isWebsite && !unsupportedReason) {
    referenceInput.value = url;
    referenceState.hidden = true;
    useCurrentButton.disabled = false;
    return;
  }

  referenceInput.value = "";
  referenceState.textContent = unsupportedReason || "This browser page cannot be selected automatically. Enter a regular website URL instead.";
  referenceState.classList.add("is-warning");
  referenceState.hidden = false;
  useCurrentButton.disabled = true;
}

function renderAccessNote() {
  if (isImageReference()) {
    accessNote.textContent = settings.broadHostAccess
      ? "The design image stays on this device until the comparison ends. Review access to the implementation site."
      : "Next, review access to the implementation site. The design image needs no site access.";
    return;
  }
  accessNote.textContent = settings.broadHostAccess
    ? "Persistent site access is on. Review the selected sites before the comparison opens."
    : "Next, review the exact sites Parity Scrollr needs before Chrome asks for access.";
}

function showSetup() {
  pendingReview = null;
  accessReviewView.hidden = true;
  setupView.hidden = false;
  replicaInput.focus();
}

function showAccessReview(pair, origins) {
  pendingReview = { origins, pair };
  requestedSites.replaceChildren();
  for (const origin of origins) {
    const item = document.createElement("li");
    item.textContent = new URL(ParitySiteAccess.originFromPattern(origin)).host;
    requestedSites.appendChild(item);
  }

  const image = pair.referenceKind === "image";
  accessLoadPurpose.textContent = image
    ? "Show the local design image beside the selected implementation site."
    : "Load the two pages inside the comparison tab.";
  accessCoordinatePurpose.textContent = image
    ? "Coordinate scrolling between the image and the implementation page."
    : "Coordinate scrolling and navigation between them.";
  if (settings.broadHostAccess) {
    accessReviewEyebrow.textContent = "Parity Scrollr";
    permissionWarning.textContent = "Persistent site access is enabled, so Chrome should not show a new site prompt.";
    accessRetention.textContent = "Site access stays available until you restore safer defaults or clear local data in Settings.";
    confirmAccessButton.textContent = "Open comparison";
  } else {
    accessReviewEyebrow.textContent = "Parity Scrollr";
    permissionWarning.textContent = image
      ? "Chrome will describe this as permission to read and change data on the selected site. The local design image needs no site access."
      : "Chrome will describe this as permission to read and change data on the selected sites. That wording describes the access an extension could use.";
    accessRetention.textContent = "Parity Scrollr removes unused site access when the comparison ends.";
    confirmAccessButton.textContent = "Allow these sites and open comparison";
  }

  accessReviewError.hidden = true;
  setupView.hidden = true;
  accessReviewView.hidden = false;
  accessReviewTitle.focus();
}

function openExtensionPage(page) {
  chrome.tabs.create({ url: chrome.runtime.getURL(page) });
}

async function initialize() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (activeTab?.url?.startsWith(chrome.runtime.getURL("compare.html"))) {
    await chrome.storage.session.set({ [`captureAccess_${activeTab.id}`]: true });
    setupView.hidden = true;
    captureReadyView.hidden = false;
    return;
  }

  const stored = await chrome.storage.local.get(["paritySettings", "lastReplicaUrl"]);
  settings = ParitySettings.normalize(stored.paritySettings);
  settings.broadHostAccess = await chrome.permissions.contains({
    origins: ParitySettings.BROAD_ORIGINS
  });
  renderAccessNote();
  await useCurrentTab();

  if (settings.rememberReplicaUrl && stored.lastReplicaUrl) {
    replicaInput.value = stored.lastReplicaUrl;
    replicaInput.select();
  }
}

useCurrentButton.addEventListener("click", useCurrentTab);
referenceKindInput.addEventListener("change", renderReferenceKind);
referenceImageInput.addEventListener("change", async () => {
  const file = referenceImageInput.files?.[0];
  if (!file) {
    return;
  }
  try {
    const dimensions = await inspectReferenceImage(file);
    referenceImageHelp.textContent = `${file.name} · ${dimensions.width} × ${dimensions.height} image pixels. The live page uses the design width below, not this export width.`;
  } catch (error) {
    referenceImageHelp.textContent = error.message;
  }
});
document.querySelector("#open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
document.querySelector("#open-how-it-works").addEventListener("click", () => {
  openExtensionPage("welcome.html");
});
document.querySelector("#open-privacy").addEventListener("click", () => {
  openExtensionPage("privacy.html");
});
document.querySelector("#close-popup").addEventListener("click", () => window.close());
document.querySelector("#back-to-setup").addEventListener("click", showSetup);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  try {
    const image = isImageReference();
    const pair = { replicaUrl: normalizeUrl(replicaInput.value) };
    let referenceFile = null;
    if (image) {
      referenceFile = referenceImageInput.files?.[0];
      const dimensions = await inspectReferenceImage(referenceFile);
      const cssWidth = Number(referenceCssWidthInput.value);
      if (!Number.isInteger(cssWidth) || cssWidth < 240 || cssWidth > 3840) {
        throw new Error("Enter the Figma frame width between 240 and 3840 CSS pixels.");
      }
      pair.referenceKind = "image";
      pair.referenceImage = {
        cssWidth,
        name: referenceFile.name,
        pixelHeight: dimensions.height,
        pixelWidth: dimensions.width
      };
    } else {
      pair.referenceUrl = normalizeUrl(referenceInput.value);
    }
    pair.options = {
      broadHostAccess: settings.broadHostAccess,
      compatibilityMode: false,
      includeUrlDetails: settings.includeUrlDetails
    };
    const origins = ParitySiteAccess.uniqueOriginPatterns(
      image ? [pair.replicaUrl] : [pair.referenceUrl, pair.replicaUrl]
    );
    showAccessReview(pair, origins);
    pendingReview.referenceFile = referenceFile;
  } catch (error) {
    errorMessage.textContent = error.message || "Check both URLs and try again.";
    errorMessage.hidden = false;
    errorMessage.focus();
  }
});

confirmAccessButton.addEventListener("click", async () => {
  if (!pendingReview) {
    showSetup();
    return;
  }

  accessReviewError.hidden = true;
  confirmAccessButton.disabled = true;
  confirmAccessButton.textContent = settings.broadHostAccess
    ? "Opening comparison…"
    : "Requesting site access…";
  let storageKey = null;
  const { origins, pair, referenceFile } = pendingReview;

  try {
    if (!settings.broadHostAccess) {
      const granted = await chrome.permissions.request({ origins });
      if (!granted) {
        throw new Error("Chrome did not grant access. No comparison was opened.");
      }
    }

    const comparisonId = crypto.randomUUID();
    storageKey = `comparison_${comparisonId}`;
    if (pair.referenceKind === "image") {
      pair.referenceImage.imageId = comparisonId;
    }
    pair.origins = origins;
    pair.createdAt = Date.now();

    await chrome.storage.session.set({ [storageKey]: pair });
    if (pair.referenceKind === "image") {
      try {
        await ParityImageStore.save(comparisonId, referenceFile, pair.referenceImage.cssWidth);
      } catch {
        throw new Error("The design image could not be saved locally. Check browser storage space and try again.");
      }
    }
    if (settings.rememberReplicaUrl) {
      await chrome.storage.local.set({ lastReplicaUrl: pair.replicaUrl });
    } else {
      await chrome.storage.local.remove("lastReplicaUrl");
    }
    await chrome.tabs.create({
      url: chrome.runtime.getURL(`compare.html?id=${encodeURIComponent(comparisonId)}`)
    });
    window.close();
  } catch (error) {
    if (storageKey) {
      await chrome.runtime.sendMessage({
        type: "CANCEL_COMPARISON_LAUNCH",
        storageKey,
        origins
      }).catch(() => {});
      if (pair.referenceKind === "image") {
        await ParityImageStore.remove(pair.referenceImage.imageId).catch(() => {});
      }
    }
    accessReviewError.textContent = error.message || "The comparison could not be opened.";
    accessReviewError.hidden = false;
    accessReviewError.focus();
    confirmAccessButton.disabled = false;
    confirmAccessButton.textContent = settings.broadHostAccess
      ? "Open comparison"
      : "Allow these sites and open comparison";
  }
});

initialize().catch((error) => {
  errorMessage.textContent = error.message || "Parity Scrollr could not start.";
  errorMessage.hidden = false;
  errorMessage.focus();
});
