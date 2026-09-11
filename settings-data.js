(() => {
  const DEFAULTS = Object.freeze({
    broadHostAccess: false,
    defaultCompatibilityMode: false,
    includeUrlDetails: false,
    rememberReplicaUrl: false,
    shopifyProfile: false
  });

  const BROAD_ORIGINS = Object.freeze(["<all_urls>"]);

  function normalize(value = {}) {
    return {
      broadHostAccess: value.broadHostAccess === true,
      defaultCompatibilityMode: value.defaultCompatibilityMode === true,
      includeUrlDetails: value.includeUrlDetails === true,
      rememberReplicaUrl: value.rememberReplicaUrl === true,
      shopifyProfile: value.shopifyProfile === true
    };
  }

  function classic() {
    return {
      broadHostAccess: true,
      defaultCompatibilityMode: true,
      includeUrlDetails: true,
      rememberReplicaUrl: true,
      shopifyProfile: true
    };
  }

  globalThis.ParitySettings = { BROAD_ORIGINS, DEFAULTS, classic, normalize };
})();
