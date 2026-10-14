import React, { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';

import { FIcon } from '../../../packages/ui-native/src';
import { resolveImageUri } from '@/utils/imageUrl';
import { PHARMACY_TONE } from './pharmacy/PharmacyKit';
import { useScreenUi } from './home/homeKit';

/**
 * ProductImage — Phase 4 requirements in one component:
 *   ✔ R2/CDN URLs only (resolveImageUri)   ✔ disk+memory caching (expo-image)
 *   ✔ lazy: expo-image decodes off-thread; caller places it in virtualized lists
 *   ✔ placeholder (blurred box while loading)
 *   ✔ no photo, or a broken one: the board's tinted tile with the pill glyph, never a fake photo
 *
 * The caller gives the size (a number or a percentage of a box with a fixed size), so the layout never jumps.
 * Colours are the media tile and the coral service tone of the tokens.
 */
export default function ProductImage({
  uri,
  style,
  contentFit = 'contain',
  iconSize = 40,
  transition = 200,
}: {
  uri?: string | null;
  style?: StyleProp<ImageStyle & ViewStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
  iconSize?: number;
  transition?: number;
}) {
  const { theme, c } = useScreenUi();
  const resolved = resolveImageUri(uri);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return (
      <View style={[{ alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: c.bg.media }, style as StyleProp<ViewStyle>]}>
        <FIcon icon="pill" tone={PHARMACY_TONE} chip="none" size={iconSize} theme={theme} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolved }}
      style={style as StyleProp<ImageStyle>}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      recyclingKey={resolved}
      placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
      placeholderContentFit={contentFit}
      accessibilityIgnoresInvertColors
      onError={() => setFailed(true)}
    />
  );
}
