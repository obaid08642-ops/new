import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import Svg, { Path } from 'react-native-svg';

import { CATEGORY_ART, CATEGORY_ART_ROLE_VAR, CATEGORY_ART_TONE, CATEGORY_ART_VIEWBOX, categoryArtKey, type CategoryArtRole } from '../../../../packages/ui/icons/category-art';
import { PHARMACY_TONE } from './PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * The pharmacy categories as large tiles in two rows that scroll sideways (owner layout decision 7): the same tile style
 * as the Reminders / My orders tiles of Home. No product counts are drawn (decision 8).
 *
 * The art of a tile is `CategoryArt`. The art is the shared module packages/ui/icons/category-art.ts; its colour roles map to the active theme's tokens.
 */

export type CategoryTile = { id: string; label: string };

/** The picture of one category tile: the shared illustration module of packages/ui drawn with react-native-svg. */
function CategoryArt({ id, label }: { id: string; label: string }) {
  const { t, c } = useScreenUi();
  const key = id === 'all' ? 'all' : categoryArtKey(label);
  const tone = c.service[CATEGORY_ART_TONE[key]];
  // each role reads the token its CSS variable names (the module's CATEGORY_ART_ROLE_VAR), resolved for the active theme
  const resolve = (v: string): string => {
    if (v === '--nabd-tone-bg') return tone.bg;
    if (v === '--nabd-tone-fg') return tone.fg;
    // --nabd-color-<group>-<name> is t.color.<group>.<name>
    const [group, name] = v.replace('--nabd-color-', '').split('-');
    return (t.color as unknown as Record<string, Record<string, string>>)[group][name];
  };
  const role = Object.fromEntries(Object.entries(CATEGORY_ART_ROLE_VAR).map(([r, v]) => [r, resolve(v)])) as Record<CategoryArtRole, string>;
  return (
    <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={42} height={42} viewBox={CATEGORY_ART_VIEWBOX}>
        {CATEGORY_ART[key].map((sh, i) => (
          <Path key={i} d={sh.d} fill={sh.fill ? role[sh.fill] : 'none'} stroke={sh.stroke ? role[sh.stroke] : undefined} strokeWidth={sh.sw} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
    </View>
  );
}

export const TILE_WIDTH = 104;
export const TILE_HEIGHT = 96;
const GAP = 8;

export function CategoryTiles({ items, activeId, onSelect }: { items: CategoryTile[]; activeId: string; onSelect: (id: string) => void }) {
  const { t, c } = useScreenUi();
  const perRow = Math.max(1, Math.ceil(items.length / 2));
  return (
    <View style={{ marginHorizontal: -16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <View style={{ width: perRow * TILE_WIDTH + (perRow - 1) * GAP, flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {items.map((item) => {
            const selected = item.id === activeId;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
                testID={`pharmacy-cat-${item.id}`}
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => ({
                  width: TILE_WIDTH,
                  minHeight: TILE_HEIGHT,
                  borderRadius: 20,
                  backgroundColor: selected ? c.service[PHARMACY_TONE].bg : c.bg.surface,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? c.service[PHARMACY_TONE].fg : c.border.hairline,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <CategoryArt id={item.id} label={item.label} />
                <Text numberOfLines={2} style={{ ...scale(t, 'micro', 'bold'), color: c.text.primary, textAlign: 'center' }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
