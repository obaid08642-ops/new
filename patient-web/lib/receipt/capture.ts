/**
 * "Save as image": the receipt card drawn to a PNG in the browser (no server, no library). The card is cloned with every computed
 * style written inline, wrapped in an SVG <foreignObject>, drawn on a canvas at 2x and exported. The print animation, the mask of the
 * perforated edge and transforms are dropped from the copy so the image is the finished card on its own background.
 *
 * An SVG drawn as an image cannot reach the page's web fonts, so without more the card came out in the system font instead of Readex Pro
 * (reconciliation row 13). The @font-face rules of the families the card uses are copied into the SVG with their files as data URLs.
 */
const SKIP = new Set(["animation", "animation-name", "transform", "mask", "-webkit-mask", "mask-image", "-webkit-mask-image", "mask-size", "-webkit-mask-size", "mask-repeat", "-webkit-mask-repeat", "mask-position", "-webkit-mask-position"]);

function inlineStyles(source: Element, copy: Element) {
  const computed = getComputedStyle(source);
  let css = "";
  for (let i = 0; i < computed.length; i += 1) {
    const name = computed.item(i);
    if (!SKIP.has(name)) css += `${name}:${computed.getPropertyValue(name)};`;
  }
  (copy as HTMLElement).setAttribute("style", css);
  for (let i = 0; i < source.children.length; i += 1) {
    const child = copy.children[i];
    if (child) inlineStyles(source.children[i], child);
  }
}

/** One @font-face rule with its font file inlined as a data URL. */
export function fontFaceBlock(face: { family: string; style?: string; weight?: string; unicodeRange?: string; dataUrl: string }): string {
  const parts = [`font-family:${face.family}`, `src:url(${face.dataUrl})`];
  if (face.style) parts.push(`font-style:${face.style}`);
  if (face.weight) parts.push(`font-weight:${face.weight}`);
  if (face.unicodeRange) parts.push(`unicode-range:${face.unicodeRange}`);
  return `@font-face{${parts.join(";")}}`;
}

/** A font-family name without its quotes and spaces around it. */
export const cleanFamily = (name: string): string => name.trim().replace(/^["']|["']$/g, "");

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("receipt_font_failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * The @font-face rules of the page whose family the card uses, each with its first font file inlined. A rule or file that cannot be read
 * (a cross-origin sheet, a failed fetch) is left out: the card then falls back to the next font, as it did before.
 */
async function embeddedFontFaces(node: HTMLElement): Promise<string> {
  const used = new Set<string>();
  const visit = (element: Element) => {
    for (const name of getComputedStyle(element).fontFamily.split(",")) used.add(cleanFamily(name));
    for (const child of Array.from(element.children)) visit(child);
  };
  visit(node);
  const out: string[] = [];
  const files = new Map<string, Promise<string | null>>();
  const load = (url: string) => {
    if (!files.has(url)) files.set(url, fetch(url).then((r) => (r.ok ? r.blob() : Promise.reject(new Error("receipt_font_failed")))).then(blobToDataUrl).catch(() => null));
    return files.get(url)!;
  };
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue("font-family");
      if (!used.has(cleanFamily(family))) continue;
      const file = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(rule.style.getPropertyValue("src"));
      if (!file) continue;
      const dataUrl = await load(new URL(file[1], sheet.href ?? document.baseURI).href);
      if (!dataUrl) continue;
      out.push(fontFaceBlock({ family, style: rule.style.getPropertyValue("font-style"), weight: rule.style.getPropertyValue("font-weight"), unicodeRange: rule.style.getPropertyValue("unicode-range"), dataUrl }));
    }
  }
  return out.join("");
}

export async function receiptToPng(node: HTMLElement, background: string): Promise<Blob> {
  // the fonts must be loaded before the styles are read, and their files travel inside the image
  if (document.fonts?.ready) await document.fonts.ready;
  const fonts = await embeddedFontFaces(node);
  const { width, height } = node.getBoundingClientRect();
  const copy = node.cloneNode(true) as HTMLElement;
  inlineStyles(node, copy);
  copy.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${fonts ? `<style>${fonts}</style>` : ""}<foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(copy)}</foreignObject></svg>`;
  const image = new Image();
  image.decoding = "async";
  const loaded = new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("receipt_image_failed")); });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await loaded;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("receipt_image_failed");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("receipt_image_failed"))), "image/png"));
}
