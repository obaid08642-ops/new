import React from 'react';
import { Pressable, View, useWindowDimensions, type AccessibilityState } from 'react-native';

import { tokens } from '../../../../packages/design-tokens/dist/ts/tokens';
import { useScreenUi } from '../screen/ScreenKit';

/**
 * The one size of every round header button (Home top bar, pharmacy / labs / scans / search headers): a 44 hit area
 * (token `a11y.minTouchTarget`), a 24 icon, one gap (token `space.2xs`, `space.3xs` on phones under 390 wide) and one
 * badge anchor, so the buttons of a header are interchangeable and a header never mixes sizes.
 */
const px = (value: string): number => parseInt(value, 10);
const base = tokens('light');
export const HEADER_HIT = px(base.a11y.minTouchTarget);
export const HEADER_ICON = 24;
const GAP = px(base.space['2xs']);
const GAP_NARROW = px(base.space['3xs']);
/** A count bubble or an unread dot sits on the end corner of the button, by `end` so it mirrors in RTL. */
export const HEADER_BADGE_ANCHOR = { position: 'absolute', top: -3, end: -3 } as const;

/** The gap between header buttons for a window width. */
export function headerGap(width: number): number {
  return width < 390 ? GAP_NARROW : GAP;
}
export function useHeaderGap(): number {
  return headerGap(useWindowDimensions().width);
}

type RoundProps = {
  label: string;
  onPress: () => void;
  testID?: string;
  role?: 'button' | 'switch';
  state?: AccessibilityState;
  /** The icon (24) or text of the button. */
  children: React.ReactNode;
  /** A count bubble or dot, drawn on the shared corner. */
  badge?: React.ReactNode;
};

export function HeaderRound({ label, onPress, testID, role = 'button', state, children, badge }: RoundProps) {
  const { c } = useScreenUi();
  return (
    <View>
      <Pressable
        accessibilityRole={role}
        accessibilityLabel={label}
        accessibilityState={state}
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => ({ width: HEADER_HIT, height: HEADER_HIT, borderRadius: HEADER_HIT / 2, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.onGlass, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
      >
        {children}
      </Pressable>
      {badge}
    </View>
  );
}

/** The coral unread dot (10, 2 ring) on the shared badge corner. */
export function HeaderDot({ testID }: { testID: string }) {
  const { c } = useScreenUi();
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ ...HEADER_BADGE_ANCHOR, width: 10, height: 10, borderRadius: 5, backgroundColor: c.avatar.ring, borderWidth: 2, borderColor: c.bg.surface }}
    />
  );
}

/** Keeps the place of a button that is not drawn (the cart while every cart is empty) so the others never move. */
export function HeaderSlot({ testID }: { testID?: string }) {
  return <View testID={testID} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: HEADER_HIT, height: HEADER_HIT }} />;
}
