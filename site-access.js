(() => {
  const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

  function originPattern(value) {
    const url = new URL(value);
    if (!SUPPORTED_PROTOCOLS.has(url.protocol)) {
      throw new Error("Only regular http:// or https:// pages can be compared.");
    }
    if (url.username || url.password) {
      throw new Error("URLs containing embedded usernames or passwords are not supported.");
    }
    return `${url.protocol}//${url.host}/*`;
  }

  function uniqueOriginPatterns(values) {
    return [...new Set(values.map(originPattern))];
  }

  function unsupportedComparisonReason(value) {
    const url = new URL(value);
    const isShopifyAdminHost = url.hostname === "admin.shopify.com";
    const isLegacyShopifyAdminPath =
      url.hostname.endsWith(".myshopify.com") && /^\/admin(?:\/|$)/.test(url.pathname);

    if (isShopifyAdminHost || isLegacyShopifyAdminPath) {
      return "Shopify Admin pages are not supported. Open the storefront or theme preview in a regular tab and use that URL instead.";
    }

    return null;
  }

  function originFromPattern(pattern) {
    return pattern.endsWith("/*") ? pattern.slice(0, -2) : pattern;
  }

  function urlMatchesPattern(value, pattern) {
    try {
      return new URL(value).origin === originFromPattern(pattern);
    } catch {
      return false;
    }
  }

  globalThis.ParitySiteAccess = {
    originFromPattern,
    originPattern,
    unsupportedComparisonReason,
    uniqueOriginPatterns,
    urlMatchesPattern
  };
})();
