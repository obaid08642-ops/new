import { I18nManager } from 'react-native';

import { tokens, type ThemeName } from '../../../design-tokens/dist/ts/tokens';

/**
 * What the native shells read from `@nabd/design-tokens` (DEVICE_STANDARD §1:
 * "visual tokens come only from @nabd/design-tokens"). The token tree is CSS-first
 * ("12px", "0 18px 40px rgba(…)"); React Native wants numbers for lengths, and
 * takes the shadow string as `boxShadow` (new architecture, RN ≥ 0.76).
 */

export type { ThemeName };
export type Direction = 'ltr' | 'rtl';

/** "12px" -> 12. Numbers pass through. */
export const px = (value: string | number): number => (typeof value === 'number' ? value : parseFloat(value));

/**
 * The font faces patient-app registers with expo-font (app/_layout.tsx). An app
 * that has not registered them falls back to the system face; nothing breaks.
 */
export const SHELL_FONT = { regular: 'ReadexPro-400', medium: 'ReadexPro-500', bold: 'ReadexPro-700' } as const;

/** Minimum touch target: 44 pt iOS / 48 dp Android are both met by 48 where space allows (DEVICE_STANDARD §3.3). */
export const HIT = 44;

export function resolveDirection(direction?: Direction): Direction {
  return direction ?? (I18nManager.isRTL ? 'rtl' : 'ltr');
}

export function shellTokens(theme: ThemeName = 'light') {
  const t = tokens(theme);
  return {
    canvas: t.color.bg.canvas,
    surface: t.color.bg.surface,
    text: t.color.text.primary,
    muted: t.color.text.secondary,
    hairline: t.color.border.subtle,
    glass: t.color.glass.bg,
    glassStrong: t.color.glass.bgStrong,
    selectedBg: t.color.action.selected.bg,
    selectedFg: t.color.action.selected.fg,
    fabFrom: t.color.action.fab.from,
    fabTo: t.color.action.fab.to,
    fabFg: t.color.action.fab.fg,
    shadowTabBar: t.shadow.tabBar,
    shadowFab: t.shadow.fab,
    shadowGlass: t.shadow.glass,
    space: {
      xs: px(t.space.xs),
      sm: px(t.space.sm),
      '2xs': px(t.space['2xs']),
    },
    zSticky: t.z.sticky,
    zAppBar: t.z.appBar,
    pressScale: t.motion.press.scale,
  };
}
