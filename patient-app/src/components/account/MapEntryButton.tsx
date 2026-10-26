import React from 'react';
import { router, type Href } from 'expo-router';

import { Pressable } from 'react-native';

import { Icon } from '../../../../packages/ui-native/src';
import { mapHref, type MapKind } from '../../utils/mapEntry';
import { useScreenUi } from '../screen/ScreenKit';

/**
 * The entry to the providers map (`/map`) from Home and the provider lists. With a `kind` the map opens filtered to
 * that kind of provider (`/map?type=<kind>`). The existing pin icon on the shared IconButton, labelled "Map".
 */
export function MapEntryButton({ kind, testID }: { kind?: MapKind; testID?: string }) {
  const { theme, k, c } = useScreenUi();
  // owner ink override 2026-10-26: the map icon is amber (its service tone) in a soft tile, not ink
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={k('services.cat.map')}
      onPress={() => router.push(mapHref(kind) as Href)}
      testID={testID ?? 'map-entry'}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: c.service.map.bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
    >
      <Icon name="pin" size={20} theme={theme} color={c.service.map.glyph} />
    </Pressable>
  );
}
