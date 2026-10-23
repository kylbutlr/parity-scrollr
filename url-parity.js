(() => {
  const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

  function normalizeUrl(value) {
    try {
      const url = new URL(value);
      return SUPPORTED_PROTOCOLS.has(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function matchingUrl(sourceValue, targetValue, options = {}) {
    const sourceUrl = normalizeUrl(sourceValue);
    const targetUrl = normalizeUrl(targetValue);

    if (!sourceUrl || !targetUrl) {
      return null;
    }

    const source = new URL(sourceUrl);
    const target = new URL(targetUrl);
    target.pathname = source.pathname;
    if (options.includeDetails === true) {
      target.search = source.search;
      target.hash = source.hash;
    }
    return target.href;
  }

  globalThis.ParityUrl = {
    matchingUrl,
    normalizeUrl
  };
})();
