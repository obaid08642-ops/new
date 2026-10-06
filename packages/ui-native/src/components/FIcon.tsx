import * as React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { FIconProps } from '../../../ui/components/contract';
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX } from '../../../ui/icons/fill';
import { tokens } from '../../../design-tokens/dist/ts/tokens';

/**
 * <FIcon> — React Native. Same geometry (packages/ui/icons/fill.ts, ported from
 * canvas/FIcon.dc.html) and the same rules as the web renderer: radius 32% of the
 * edge, glyph 52%, `soft` / `solid` / `none` chips, colours from
 * color.service.<tone> for the given theme. Decorative unless `label` is given.
 */
export function FIcon({ icon, tone, size = 52, chip = 'soft', label, testID, theme = 'light' }: FIconProps & { theme?: 'light' | 'dark' }) {
  const t = tokens(theme);
  const c = t.color.service[tone];
  const glyph = chip === 'none' ? size : Math.round(size * 0.52);
  const radius = Math.round(size * 0.32);
  const gradientId = `nabd-ficon-${tone}`;

  return (
    <View
      testID={testID}
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: chip === 'soft' ? c.bg : 'transparent',
        boxShadow: chip === 'solid' ? t.shadow.tile : undefined,
        overflow: chip === 'solid' ? 'hidden' : 'visible',
      }}
    >
      {chip === 'solid' ? (
        <Svg width={size} height={size} style={{ position: 'absolute', top: 0, start: 0 }}>
          <Defs>
            {/* 160deg, as on the board */}
            <LinearGradient id={gradientId} x1="0.33" y1="0" x2="0.67" y2="1">
              <Stop offset="0" stopColor={c.solid.from} />
              <Stop offset="1" stopColor={c.solid.to} />
            </LinearGradient>
          </Defs>
          <Rect width={size} height={size} rx={radius} fill={`url(#${gradientId})`} />
        </Svg>
      ) : null}
      <Svg width={glyph} height={glyph} viewBox={FILL_ICON_VIEWBOX}>
        <Path d={FILL_ICON_PATHS[icon]} fill={chip === 'solid' ? t.color.icon.onSolid : c.fg} />
      </Svg>
    </View>
  );
}
