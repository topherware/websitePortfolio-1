export function logoUrl(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value, document.baseURI);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

let faviconRequest = 0;
let cachedLogo = "";
let cachedIcon = "";

export async function updateFavicon(value) {
  const icon = document.querySelector('link[rel="icon"]');
  if (!icon) return;
  icon.dataset.defaultHref ||= icon.getAttribute("href");
  const url = logoUrl(value);
  const request = ++faviconRequest;
  const reset = () => {
    icon.href = icon.dataset.defaultHref;
    icon.type = "image/svg+xml";
    delete icon.dataset.logoSource;
  };
  if (!url) return reset();
  try {
    let data = cachedLogo === url ? cachedIcon : "";
    if (!data) {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        const timer = setTimeout(() => reject(new Error("Logo loading timed out")), 10000);
        img.crossOrigin = "anonymous";
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); reject(new Error("Logo unavailable")); };
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.clip();
      // Match the circular cover crop used by the admin logo.
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 64, 64);
      data = canvas.toDataURL("image/png");
    }
    if (request !== faviconRequest) return;
    cachedLogo = url;
    cachedIcon = data;
    icon.type = "image/png";
    icon.href = data;
    icon.dataset.logoSource = url;
  } catch {
    if (request === faviconRequest) reset();
  }
}
