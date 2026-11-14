/**
 * "Save as image": the receipt card drawn to a PNG in the browser (no server, no library). The card is cloned with every computed
 * style written inline, wrapped in an SVG <foreignObject>, drawn on a canvas at 2x and exported. The print animation, the mask of the
 * perforated edge and transforms are dropped from the copy so the image is the finished card on its own background.
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

export async function receiptToPng(node: HTMLElement, background: string): Promise<Blob> {
  const { width, height } = node.getBoundingClientRect();
  const copy = node.cloneNode(true) as HTMLElement;
  inlineStyles(node, copy);
  copy.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(copy)}</foreignObject></svg>`;
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
