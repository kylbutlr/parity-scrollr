(() => {
  function calculateViewportFit(
    viewportWidth,
    viewportHeight,
    containerWidth,
    containerHeight,
    options = {}
  ) {
    const { maxHeight = false, padding = 24 } = options;
    const availableWidth = Math.max(1, containerWidth - padding);
    const availableHeight = Math.max(1, containerHeight - padding);
    const scale = Math.min(
      1,
      availableWidth / viewportWidth,
      availableHeight / viewportHeight
    );
    const effectiveViewportHeight = maxHeight
      ? availableHeight / scale
      : viewportHeight;

    return {
      scale,
      renderedWidth: viewportWidth * scale,
      renderedHeight: effectiveViewportHeight * scale,
      effectiveViewportHeight
    };
  }

  globalThis.ParityViewport = { calculateViewportFit };
})();
