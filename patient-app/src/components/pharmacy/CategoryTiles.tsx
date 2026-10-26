import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FIcon } from '../../../../packages/ui-native/src';
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from '../../../../packages/ui/icons/fill';
import { PHARMACY_TONE } from './PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * The pharmacy categories as large tiles in two rows that scroll sideways (owner layout decision 7): the same tile style
 * as the Reminders / My orders tiles of Home. No product counts are drawn (decision 8).
 *
 * The art of a tile is `CategoryArt`. Until the shared category-illustration module of packages/ui is on main it is the
 * service-tone FIcon tile of the identity (token colours only); the illustration replaces only that function.
 */

export type CategoryTile = { id: string; label: string };

const TONE = {
  medications: SERVICE_ICONS.pharmacy.tone,
  hair: SERVICE_ICONS.map.tone,
  makeup: SERVICE_ICONS.emergency.tone,
  skin: SERVICE_ICONS.nursing.tone,
  baby: SERVICE_ICONS.maternity.tone,
  vitamins: SERVICE_ICONS.nutrition.tone,
  personal: SERVICE_ICONS.mind.tone,
} as const;

const ART: Record<string, { icon: FillIconName; tone: ServiceTone }> = {
  all: { icon: 'squares-four', tone: 'ink' },
  medications: { icon: 'pill', tone: TONE.medications },
  'hair-care': { icon: 'sparkle', tone: TONE.hair },
  cosmetics: { icon: 'star', tone: TONE.makeup },
  skincare: { icon: 'drop', tone: TONE.skin },
  baby: { icon: 'baby-carriage', tone: TONE.baby },
  vitamins: { icon: 'bowl-food', tone: TONE.vitamins },
  'personal-care': { icon: 'hand-heart', tone: TONE.personal },
};

/** The picture of one category tile (placeholder structure: the shared illustration module plugs in here). */
function CategoryArt({ id }: { id: string }) {
  const { theme } = useScreenUi();
  const art = ART[id] ?? ART.all;
  return <FIcon icon={art.icon} tone={art.tone} size={42} theme={theme} />;
}

export const TILE_WIDTH = 104;
export const TILE_HEIGHT = 96;
const GAP = 8;

export function CategoryTiles({ items, activeId, onSelect }: { items: CategoryTile[]; activeId: string; onSelect: (id: string) => void }) {
  const { theme, t, c } = useScreenUi();
  void theme;
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
                <CategoryArt id={item.id} />
                <Text numberOfLines={2} style={{ ...scale(t, 'micro', 'bold'), color: c.text.primary, textAlign: 'center' }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
