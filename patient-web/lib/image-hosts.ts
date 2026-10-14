/** The only hosts next/image may load (next.config.ts images.remotePatterns is built from this list). */
export const IMAGE_HOSTS = ["cdn.nabd.plus", "res.cloudinary.com"] as const;

/** An https image URL on an allowed host, or null: next/image THROWS for any other host, which would take the whole page down. */
export function allowedImageUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 800) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return (IMAGE_HOSTS as readonly string[]).includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}
