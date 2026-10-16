import { getImageProps } from "next/image";
import { allowedImageUrl } from "@/lib/image-hosts";

/**
 * P14.20: a picture on an allowed host through the image optimizer (AVIF/WebP, quality 75), for a box `width` CSS px
 * wide; the address is the 2x rendition (Next's nearest size: 44 -> 96, 88/128 -> 256, 192 -> 384, 414 -> 828),
 * instead of the original upload, which runs to hundreds of KB (a doctor's photo shown at 80 px, a clinic cover at
 * phone width). For a plain <img> that cannot be <Image> (the CSP refuses its inline style; see CatalogImage).
 * An address on any other host is returned as it is (next/image would throw for it); none stays none.
 */
export function optimizedImageSrc(src: string | null | undefined, width: number): string | undefined {
  if (!src) return undefined;
  const allowed = allowedImageUrl(src);
  if (!allowed) return src;
  return getImageProps({ src: allowed, alt: "", width, height: width }).props.src;
}
