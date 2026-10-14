import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

import {
  BRAND_GOOGLE_PATH,
  BRAND_GOOGLE_VIEWBOX,
  BRAND_SNAPCHAT_PATH,
  BRAND_SNAPCHAT_VIEWBOX,
  BRAND_X_PATH,
  BRAND_X_VIEWBOX,
} from '../../../ui/icons/marks';

export type BrandName = 'google' | 'x' | 'snapchat';

const BRANDS: Record<BrandName, { path: string; viewBox: string; label: string }> = {
  google: { path: BRAND_GOOGLE_PATH, viewBox: BRAND_GOOGLE_VIEWBOX, label: 'Google' },
  x: { path: BRAND_X_PATH, viewBox: BRAND_X_VIEWBOX, label: 'X' },
  snapchat: { path: BRAND_SNAPCHAT_PATH, viewBox: BRAND_SNAPCHAT_VIEWBOX, label: 'Snapchat' },
};

export interface BrandMarkProps {
  brand: BrandName;
  /** The height of the mark in dp; the width follows the glyph's own proportions. */
  size?: number;
  /** One colour, normally the button's text colour. The mark is never drawn in the brand's own colours. */
  color: string;
  /** Spoken name. Omit when the mark sits inside a button that already has a label (the usual case). */
  label?: string;
  testID?: string;
}

/**
 * <BrandMark> - the Google, X and Snapchat marks of the "continue with" buttons (Auth boards). Single colour,
 * from the caller (a token colour); decorative unless `label` is given.
 */
export function BrandMark({ brand, size = 20, color, label, testID }: BrandMarkProps) {
  const { path, viewBox } = BRANDS[brand];
  const [, , w, h] = viewBox.split(' ').map(Number);
  return (
    <Svg
      testID={testID}
      width={Math.round((size * w) / h)}
      height={size}
      viewBox={viewBox}
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      <Path d={path} fill={color} />
    </Svg>
  );
}
