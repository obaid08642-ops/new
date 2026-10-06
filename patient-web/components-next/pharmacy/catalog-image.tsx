import { getImageProps } from "next/image";

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
  // eslint-disable-next-line @next/next/no-img-element -- the optimizer's own props, minus the style attribute
  return <img {...rest} className={className} />;
}
