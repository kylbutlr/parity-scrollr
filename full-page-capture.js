(() => {
  const DEFAULT_MAX_DIMENSION = 28000;
  const DEFAULT_MAX_PIXELS = 80000000;

  function calculateOutputScale(
    width,
    height,
    maxDimension = DEFAULT_MAX_DIMENSION,
    maxPixels = DEFAULT_MAX_PIXELS
  ) {
    if (width <= 0 || height <= 0) {
      return 1;
    }

    const dimensionScale = Math.min(1, maxDimension / width, maxDimension / height);
    const areaScale = Math.min(1, Math.sqrt(maxPixels / (width * height)));
    return Math.min(dimensionScale, areaScale);
  }

  function maxScroll(metrics) {
    return Math.max(0, metrics.scrollHeight - metrics.clientHeight);
  }

  function captureRegion(metrics) {
    if (!metrics.nestedScroller) return null;
    const region = metrics.captureRegion;
    if (
      !region ||
      ![region.left, region.top, region.width, region.height,
        metrics.viewportWidth, metrics.viewportHeight].every(Number.isFinite) ||
      region.width <= 0 || region.height <= 0 ||
      region.left < -1 || region.top < -1 ||
      region.left + region.width > metrics.viewportWidth + 1 ||
      region.top + region.height > metrics.viewportHeight + 1
    ) {
      throw new Error("The page's scrolling area is partly outside the visible page. Use Capture view, or adjust the page layout before capturing the full page.");
    }
    return region;
  }

  function nextCaptureTarget(currentTarget, step, metricsList) {
    const remainingEnd = Math.max(...metricsList.map(maxScroll));
    if (metricsList.every((metrics) => metrics.y >= maxScroll(metrics) - 1)) {
      return null;
    }

    return Math.min(remainingEnd, currentTarget + step);
  }

  function calculateStitchBand(metrics, previousY, pixelsPerCss, isFirst) {
    const cssHeight = isFirst
      ? Math.min(metrics.clientHeight, metrics.scrollHeight)
      : Math.max(0, metrics.y - previousY);

    return {
      cssHeight,
      pixelHeight: cssHeight * pixelsPerCss,
      sourceFromBottom: !isFirst
    };
  }

  globalThis.ParityFullPage = {
    captureRegion,
    calculateOutputScale,
    calculateStitchBand,
    maxScroll,
    nextCaptureTarget
  };
})();
