"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getImageProps } from "next/image";

/**
 * A catalogue picture (decorative: empty alt) that gives way to `fallback` (the service tone's FIcon tile) when the
 * picture fails to load, so a missing file on the CDN never shows as a broken image. An error that fired before
 * hydration is caught by checking the element once mounted.
 */
export function PhotoWithFallback({ src, className, wrapClassName, sizes, fallback }: { src: string; className: string; wrapClassName: string; sizes: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return <>{fallback}</>;
  const { props } = getImageProps({ src, alt: "", sizes, fill: true });
  const { style: _inlineStyle, ...rest } = props;
  return (
    <span className={wrapClassName}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the optimizer's own props, minus the style attribute (CSP) */}
      <img ref={ref} {...rest} className={className} onError={() => setFailed(true)} />
    </span>
  );
}
