import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveImageUri } from '@/utils/imageUrl';

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
}: {
  uri?: string | null;
  style?: StyleProp<ImageStyle & ViewStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
  placeholderColor?: string;
  iconColor?: string;
  iconSize?: number;
  transition?: number;
}) {
  const resolved = resolveImageUri(uri);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
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
