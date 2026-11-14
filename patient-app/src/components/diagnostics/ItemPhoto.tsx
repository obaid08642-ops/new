import React, { useState, type ReactNode } from 'react';
import { Image } from 'expo-image';
import { resolveDiagImage } from '../../utils/diagImage';

/** The item's own picture; `fallback` (the category art or the service glyph) when it has none or the file fails to load. */
export function ItemPhoto({ image, size, radius, bg, fallback }: { image?: string; size: number; radius: number; bg: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const uri = resolveDiagImage(image, size);
  if (!uri || failed) return <>{fallback}</>;
  return (
    <Image testID="item-photo" cachePolicy="memory-disk" accessibilityIgnoresInvertColors source={{ uri }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg }} contentFit="cover" />
  );
}
