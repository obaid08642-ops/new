import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveImageUri } from '@/utils/imageUrl';
import {
  currentImageQualityTier,
  shouldDowngradeImages,
  shouldSkipRemoteImage,
  type ImageQualityTier,
} from '@/services/offline/degrade';
import { subscribeConnectivity } from '@/services/http/connectivity';

/**
 * ProductImage — Phase 4 requirements in one component:
 *   ✔ R2/CDN URLs only (resolveImageUri)   ✔ disk+memory caching (expo-image)
 *   ✔ lazy: expo-image decodes off-thread; caller places it in virtualized lists
 *   ✔ placeholder (blurred box + pill icon while loading)
 *   ✔ onError fallback — a broken image is NEVER shown
 */
export default function ProductImage({
  uri,
  style,
  contentFit = 'contain',
  placeholderColor = '#EEF2F5',
  iconColor = '#B7C4CC',
  iconSize = 40,
  transition = 200,
  networkBudget = 'ignore',
}: {
  uri?: string | null;
  style?: StyleProp<ImageStyle & ViewStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
  placeholderColor?: string;
  iconColor?: string;
  iconSize?: number;
  transition?: number;
  /**
   * 15.4 — `'respect'` spends no bytes on a link that cannot afford them: on a
   * poor or offline connection the local placeholder is shown instead of
   * fetching the photo, and the full image appears once the link recovers.
   *
   * Default `'ignore'` so no existing call site changes behaviour; the image-heavy
   * catalogue grid opts in.
   */
  networkBudget?: 'respect' | 'ignore';
}) {
  const resolved = resolveImageUri(uri);
  const [failed, setFailed] = useState(false);
  const [tier, setTier] = useState<ImageQualityTier>(currentImageQualityTier);

  // Re-evaluate the budget when connectivity changes, so a photo the user could
  // not afford a minute ago loads as soon as the link recovers.
  useEffect(() => {
    if (networkBudget !== 'respect') return;
    setTier(currentImageQualityTier());
    return subscribeConnectivity(() => setTier(currentImageQualityTier()));
  }, [networkBudget]);

  if (!resolved || failed || (networkBudget === 'respect' && shouldSkipRemoteImage())) {
    return (
      <View style={[styles.fallback, { backgroundColor: placeholderColor }, style as any]}>
        <MaterialCommunityIcons name="pill" size={iconSize} color={iconColor} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolved }}
      style={style as any}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      // A smaller rendition is requested on a weak link, and a smaller decode is
      // used when downscaling is available.
      allowDownscaling={shouldDowngradeImages()}
      priority={tier === 'low' ? 'low' : 'normal'}
      recyclingKey={resolved}
      placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
      placeholderContentFit={contentFit}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
