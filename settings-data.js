(() => {
  const DEFAULTS = Object.freeze({
    broadHostAccess: false,
    includeUrlDetails: false,
    rememberReplicaUrl: false
  });

  const BROAD_ORIGINS = Object.freeze(["<all_urls>"]);

  function normalize(value = {}) {
    return {
      broadHostAccess: value.broadHostAccess === true,
      includeUrlDetails: value.includeUrlDetails === true,
      rememberReplicaUrl: value.rememberReplicaUrl === true
    };
  }

  function classic() {
    return {
      broadHostAccess: true,
      includeUrlDetails: true,
      rememberReplicaUrl: true
    };
  }

  globalThis.ParitySettings = { BROAD_ORIGINS, DEFAULTS, classic, normalize };
})();
