const referenceInput = document.querySelector("#reference-url");
const replicaInput = document.querySelector("#replica-url");
const useCurrentButton = document.querySelector("#use-current");
const compatibilityModeInput = document.querySelector("#compatibility-mode");
const siteProfileInput = document.querySelector("#site-profile");
const setupView = document.querySelector("#setup-view");
const captureReadyView = document.querySelector("#capture-ready-view");
const accessNote = document.querySelector("#access-note");
const form = document.querySelector("#compare-form");
const errorMessage = document.querySelector("#error");

let activeTab = null;
let settings = ParitySettings.normalize();

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

  return url.href;
}

async function useCurrentTab() {
  const url = activeTab?.url || "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    referenceInput.value = url;
  }
}

function renderAccessNote() {
  accessNote.textContent = settings.broadHostAccess
    ? "Classic workflow is enabled. Site access stays granted, but Parity Scrollr acts only inside comparison tabs."
    : "You will approve access only to the two selected sites. Access is removed when the comparison ends.";
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
document.querySelector("#close-popup").addEventListener("click", () => window.close());

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;
  let storageKey = null;
  let origins = [];

  try {
    const pair = {
      referenceUrl: normalizeUrl(referenceInput.value),
      replicaUrl: normalizeUrl(replicaInput.value)
    };
    origins = ParitySiteAccess.uniqueOriginPatterns([
      pair.referenceUrl,
      pair.replicaUrl
    ]);
    const granted = await chrome.permissions.request({ origins });

    if (!granted) {
      throw new Error("Site access was not granted. Parity Scrollr cannot compare these pages without it.");
    }

    const comparisonId = crypto.randomUUID();
    storageKey = `comparison_${comparisonId}`;
    pair.options = {
      broadHostAccess: settings.broadHostAccess,
      compatibilityMode: compatibilityModeInput.checked,
      includeUrlDetails: settings.includeUrlDetails,
      siteProfile: siteProfileInput.value
    };
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
    if (storageKey && origins.length) {
      await chrome.runtime.sendMessage({
        type: "CANCEL_COMPARISON_LAUNCH",
        storageKey,
        origins
      }).catch(() => {});
    }
    errorMessage.textContent = error.message || "Check both URLs and try again.";
    errorMessage.hidden = false;
  }
});

initialize().catch((error) => {
  errorMessage.textContent = error.message || "Parity Scrollr could not start.";
  errorMessage.hidden = false;
});
