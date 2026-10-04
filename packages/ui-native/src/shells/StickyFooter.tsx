import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveDirection, shellTokens, type Direction, type ThemeName } from './shellTokens';

/**
 * <StickyFooter> — DEVICE_STANDARD §1: the CTA bar is its content plus
 * max(bottom inset, 16), so a button never sits on the home indicator or the
 * Android gesture bar. Glass background with a hairline on top (handoff §1:
 * glass only on the top bar, sticky CTA and sheets).
 *
 * `background` lets an app draw a real blur (e.g. expo-blur's BlurView) behind
 * the content; without it the translucent glass token is used.
 */

export interface StickyFooterProps {
  children: React.ReactNode;
  background?: React.ReactNode;
  theme?: ThemeName;
  direction?: Direction;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function StickyFooter({ children, background, theme = 'light', direction, style, testID }: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  const t = shellTokens(theme);
  const dir = resolveDirection(direction);
  return (
    <View
      testID={testID}
      style={[
        {
          paddingTop: t.space.xs,
          paddingBottom: Math.max(insets.bottom, t.space.sm),
          paddingStart: t.space.sm + (dir === 'rtl' ? insets.right : insets.left),
          paddingEnd: t.space.sm + (dir === 'rtl' ? insets.left : insets.right),
          backgroundColor: background ? 'transparent' : t.glass,
          borderTopWidth: 1,
          borderTopColor: t.hairline,
          zIndex: t.zSticky,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {background ? <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }}>{background}</View> : null}
      {children}
    </View>
  );
}
