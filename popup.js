const referenceInput = document.querySelector("#reference-url");
const replicaInput = document.querySelector("#replica-url");
const useCurrentButton = document.querySelector("#use-current");
const compatibilityModeInput = document.querySelector("#compatibility-mode");
const siteProfileInput = document.querySelector("#site-profile");
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
const compatibilityAccessNote = document.querySelector("#compatibility-access-note");
const accessReviewError = document.querySelector("#access-review-error");
const confirmAccessButton = document.querySelector("#confirm-access");

let activeTab = null;
let settings = ParitySettings.normalize();
let pendingReview = null;

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
  accessNote.textContent = settings.broadHostAccess
    ? "Classic workflow is on. Review the selected sites before the comparison opens."
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

  compatibilityAccessNote.hidden = pair.options.compatibilityMode !== true;
  if (settings.broadHostAccess) {
    accessReviewEyebrow.textContent = "Classic workflow";
    permissionWarning.textContent = "Classic workflow already keeps access to these sites available, so Chrome should not show a new site prompt.";
    accessRetention.textContent = "Site access stays available until you restore safer defaults or clear local data in Settings.";
    confirmAccessButton.textContent = "Open comparison";
  } else {
    accessReviewEyebrow.textContent = "Before Chrome asks";
    permissionWarning.textContent = "Chrome will describe this as permission to read and change data on the selected sites. That wording describes the access an extension could use.";
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
  compatibilityModeInput.checked = settings.defaultCompatibilityMode;
  siteProfileInput.value = settings.shopifyProfile ? "shopify" : "none";
  renderAccessNote();
  await useCurrentTab();

  if (settings.rememberReplicaUrl && stored.lastReplicaUrl) {
    replicaInput.value = stored.lastReplicaUrl;
    replicaInput.select();
  }
}

useCurrentButton.addEventListener("click", useCurrentTab);
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  try {
    const pair = {
      referenceUrl: normalizeUrl(referenceInput.value),
      replicaUrl: normalizeUrl(replicaInput.value)
    };
    pair.options = {
      broadHostAccess: settings.broadHostAccess,
      compatibilityMode: compatibilityModeInput.checked,
      includeUrlDetails: settings.includeUrlDetails,
      siteProfile: siteProfileInput.value
    };
    const origins = ParitySiteAccess.uniqueOriginPatterns([
      pair.referenceUrl,
      pair.replicaUrl
    ]);
    showAccessReview(pair, origins);
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
  const { origins, pair } = pendingReview;

  try {
    if (!settings.broadHostAccess) {
      const granted = await chrome.permissions.request({ origins });
      if (!granted) {
        throw new Error("Chrome did not grant access. No comparison was opened.");
      }
    }

    const comparisonId = crypto.randomUUID();
    storageKey = `comparison_${comparisonId}`;
    pair.origins = origins;
    pair.createdAt = Date.now();

    await chrome.storage.session.set({ [storageKey]: pair });
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
