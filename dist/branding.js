export function logoUrl(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value, document.baseURI);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

export function updateFavicon(value) {
  const icon = document.querySelector('link[rel="icon"]');
  if (!icon) return;
  icon.dataset.defaultHref ||= icon.getAttribute("href");
  const url = logoUrl(value);
  // Uploaded logos can be PNG, JPEG, WebP or GIF, not the original SVG type.
  if (url) {
    icon.removeAttribute("type");
    icon.href = url;
  } else {
    icon.href = icon.dataset.defaultHref;
    icon.type = "image/svg+xml";
  }
}
