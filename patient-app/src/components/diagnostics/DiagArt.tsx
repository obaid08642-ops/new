import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CATEGORY_ART_ROLE_VAR } from '../../../../packages/ui/icons/category-art';
import { DIAG_ART, DIAG_ART_TONE, DIAG_ART_VIEWBOX, type DiagArtKey, type DiagArtRole } from '../../../../packages/ui/icons/diag-art';
import { useScreenUi } from '../screen/ScreenKit';

/**
 * The category illustration of a test or scan (one per category: blood, X-ray ...) on its tone's wash. The shapes are the shared module
 * packages/ui/icons/diag-art.ts (the web draws the very same data); each colour role resolves to the token its CSS variable names, for the active theme.
 */
export function DiagArt({ art, size = 56 }: { art: DiagArtKey; size?: number }) {
  const { t, c } = useScreenUi();
  const tone = c.service[DIAG_ART_TONE[art]];
  const resolve = (v: string): string => {
    if (v === '--nabd-tone-bg') return tone.bg;
    if (v === '--nabd-tone-fg') return tone.fg;
    const [group, name] = v.replace('--nabd-color-', '').split('-');
    return (t.color as unknown as Record<string, Record<string, string>>)[group][name];
  };
  const role = Object.fromEntries(Object.entries(CATEGORY_ART_ROLE_VAR).map(([r, v]) => [r, resolve(v)])) as Record<DiagArtRole, string>;
  return (
    <View testID={`diag-art-${art}`} style={{ width: size, height: size, borderRadius: 16, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox={DIAG_ART_VIEWBOX}>
        {DIAG_ART[art].map((shape, i) => (
          <Path key={i} d={shape.d} fill={shape.fill ? role[shape.fill] : 'none'} stroke={shape.stroke ? role[shape.stroke] : undefined} strokeWidth={shape.sw} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
    </View>
  );
}
