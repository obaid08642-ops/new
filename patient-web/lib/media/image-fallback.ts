import { allowedImageUrl } from "@/lib/image-hosts";

/**
 * The picture a failed `/_next/image?url=<original>&w=..` request was asking for, or null.
 * The optimizer gives up on an origin that answers slower than 7 s (hard-coded in Next) with a 504; the original on the CDN is served straight
 * from Cloudflare's cache and needs no Node hop, so the page shows that instead of a broken picture. Only allowed hosts are ever returned.
 */
export function originalOf(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const url = new URL(src, "https://x.invalid");
    if (url.pathname !== "/_next/image") return null;
    return allowedImageUrl(url.searchParams.get("url"));
  } catch {
    return null;
  }
}
