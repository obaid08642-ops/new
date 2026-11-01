import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FIcon } from '../../../../packages/ui-native/src';
import { SPECIALTY_ALL_LOOK, SPECIALTY_MORE_LOOK, type SpecialtyLook, type SpecialtyTileModel } from '../../../../packages/ui/icons/specialty-look';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * The specialty tiles of the consultations hub and the full specialty grid, in the board's own style (docs/design/canvas/Consult.dc.html):
 * a filled icon of the board's set in a soft tonal chip (58) over the name (the shared look data, packages/ui/icons/specialty-look.ts, the web
 * draws the same). Every tile is a normal tile that opens the doctor search; a specialty with no doctor yet gets the search's empty state there.
 */

/** The board's tile: a 64 wide column, the chip 58, the name under it. */
export const SPECIALTY_TILE_WIDTH = 64;
export const SPECIALTY_CHIP = 58;
const GAP = 8;

export type SpecialtyTileProps = {
  id: string;
  label: string;
  look: SpecialtyLook;
  selected?: boolean;
  onPress: () => void;
  /** Fills its cell (the grid) instead of the row's fixed width. */
  fill?: boolean;
  /** The row's tile: the name on one line (the board's), so every tile is as tall as the others and nothing is left empty under a short name; the grid keeps two lines. */
  oneLine?: boolean;
};

export function SpecialtyTile({ id, label, look, selected = false, onPress, fill = false, oneLine = false }: SpecialtyTileProps) {
  const { theme, t, c } = useScreenUi();
  const tone = c.service[look.tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={`specialty-tile-${id}`}
      onPress={onPress}
      style={({ pressed }) => ({ ...(fill ? { flex: 1 } : { width: SPECIALTY_TILE_WIDTH }), alignItems: 'center', gap: 6, opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ borderRadius: 20, borderWidth: 2, borderColor: selected ? tone.fg : 'transparent', padding: 1 }}>
        <FIcon icon={look.icon} tone={look.tone} chip="soft" size={SPECIALTY_CHIP} theme={theme} />
      </View>
      <Text numberOfLines={oneLine ? 1 : 2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ ...scale(t, 'meta', selected ? 'bold' : 'medium'), color: c.text.primary, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export type SpecialtyRowProps = {
  tiles: readonly SpecialtyTileModel[];
  allLabel: string;
  moreLabel: string;
  /** '' = "All". */
  activeSlug: string;
  onAll: () => void;
  onSelect: (tile: SpecialtyTileModel) => void;
  onMore: () => void;
};

/** "All" first, the specialties with doctors (most doctors first), the others, then "All specialties" (the grid with search). */
export function SpecialtyRow({ tiles, allLabel, moreLabel, activeSlug, onAll, onSelect, onMore }: SpecialtyRowProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: GAP, paddingTop: 2, paddingHorizontal: 2, paddingBottom: 0 }} testID="specialty-row">
      <SpecialtyTile id="all" label={allLabel} look={SPECIALTY_ALL_LOOK} selected={activeSlug === ''} onPress={onAll} oneLine />
      {tiles.map((tile) => (
        <SpecialtyTile key={tile.slug} id={tile.slug} label={tile.name} look={tile.look} selected={activeSlug === tile.slug} onPress={() => onSelect(tile)} oneLine />
      ))}
      <SpecialtyTile id="more" label={moreLabel} look={SPECIALTY_MORE_LOOK} onPress={onMore} oneLine />
    </ScrollView>
  );
}
