importScripts("settings-data.js", "site-access.js", "image-store.js");

const RULE_OFFSET = 100000;
const RULES_PER_TAB = 2;
const ACTIVE_SESSION_PREFIX = "activeComparison_";
const CAPTURE_ACCESS_PREFIX = "captureAccess_";
const LAUNCH_PREFIX = "comparison_";
const CONTENT_SCRIPT_PREFIX = "comparison-frame-";
const COMPARE_URL = chrome.runtime.getURL("compare.html");
const POPUP_URL = chrome.runtime.getURL("popup.html");
const LAUNCH_MAX_AGE = 5 * 60 * 1000;
let sessionOperations = Promise.resolve();

// Startup reconciliation and session changes share one queue so a new session
// cannot be mistaken for an orphan while its rules are being registered.
function runSessionOperation(operation) {
  const result = sessionOperations.then(operation);
  sessionOperations = result.catch(() => {});
  return result;
}

function sessionKey(tabId) {
  return `${ACTIVE_SESSION_PREFIX}${tabId}`;
}

function captureAccessKey(tabId) {
  return `${CAPTURE_ACCESS_PREFIX}${tabId}`;
}

function ruleIdsForTab(tabId) {
  const first = RULE_OFFSET + tabId * RULES_PER_TAB;
  return [first, first + 1];
}

function isManagedRuleId(ruleId) {
  return Number.isInteger(ruleId) && ruleId >= RULE_OFFSET;
}

function contentScriptIdForTab(tabId) {
  return `${CONTENT_SCRIPT_PREFIX}${tabId}`;
}

function isManagedContentScriptId(id) {
  return typeof id === "string" && /^comparison-frame-\d+$/.test(id);
}

async function unregisterComparisonScript(tabId) {
  await chrome.scripting.unregisterContentScripts({
    ids: [contentScriptIdForTab(tabId)]
  }).catch(() => {});
}

async function registerComparisonScript(tabId, origins) {
  const id = contentScriptIdForTab(tabId);
  await unregisterComparisonScript(tabId);
  await chrome.scripting.registerContentScripts([{
    id,
    allFrames: true,
    js: ["scroll-sync.js"],
    matches: origins,
    persistAcrossSessions: false,
    runAt: "document_start"
  }]);
  return id;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeOrigins(values) {
  if (!Array.isArray(values) || values.length === 0 || values.length > 2) {
    throw new Error("A comparison requires one or two approved site origins.");
  }

  const origins = [...new Set(values.map((value) => {
    const origin = ParitySiteAccess.originFromPattern(value);
    const normalized = ParitySiteAccess.originPattern(`${origin}/`);
    if (normalized !== value) {
      throw new Error("The requested site access pattern is invalid.");
    }
    return normalized;
  }))];

  return origins;
}

function ruleForOrigin(tabId, pattern, ruleId) {
  const origin = ParitySiteAccess.originFromPattern(pattern);
  return {
    id: ruleId,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "content-security-policy", operation: "remove" },
        { header: "x-frame-options", operation: "remove" }
      ]
    },
    condition: {
      regexFilter: `^${escapeRegex(origin)}/`,
      resourceTypes: ["sub_frame"],
      tabIds: [tabId]
    }
  };
}

async function prepareComparisonTab(tabId, request) {
  const stored = await chrome.storage.session.get(sessionKey(tabId));
  const previousSession = stored[sessionKey(tabId)];
  const origins = normalizeOrigins(request.origins);
  const permitted = await chrome.permissions.contains({ origins });
  if (!permitted) {
    throw new Error("The selected sites are not currently approved.");
  }
  const imageId = request.imageId;
  if (imageId !== undefined) {
    if (typeof imageId !== "string" || !/^[a-z\d-]{1,80}$/i.test(imageId)) {
      throw new Error("The design image identifier is invalid.");
    }
    if (!await ParityImageStore.has(imageId)) {
      throw new Error("The design image expired. Start a new comparison.");
    }
  }

  const ruleIds = ruleIdsForTab(tabId);
  const compatibilityMode = request.compatibilityMode === true;
  const addRules = compatibilityMode
    ? origins.map((origin, index) => ruleForOrigin(tabId, origin, ruleIds[index]))
    : [];

  try {
    const contentScriptId = await registerComparisonScript(tabId, origins);
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: ruleIds,
      addRules
    });

    const session = {
      broadHostAccess: request.broadHostAccess === true,
      compatibilityMode,
      contentScriptId,
      imageId,
      origins,
      ruleIds: addRules.map((rule) => rule.id)
    };
    const comparison = request.comparison || previousSession?.comparison;
    if (comparison) {
      session.comparisonId = request.comparisonId || previousSession?.comparisonId;
      session.comparison = {
        ...comparison,
        options: {
          ...comparison.options,
          broadHostAccess: session.broadHostAccess,
          compatibilityMode
        }
      };
    }
    await chrome.storage.session.set({ [sessionKey(tabId)]: session });
    return session;
  } catch (error) {
    await Promise.allSettled([
      unregisterComparisonScript(tabId),
      chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds })
    ]);
    throw error;
  }
}

function activeOriginsFromStorage(stored) {
  const origins = new Set();
  for (const [key, value] of Object.entries(stored)) {
    if (key.startsWith(ACTIVE_SESSION_PREFIX)) {
      for (const origin of value?.origins || []) {
        origins.add(origin);
      }
    } else if (key.startsWith(LAUNCH_PREFIX)) {
      for (const origin of value?.origins || []) {
        origins.add(origin);
      }
    }
  }
  return origins;
}

async function releaseUnusedOrigins(candidates) {
  if (!candidates?.length) {
    return;
  }

  const [hasBroadAccess, stored] = await Promise.all([
    chrome.permissions.contains({ origins: ParitySettings.BROAD_ORIGINS }),
    chrome.storage.session.get(null)
  ]);
  if (hasBroadAccess) {
    return;
  }

  const activeOrigins = activeOriginsFromStorage(stored);
  const removable = [...new Set(candidates)].filter(
    (origin) => !activeOrigins.has(origin) && !ParitySettings.BROAD_ORIGINS.includes(origin)
  );
  if (removable.length) {
    await chrome.permissions.remove({ origins: removable }).catch(() => {});
  }
}

async function cleanupComparisonTab(tabId) {
  const key = sessionKey(tabId);
  const stored = await chrome.storage.session.get(key);
  const session = stored[key];
  const ruleIds = session?.ruleIds?.length ? session.ruleIds : ruleIdsForTab(tabId);

  await Promise.allSettled([
    chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds }),
    unregisterComparisonScript(tabId),
    chrome.storage.session.remove([key, captureAccessKey(tabId)]),
    ...(session?.imageId ? [ParityImageStore.remove(session.imageId)] : [])
  ]);
  await releaseUnusedOrigins(session?.origins || []);
}

async function isActiveComparisonFrame(sender) {
  if (!sender.tab?.id || sender.frameId === 0 || typeof sender.url !== "string") {
    return { active: false };
  }

  const stored = await chrome.storage.session.get(sessionKey(sender.tab.id));
  const session = stored[sessionKey(sender.tab.id)];
  const active = session?.origins?.some((origin) =>
    ParitySiteAccess.urlMatchesPattern(sender.url, origin)
  );

  return {
    active: active === true
  };
}

async function reconcileSessions() {
  const stored = await chrome.storage.session.get(null);
  const cleanupTasks = [];
  const staleLaunchKeys = [];
  const staleImageIds = [];
  const staleLaunchOrigins = [];

  for (const [key, session] of Object.entries(stored)) {
    if (key.startsWith(LAUNCH_PREFIX)) {
      if (!Number.isFinite(session?.createdAt) || Date.now() - session.createdAt > LAUNCH_MAX_AGE) {
        staleLaunchKeys.push(key);
        staleLaunchOrigins.push(...(session?.origins || []));
        if (session?.referenceImage?.imageId) {
          staleImageIds.push(session.referenceImage.imageId);
        }
      }
      continue;
    }
    if (!key.startsWith(ACTIVE_SESSION_PREFIX)) {
      continue;
    }
    const tabId = Number.parseInt(key.slice(ACTIVE_SESSION_PREFIX.length), 10);
    cleanupTasks.push(
      chrome.tabs.get(tabId)
        .then((tab) => {
          if (!tab.url?.startsWith(COMPARE_URL)) {
            return cleanupComparisonTab(tabId);
          }
          return undefined;
        })
        .catch(() => cleanupComparisonTab(tabId))
    );
  }

  if (staleLaunchKeys.length) {
    await chrome.storage.session.remove(staleLaunchKeys);
    await Promise.allSettled(staleImageIds.map((id) => ParityImageStore.remove(id)));
  }
  await Promise.allSettled(cleanupTasks);
  const remainingSessions = await chrome.storage.session.get(null);
  const activeImageIds = new Set(Object.entries(remainingSessions).flatMap(([key, session]) => {
    if (key.startsWith(ACTIVE_SESSION_PREFIX) && session?.imageId) {
      return [session.imageId];
    }
    if (key.startsWith(LAUNCH_PREFIX) && session?.referenceImage?.imageId) {
      return [session.referenceImage.imageId];
    }
    return [];
  }));
  const imageIds = await ParityImageStore.keys();
  for (const id of imageIds) {
    if (activeImageIds.has(id)) continue;
    const image = await ParityImageStore.get(id);
    if (!image?.createdAt || Date.now() - image.createdAt > LAUNCH_MAX_AGE) {
      await ParityImageStore.remove(id);
    }
  }
  const activeRuleIds = new Set(
    Object.entries(remainingSessions)
      .filter(([key]) => key.startsWith(ACTIVE_SESSION_PREFIX))
      .flatMap(([, session]) => session?.ruleIds || [])
  );
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  const orphanRuleIds = rules
    .map((rule) => rule.id)
    .filter((ruleId) => isManagedRuleId(ruleId) && !activeRuleIds.has(ruleId));
  if (orphanRuleIds.length) {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: orphanRuleIds });
  }
  const activeContentScriptIds = new Set(
    Object.entries(remainingSessions)
      .filter(([key]) => key.startsWith(ACTIVE_SESSION_PREFIX))
      .map(([, session]) => session?.contentScriptId)
      .filter(Boolean)
  );
  const contentScripts = await chrome.scripting.getRegisteredContentScripts();
  const orphanContentScriptIds = contentScripts
    .map((script) => script.id)
    .filter((id) => isManagedContentScriptId(id) && !activeContentScriptIds.has(id));
  if (orphanContentScriptIds.length) {
    await chrome.scripting.unregisterContentScripts({ ids: orphanContentScriptIds });
  }
  await releaseUnusedOrigins(staleLaunchOrigins);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PREPARE_COMPARISON_TAB") {
    if (!sender.tab?.id || !sender.url?.startsWith(COMPARE_URL)) {
      sendResponse({ ok: false, error: "The comparison tab could not be identified." });
      return false;
    }

    runSessionOperation(() => prepareComparisonTab(sender.tab.id, message))
      .then((session) => sendResponse({ ok: true, session }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "IS_COMPARISON_FRAME") {
    sessionOperations.then(() => isActiveComparisonFrame(sender))
      .then(sendResponse)
      .catch(() => sendResponse({ active: false }));
    return true;
  }

  if (message?.type === "END_COMPARISON") {
    if (!sender.tab?.id || !sender.url?.startsWith(COMPARE_URL)) {
      sendResponse({ ok: false });
      return false;
    }
    runSessionOperation(() => cleanupComparisonTab(sender.tab.id))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "CANCEL_COMPARISON_LAUNCH") {
    const trustedSender =
      sender.url?.startsWith(POPUP_URL) || sender.url?.startsWith(COMPARE_URL);
    if (!trustedSender || typeof message.storageKey !== "string") {
      sendResponse({ ok: false });
      return false;
    }
    let origins;
    try {
      origins = normalizeOrigins(message.origins);
    } catch {
      sendResponse({ ok: false });
      return false;
    }
    runSessionOperation(() => chrome.storage.session.get(message.storageKey)
      .then((stored) => {
        const imageId = stored[message.storageKey]?.referenceImage?.imageId;
        return Promise.all([
          chrome.storage.session.remove(message.storageKey),
          ...(imageId ? [ParityImageStore.remove(imageId)] : [])
        ]);
      })
      .then(() => releaseUnusedOrigins(origins)))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  runSessionOperation(() => cleanupComparisonTab(tabId)).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && !changeInfo.url.startsWith(COMPARE_URL)) {
    runSessionOperation(() => chrome.storage.session.get(sessionKey(tabId)).then((stored) => {
      if (stored[sessionKey(tabId)]) {
        return cleanupComparisonTab(tabId);
      }
      return undefined;
    })).catch(() => {});
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

runSessionOperation(reconcileSessions).catch(() => {});
