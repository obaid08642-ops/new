import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { allowedImageUrl } from "@/lib/image-hosts";

/**
 * A product picture through the image optimizer (WebP/AVIF at the right size, lazy unless `priority`) WITHOUT the
 * inline `style` attribute that <Image> adds (`color: transparent`, and the absolute box of `fill`): the CSP refuses
 * style attributes. The layout comes from the class: a `fill` picture is positioned by it, a sized one by its box.
 */
export function CatalogImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
  width,
  height,
}: {
  src: string;
  alt: string;
  sizes: string;
  className: string;
  priority?: boolean;
  /** Both, for a picture with its own box; neither, for one that fills its parent (the class positions it). */
  width?: number;
  height?: number;
}) {
  const { props } = getImageProps(width && height ? { src, alt, sizes, priority, width, height } : { src, alt, sizes, priority, fill: true });
  const { style: _inlineStyle, ...rest } = props;
  // P14.20: the page's LCP picture (priority) is announced in the <head> with its srcset, so the browser fetches the
  // right rendition before it lays out the page (<Image priority> would do this, but it carries an inline style)
  if (priority && rest.src) preload(rest.src, { as: "image", imageSrcSet: rest.srcSet, imageSizes: rest.sizes, fetchPriority: "high" });
  // eslint-disable-next-line @next/next/no-img-element -- the optimizer's own props, minus the style attribute
  return <img {...rest} className={className} />;
}

/**
 * F82: the picture of a product card through the optimizer, sized for the card (its picture box is 132 px high; the
 * 2x rendition, 256 px wide, covers high-density phones), or undefined when the address is not on an allowed host (the card
 * then shows the address as it is, as before). The catalogue's originals are up to 500 KB each and came from the
 * CDN as they were: 2-3 MB of pictures and two dozen third-party requests on the first page of the catalogue.
 * Called by the server pages that build the cards; the client card only receives the address.
 */
export function productCardImageSrc(src: string | null | undefined): string | undefined {
  const allowed = allowedImageUrl(src);
  if (!allowed) return undefined;
  return getImageProps({ src: allowed, alt: "", width: 128, height: 128 }).props.src;
}
