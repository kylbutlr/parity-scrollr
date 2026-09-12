const controls = {
  broadHostAccess: document.querySelector("#broad-host-access"),
  defaultCompatibilityMode: document.querySelector("#default-compatibility-mode"),
  includeUrlDetails: document.querySelector("#include-url-details"),
  rememberReplicaUrl: document.querySelector("#remember-replica-url"),
  shopifyProfile: document.querySelector("#shopify-profile")
};
const status = document.querySelector("#settings-status");

function readControls() {
  return Object.fromEntries(
    Object.entries(controls).map(([key, control]) => [key, control.checked])
  );
}

function render(settings) {
  for (const [key, control] of Object.entries(controls)) {
    control.checked = settings[key];
  }
}

async function actualBroadAccess() {
  return chrome.permissions.contains({ origins: ParitySettings.BROAD_ORIGINS });
}

async function save(settings, message = "Settings saved.") {
  await chrome.storage.local.set({ paritySettings: ParitySettings.normalize(settings) });
  status.textContent = message;
}

async function requestBroadAccess() {
  return chrome.permissions.request({ origins: ParitySettings.BROAD_ORIGINS });
}

async function removeBroadAccess() {
  return chrome.permissions.remove({ origins: ParitySettings.BROAD_ORIGINS });
}

async function hasActiveComparisons() {
  const stored = await chrome.storage.session.get(null);
  return Object.keys(stored).some(
    (key) => key.startsWith("activeComparison_") || key.startsWith("comparison_")
  );
}

async function removeAllSiteAccess() {
  const granted = await chrome.permissions.getAll();
  if (granted.origins?.length) {
    return chrome.permissions.remove({ origins: granted.origins });
  }
  return true;
}

document.querySelector("#enable-classic").addEventListener("click", async () => {
  status.textContent = "Requesting all-site access…";
  const granted = await requestBroadAccess();
  if (!granted) {
    status.textContent = "All-site access was not granted. Safer per-comparison access remains active.";
    return;
  }
  const next = ParitySettings.classic();
  render(next);
  await save(next, "Classic workflow enabled.");
});

controls.broadHostAccess.addEventListener("change", async () => {
  if (controls.broadHostAccess.checked) {
    const granted = await requestBroadAccess();
    controls.broadHostAccess.checked = granted;
    status.textContent = granted
      ? "Persistent all-site access enabled."
      : "All-site access was not granted.";
  } else {
    if (await hasActiveComparisons()) {
      controls.broadHostAccess.checked = true;
      status.textContent = "End active comparisons before removing persistent site access.";
      return;
    }
    await removeBroadAccess();
    status.textContent = "Persistent all-site access removed.";
  }
  const next = readControls();
  next.broadHostAccess = await actualBroadAccess();
  render(next);
  await save(next, status.textContent);
});

document.querySelector("#save-settings").addEventListener("click", async () => {
  const next = readControls();
  next.broadHostAccess = await actualBroadAccess();
  render(next);
  await save(next);
});

document.querySelector("#restore-safer").addEventListener("click", async () => {
  if (await hasActiveComparisons()) {
    status.textContent = "End active comparisons before restoring safer site access.";
    return;
  }
  await removeBroadAccess();
  const next = ParitySettings.normalize();
  render(next);
  await save(next, "Safer defaults restored and persistent all-site access removed.");
});

document.querySelector("#clear-data").addEventListener("click", async () => {
  try {
    if (await hasActiveComparisons()) {
      status.textContent = "End active comparisons before clearing local data and site access.";
      return;
    }

    const siteAccessRemoved = await removeAllSiteAccess();
    await Promise.all([
      chrome.storage.local.clear(),
      chrome.storage.session.clear()
    ]);
    render(ParitySettings.normalize());
    status.textContent = siteAccessRemoved
      ? "Local settings, saved URLs, first-use choices, and site access were cleared. Downloaded PNG files were not deleted."
      : "Local data was cleared, but the browser did not remove every site-access grant. Review Parity Scrollr in your browser extension settings.";
  } catch (error) {
    status.textContent = `Local data could not be cleared: ${error.message || "Try again."}`;
  }
});

async function initialize() {
  const stored = await chrome.storage.local.get("paritySettings");
  const settings = ParitySettings.normalize(stored.paritySettings);
  settings.broadHostAccess = await actualBroadAccess();
  render(settings);
}

initialize().catch((error) => {
  status.textContent = error.message || "Settings could not be loaded.";
});
