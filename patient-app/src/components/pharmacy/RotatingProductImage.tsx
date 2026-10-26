import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

import ProductImage from '../ProductImage';
import { useScreenUi } from '../screen/ScreenKit';
import { MOTION, reduceMotion } from '../../utils/motion';

/** Every 2.5 s the card shows its next picture. */
export const ROTATION_MS = 2500;

/** The picture after `index` (the last turns back to the first). */
export const nextIndex = (index: number, count: number): number => (count > 0 ? (index + 1) % count : 0);

/**
 * A product card's picture. With more than one picture it turns through them every ROTATION_MS while `active` (the card is on
 * screen: the list says so through its viewability callback), crossfading over MOTION.fade, with small dots under it. Only the
 * NEXT picture is fetched ahead. The box never changes size. With reduced motion, or one picture, it is the plain first picture.
 */
export function RotatingProductImage({ uris, active, iconSize = 40 }: { uris: Array<string | null | undefined>; active: boolean; iconSize?: number }) {
  const { c } = useScreenUi();
  const key = uris.filter(Boolean).slice(0, 5).join('|');
  const list = useMemo(() => (key ? key.split('|') : []), [key]);
  const [index, setIndex] = useState(0);
  const turning = active && list.length > 1;

  useEffect(() => {
    if (!turning || reduceMotion()) return;
    const timer = setInterval(() => setIndex((now) => nextIndex(now, list.length)), ROTATION_MS);
    return () => clearInterval(timer);
  }, [turning, list.length]);

  useEffect(() => {
    if (!turning || reduceMotion()) return;
    void Image.prefetch(list[nextIndex(index, list.length)]).catch(() => undefined);
  }, [turning, index, list]);

  const shown = list[index] ?? list[0] ?? uris[0];
  return (
    <View style={{ width: '100%', height: '100%' }}>
      <ProductImage uri={shown} transition={MOTION.fade} style={{ width: '100%', height: '100%' }} iconSize={iconSize} />
      {list.length > 1 ? (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', bottom: 6, start: 0, end: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          {list.map((uri, i) => (
            <View key={`${uri}-${i}`} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === index ? c.action.primary.bg : c.border.hairline }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
