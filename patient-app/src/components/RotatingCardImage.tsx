import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import ProductImage from './ProductImage';
import { shouldSkipRemoteImage } from '@/services/offline/degrade';
import { subscribeConnectivity } from '@/services/http/connectivity';

/**
 * RotatingCardImage — for catalogue cards. When a product has several real
 * photos, the card cycles through them every few seconds with a SLIDE
 * animation (current image slides out to the side, next slides in) instead
 * of a plain fade. Single-image products render statically.
 */
export default function RotatingCardImage({
  images,
  style,
  intervalMs = 4000,
  iconSize = 40,
  networkBudget = 'ignore',
}: {
  images: string[];
  style?: StyleProp<ImageStyle & ViewStyle>;
  intervalMs?: number;
  iconSize?: number;
  /** 15.4 — forwarded to ProductImage; the catalogue grid opts in. */
  networkBudget?: 'respect' | 'ignore';
}) {
  const [idx, setIdx] = useState(0);
  const count = images.length;
  const slide = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [, setLinkEpoch] = useState(0);

  // Re-evaluate the rotation budget when the link changes.
  useEffect(() => {
    if (networkBudget !== 'respect') return;
    return subscribeConnectivity(() => setLinkEpoch((value) => value + 1));
  }, [networkBudget]);

  useEffect(() => {
    if (count < 2 || width <= 0) return;
    // Rotating on a weak link would fetch every photo of every product. 15.4:
    // hold the first frame instead of spending the user's data.
    if (networkBudget === 'respect' && shouldSkipRemoteImage()) return;
    const t = setInterval(() => {
      // Slide current image out to the left…
      Animated.timing(slide, { toValue: -width, duration: 280, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % count);
        // …then bring the next one in from the right.
        slide.setValue(width);
        Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: true }).start();
      });
    }, intervalMs);
    return () => clearInterval(t);
  }, [count, intervalMs, width, slide, networkBudget]);

  if (!count) return null;
  return (
    <Animated.View
      style={[style, { transform: [{ translateX: slide }] }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <ProductImage
        uri={images[idx % count]}
        style={{ width: '100%', height: '100%' }}
        iconSize={iconSize}
        networkBudget={networkBudget}
      />
    </Animated.View>
  );
}
