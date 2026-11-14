import { HOLO_LOOK, type HoloKind, type HoloShape } from './map-hologram';

/**
 * The per-kind hologram pin as a small PNG made at runtime from token colours (no asset files, no hard-coded colour): a flattened
 * base platform in the kind's shape, a light beam, and a lifted bubble with a simple mark. MapLibre registers it as a symbol image.
 */
export const HOLO_W = 64;
export const HOLO_H = 96;

type Rgba = [number, number, number, number];

/** #rgb, #rrggbb or rgba(r,g,b,a) -> [r,g,b,a(0..1)]. */
export function parseColor(input: string): Rgba {
  const s = input.trim();
  const m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  let h = s.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
}

/** Signed distance (negative inside) of the base shape, centred at 0,0, half size r; y is squashed by the caller for the flat look. */
function baseDistance(shape: HoloShape, x: number, y: number, r: number): number {
  switch (shape) {
    case 'circle': return Math.hypot(x, y) - r;
    case 'diamond': return (Math.abs(x) + Math.abs(y)) - r * 1.1;
    case 'rectangle': return Math.max(Math.abs(x) - r, Math.abs(y) - r * 0.7);
    case 'rounded': { const q = [Math.abs(x) - (r - 6), Math.abs(y) - (r - 6)]; return Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0)) + Math.min(Math.max(q[0], q[1]), 0) - 6; }
    default: return Math.max(Math.abs(x) - r, Math.abs(y) - r);
  }
}

/** The mark inside the bubble, one simple figure per kind (coverage 0..1 at x,y relative to the bubble centre). */
function markDistance(kind: HoloKind, x: number, y: number): number {
  switch (kind) {
    case 'hospital': return Math.min(Math.max(Math.abs(x) - 2, Math.abs(y) - 7), Math.max(Math.abs(x) - 7, Math.abs(y) - 2));
    case 'doctor': return Math.min(Math.hypot(x, y + 3) - 3, Math.max(Math.abs(x) - 6, Math.abs(y - 5) - 2));
    case 'pharmacy': return Math.max(Math.abs(x) - 7, Math.abs(y) - 3.5);
    case 'lab': return Math.max(Math.abs(x) - 4, Math.abs(y) - 7);
    case 'radiology': return Math.abs(Math.hypot(x, y) - 6) - 1.6;
    default: return Math.abs(x) + Math.abs(y) - 7;
  }
}

/** RGBA pixels (row-major) of one kind's pin. `fg` is the tone colour, `bg` the bubble fill, `rim` the ring round the bubble. */
export function renderHoloPixels(kind: HoloKind, fg: string, bg: string): Uint8Array {
  const [fr, fgG, fb] = parseColor(fg);
  const [br, bgG, bb, ba] = parseColor(bg);
  const px = new Uint8Array(HOLO_W * HOLO_H * 4);
  const put = (i: number, r: number, g: number, b: number, a: number) => {
    const o = i * 4;
    const sa = Math.min(1, Math.max(0, a));
    const da = px[o + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    px[o] = Math.round((r * sa + px[o] * da * (1 - sa)) / oa);
    px[o + 1] = Math.round((g * sa + px[o + 1] * da * (1 - sa)) / oa);
    px[o + 2] = Math.round((b * sa + px[o + 2] * da * (1 - sa)) / oa);
    px[o + 3] = Math.round(oa * 255);
  };
  const cover = (d: number) => Math.min(1, Math.max(0, 0.5 - d));
  const shape = HOLO_LOOK[kind].shape;
  const cx = HOLO_W / 2;
  const baseY = HOLO_H - 14;
  const bubbleY = 22;
  for (let y = 0; y < HOLO_H; y++) {
    for (let x = 0; x < HOLO_W; x++) {
      const i = y * HOLO_W + x;
      const px0 = x + 0.5 - cx;
      // base platform: the shape squashed to 40% height (the 55deg tilt), translucent with a solid rim
      const d = baseDistance(shape, px0, (y + 0.5 - baseY) / 0.4, 22) * 0.4;
      put(i, fr, fgG, fb, cover(d) * 0.3);
      put(i, fr, fgG, fb, Math.max(0, cover(Math.abs(d) - 1) ) * 0.85);
      // light beam from the base up to the bubble, fading upwards
      if (y > bubbleY && y < baseY) put(i, fr, fgG, fb, cover(Math.abs(px0) - 5) * 0.28 * ((y - bubbleY) / (baseY - bubbleY)));
      // bubble: filled disc, tone ring, mark
      const bd = Math.hypot(px0, y + 0.5 - bubbleY) - 17;
      put(i, br, bgG, bb, cover(bd) * (ba || 1));
      put(i, fr, fgG, fb, cover(Math.abs(bd + 1) - 1));
      put(i, fr, fgG, fb, cover(markDistance(kind, px0, y + 0.5 - bubbleY)) * (bd < -2 ? 1 : 0));
    }
  }
  return px;
}

const CRC = (() => { const t: number[] = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

/** A valid RGBA PNG (stored deflate blocks, no compression) of the pixels. */
export function encodePng(rgba: Uint8Array, w: number, h: number): Uint8Array {
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  const z: number[] = [0x78, 0x01];
  for (let p = 0; p < raw.length; p += 65535) {
    const len = Math.min(65535, raw.length - p);
    z.push(p + len >= raw.length ? 1 : 0, len & 255, len >> 8, ~len & 255, (~len >> 8) & 255);
    for (let i = 0; i < len; i++) z.push(raw[p + i]);
  }
  let a = 1, b = 0;
  for (let i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; b = (b + a) % 65521; }
  z.push(...be32(((b << 16) | a) >>> 0));
  const chunk = (type: string, data: number[] | Uint8Array) => {
    const body = new Uint8Array(4 + data.length);
    for (let i = 0; i < 4; i++) body[i] = type.charCodeAt(i);
    body.set(data, 4);
    return [...be32(data.length), ...body, ...be32(crc32(body))];
  };
  return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, ...chunk('IHDR', [...be32(w), ...be32(h), 8, 6, 0, 0, 0]), ...chunk('IDAT', z), ...chunk('IEND', [])]);
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

export const holoPinUri = (kind: HoloKind, fg: string, bg: string): string => `data:image/png;base64,${base64(encodePng(renderHoloPixels(kind, fg, bg), HOLO_W, HOLO_H))}`;
