"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { getConnectionQuality, imageQualityFor, subscribeConnection } from "@/lib/api/net/connection";

export type AdaptiveImageProps = Omit<ImageProps, "quality"> & {
  /** Explicit override; otherwise the connection decides. */
  quality?: number;
};

/**
 * P15.4 — lower image quality on slow networks.
 *
 * Drop-in for `next/image`: every prop passes through untouched, only `quality`
 * is decided — 75 on decent links, 50 when the browser reports a slow or
 * data-saver connection. A caller-supplied `quality` always wins.
 */
export function AdaptiveImage({ quality, alt, ...rest }: AdaptiveImageProps) {
  const [autoQuality, setAutoQuality] = useState<number>(() => imageQualityFor(getConnectionQuality()));

  useEffect(() => subscribeConnection((next) => setAutoQuality(imageQualityFor(next))), []);

  return <Image quality={quality ?? autoQuality} alt={alt} {...rest} />;
}
