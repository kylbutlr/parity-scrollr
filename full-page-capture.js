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
    calculateOutputScale,
    calculateStitchBand,
    maxScroll,
    nextCaptureTarget
  };
})();
