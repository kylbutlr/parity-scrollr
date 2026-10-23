const CHANNEL = "parity-scrollr-sync-v1";
const image = document.querySelector("#reference-image");
const errorMessage = document.querySelector("#image-error");

async function loadReferenceImage() {
  try {
    const imageId = new URLSearchParams(location.search).get("id");
    if (!imageId || !/^[a-z\d-]{1,80}$/i.test(imageId)) {
      throw new Error("The design image link is incomplete.");
    }

    const reference = await ParityImageStore.get(imageId);
    if (
      !["image/png", "image/jpeg"].includes(reference?.blob?.type) ||
      !Number.isInteger(reference.cssWidth) ||
      reference.cssWidth < 240 || reference.cssWidth > 3840
    ) {
      throw new Error("The design image is no longer available. Start a new comparison.");
    }

    image.style.width = `${reference.cssWidth}px`;
    const objectUrl = URL.createObjectURL(reference.blob);
    try {
      image.src = objectUrl;
      await image.decode();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
    image.hidden = false;

    const coordinationScript = document.createElement("script");
    coordinationScript.src = chrome.runtime.getURL("scroll-sync.js");
    document.body.appendChild(coordinationScript);
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
    window.parent.postMessage({
      channel: CHANNEL,
      type: "REFERENCE_IMAGE_ERROR",
      message: error.message
    }, "*");
  }
}

loadReferenceImage();
