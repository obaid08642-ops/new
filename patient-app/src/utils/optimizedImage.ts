import { PixelRatio } from 'react-native';

/**
 * Picture sizes for the app. The web already serves resized AVIF/WebP through Next's optimizer (`/_next/image`, hosts allow-listed
 * in patient-web/lib/image-hosts.ts); the app loaded the original upload (hundreds of KB for a 56 dp avatar).
 * Opt-in: with `EXPO_PUBLIC_IMAGE_OPTIMIZER_URL` (the web origin, e.g. https://nabd.plus) set at build time, a picture on an
 * allowed host is requested at the nearest size Next allows for its box; unset, or any other host, the address is returned unchanged.
 */
const HOSTS = ['cdn.nabd.plus', 'res.cloudinary.com'];
/** Next's default `imageSizes` + `deviceSizes`, the only widths its optimizer accepts. */
const SIZES = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const QUALITY = 75;

export function nearestSize(px: number): number {
  return SIZES.find((s) => s >= px) ?? SIZES[SIZES.length - 1];
}

export function optimizedImageUri(
  uri: string | null | undefined,
  widthDp: number,
  opts: { origin?: string; ratio?: number } = {},
): string | undefined {
  if (!uri) return undefined;
  const origin = (opts.origin ?? process.env.EXPO_PUBLIC_IMAGE_OPTIMIZER_URL ?? '').replace(/\/$/, '');
  if (!origin || !/^https:\/\//.test(origin)) return uri;
  try {
    const url = new URL(uri);
    if (url.protocol !== 'https:' || url.username || url.password || !HOSTS.includes(url.hostname)) return uri;
    const ratio = Math.min(opts.ratio ?? PixelRatio.get(), 3);
    return `${origin}/_next/image?url=${encodeURIComponent(url.toString())}&w=${nearestSize(Math.ceil(widthDp * ratio))}&q=${QUALITY}`;
  } catch {
    return uri;
  }
}
