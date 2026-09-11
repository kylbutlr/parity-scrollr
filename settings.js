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
  return Object.keys(stored).some((key) => key.startsWith("activeComparison_"));
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
  await chrome.storage.local.remove(["lastReplicaUrl", "viewportSize", "maxHeight"]);
  status.textContent = "Saved replica URL and viewport preferences cleared.";
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
