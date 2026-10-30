import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FIcon } from '../../../../packages/ui-native/src';
import { CATEGORY_ART_ROLE_VAR } from '../../../../packages/ui/icons/category-art';
import { SPECIALTY_ART, SPECIALTY_ART_TONE, SPECIALTY_ART_VIEWBOX, type SpecialtyArtKey, type SpecialtyArtRole, type SpecialtyTileModel } from '../../../../packages/ui/icons/specialty-art';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { specialtyLook } from './ConsultKit';

/**
 * The specialty tiles of the consultations hub and the full specialty grid: one illustration per specialty (the shared module
 * packages/ui/icons/specialty-art.ts, the web draws the same data) on its tone's wash. A specialty with no illustration yet draws
 * the fill icon it always had (`specialtyLook`), never a blank tile. A specialty with no doctor yet is muted and says "Coming soon".
 */

export const SPECIALTY_TILE_WIDTH = 96;
export const SPECIALTY_TILE_HEIGHT = 104;
const GAP = 8;

/** The picture: the illustration, or the specialty's fill icon when it has none. */
export function SpecialtyArt({ art, fallbackName, size = 48 }: { art: SpecialtyArtKey | null; fallbackName?: string; size?: number }) {
  const { theme, t, c } = useScreenUi();
  if (!art) {
    const look = specialtyLook(fallbackName);
    return <FIcon icon={look.icon} tone={look.tone} size={size} theme={theme} />;
  }
  const tone = c.service[SPECIALTY_ART_TONE[art]];
  const resolve = (v: string): string => {
    if (v === '--nabd-tone-bg') return tone.bg;
    if (v === '--nabd-tone-fg') return tone.fg;
    const [group, name] = v.replace('--nabd-color-', '').split('-');
    return (t.color as unknown as Record<string, Record<string, string>>)[group][name];
  };
  const role = Object.fromEntries(Object.entries(CATEGORY_ART_ROLE_VAR).map(([r, v]) => [r, resolve(v)])) as Record<SpecialtyArtRole, string>;
  return (
    <View testID={`specialty-art-${art}`} style={{ width: size, height: size, borderRadius: 15, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size - 6} height={size - 6} viewBox={SPECIALTY_ART_VIEWBOX}>
        {SPECIALTY_ART[art].map((shape, i) => (
          <Path key={i} d={shape.d} fill={shape.fill ? role[shape.fill] : 'none'} stroke={shape.stroke ? role[shape.stroke] : undefined} strokeWidth={shape.sw} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
    </View>
  );
}

export type SpecialtyTileProps = {
  id: string;
  label: string;
  art: SpecialtyArtKey | null;
  /** The name the fill-icon fallback is found from (the Arabic name the server sent). */
  fallbackName?: string;
  selected?: boolean;
  comingSoon?: boolean;
  comingSoonLabel?: string;
  onPress: () => void;
  /** Fills its cell (the grid) instead of the row's fixed width. */
  fill?: boolean;
};

export function SpecialtyTile({ id, label, art, fallbackName, selected = false, comingSoon = false, comingSoonLabel, onPress, fill = false }: SpecialtyTileProps) {
  const { t, c } = useScreenUi();
  const tone = c.service[art ? SPECIALTY_ART_TONE[art] : 'blue'];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={comingSoon && comingSoonLabel ? `${label}, ${comingSoonLabel}` : label}
      testID={`specialty-tile-${id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        ...(fill ? { flex: 1 } : { width: SPECIALTY_TILE_WIDTH }),
        minHeight: SPECIALTY_TILE_HEIGHT,
        borderRadius: 20,
        backgroundColor: selected ? tone.bg : comingSoon ? c.bg.sunken : c.bg.surface,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? tone.fg : c.border.hairline,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 6,
        paddingVertical: 8,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ opacity: comingSoon ? 0.55 : 1 }}>
        <SpecialtyArt art={art} fallbackName={fallbackName ?? label} />
      </View>
      <Text numberOfLines={2} style={{ ...scale(t, 'meta', selected ? 'bold' : 'medium'), color: comingSoon ? c.text.secondary : c.text.primary, textAlign: 'center' }}>{label}</Text>
      {comingSoon && comingSoonLabel ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{comingSoonLabel}</Text> : null}
    </Pressable>
  );
}

export type SpecialtyRowProps = {
  tiles: readonly SpecialtyTileModel[];
  /** The Arabic name by slug, for the fill-icon fallback. */
  arabicNames: Readonly<Record<string, string | undefined>>;
  allLabel: string;
  moreLabel: string;
  comingSoonLabel: string;
  /** '' = "All". */
  activeSlug: string;
  onAll: () => void;
  onSelect: (tile: SpecialtyTileModel) => void;
  onMore: () => void;
};

/** "All" first, the specialties with doctors (most doctors first), those without ("Coming soon"), then "All specialties" (the grid with search). */
export function SpecialtyRow({ tiles, arabicNames, allLabel, moreLabel, comingSoonLabel, activeSlug, onAll, onSelect, onMore }: SpecialtyRowProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: GAP, padding: 2 }} testID="specialty-row">
      <SpecialtyTile id="all" label={allLabel} art="all" selected={activeSlug === ''} onPress={onAll} />
      {tiles.map((tile) => (
        <SpecialtyTile key={tile.slug} id={tile.slug} label={tile.name} art={tile.art} fallbackName={arabicNames[tile.slug] ?? tile.name} selected={activeSlug === tile.slug} comingSoon={tile.comingSoon} comingSoonLabel={comingSoonLabel} onPress={() => onSelect(tile)} />
      ))}
      <SpecialtyTile id="more" label={moreLabel} art="more" onPress={onMore} />
    </ScrollView>
  );
}
