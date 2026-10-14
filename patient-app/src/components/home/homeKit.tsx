import React from 'react';
import { Text, useWindowDimensions, type TextProps } from 'react-native';

import { tokens, type ThemeName } from '../../../../packages/design-tokens/dist/ts/tokens';
import { SHELL_FONT } from '../../../../packages/ui-native/src';
import { useApp } from '../../context/AppContext';
import { autoTranslate } from '../../i18n';
import { LocalizedText } from '../LocalizedText';

/**
 * Shared bits of the hub screens (Home, Services), built from HomeApp / ServiceHub
 * (canvas/HomeApp.dc.html, canvas/ServiceHub.dc.html): the active theme and its tokens, a translator for
 * strings that are not Text children, the readable column, and the board's text styles.
 */

export const FONT = SHELL_FONT;

/** The phone-style column of Home: centred, at most 440 wide (DEVICE_STANDARD tablet rule), 16 at the sides. */
export const PHONE_COLUMN = { width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 16 } as const;

/** The hub column of Services: the same 16 at the sides, wider on a tablet so the grid can use the room. */
export const HUB_COLUMN = { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16 } as const;

/** The active theme, its tokens, the reading direction, and a translator for strings that are not Text children. */
export function useScreenUi() {
  const { isDark, lang, isRTL } = useApp();
  const theme: ThemeName = isDark ? 'dark' : 'light';
  const t = tokens(theme);
  const tr = (s: string): string => autoTranslate(s, lang);
  return { theme, t, c: t.color, lang, isRTL, tr };
}

/** Grid columns of a tile hub: 3 on a phone, 4 from tablet width. */
export function useTileColumns(): number {
  const { width } = useWindowDimensions();
  return width >= 768 ? 4 : 3;
}

type Weight = 'regular' | 'medium' | 'bold';
type TxtProps = TextProps & { weight?: Weight; size?: number; color?: string };

function textStyle(c: ReturnType<typeof useScreenUi>['c'], weight: Weight, size: number, color?: string) {
  return { fontFamily: FONT[weight], fontSize: size, lineHeight: Math.round(size * 1.5), color: color ?? c.text.primary, textAlign: 'auto' } as const;
}

/**
 * A text in the board's face (Readex Pro 400/500/700). Arabic source strings are translated through the
 * six-language catalogue; values from the API (names, titles) pass through unchanged.
 */
export function Txt({ weight = 'regular', size = 15, color, children, style, ...rest }: TxtProps) {
  const { c } = useScreenUi();
  return (
    <LocalizedText {...rest} style={[textStyle(c, weight, size, color), style]}>
      {children}
    </LocalizedText>
  );
}

/** The same text for values that must not be translated (numbers, formatted dates). */
export function Plain({ weight = 'regular', size = 15, color, children, style, ...rest }: TxtProps) {
  const { c } = useScreenUi();
  return (
    <Text {...rest} style={[textStyle(c, weight, size, color), style]}>
      {children}
    </Text>
  );
}
