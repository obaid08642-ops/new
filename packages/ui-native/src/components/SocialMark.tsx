import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

import { BRAND_SNAPCHAT_PATH, BRAND_SNAPCHAT_VIEWBOX, BRAND_X_PATH, BRAND_X_VIEWBOX } from '../../../ui/icons/marks';
import {
  APPLE_PATH,
  APPLE_VIEWBOX,
  GOOGLE_G_PARTS,
  GOOGLE_G_VIEWBOX,
  SNAPCHAT_GHOST,
  type SocialBrand,
} from '../../../ui/icons/social-brands';

export interface SocialMarkProps {
  brand: SocialBrand;
  /** Height in dp. */
  size?: number;
  /** The button's label colour: used by the single-colour marks (Apple, X). Google and Snapchat keep their own colours. */
  color: string;
  testID?: string;
}

/** The full-colour brand mark of a "continue with" button; decorative, the button carries the provider's name. */
export function SocialMark({ brand, size = 20, color, testID }: SocialMarkProps) {
  const a11y = { accessible: false, importantForAccessibility: 'no-hide-descendants' as const, testID };
  const box = (viewBox: string) => {
    const [, , w, h] = viewBox.split(' ').map(Number);
    return { viewBox, width: Math.round((size * w) / h), height: size };
  };
  if (brand === 'google') {
    return <Svg {...a11y} {...box(GOOGLE_G_VIEWBOX)}>{GOOGLE_G_PARTS.map((p) => <Path key={p.fill} d={p.path} fill={p.fill} />)}</Svg>;
  }
  if (brand === 'apple') return <Svg {...a11y} {...box(APPLE_VIEWBOX)}><Path d={APPLE_PATH} fill={color} /></Svg>;
  if (brand === 'snapchat') {
    return <Svg {...a11y} {...box(BRAND_SNAPCHAT_VIEWBOX)}><Path d={BRAND_SNAPCHAT_PATH} fill={SNAPCHAT_GHOST.fill} stroke={SNAPCHAT_GHOST.stroke} strokeWidth={14} strokeLinejoin="round" /></Svg>;
  }
  return <Svg {...a11y} {...box(BRAND_X_VIEWBOX)}><Path d={BRAND_X_PATH} fill={color} /></Svg>;
}
