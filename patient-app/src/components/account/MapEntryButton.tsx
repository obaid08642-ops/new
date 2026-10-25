import React from 'react';
import { router, type Href } from 'expo-router';

import { IconButton } from '../../../../packages/ui-native/src';
import { mapHref, type MapKind } from '../../utils/mapEntry';
import { useScreenUi } from '../screen/ScreenKit';

/**
 * The entry to the providers map (`/map`) from Home and the provider lists. With a `kind` the map opens filtered to
 * that kind of provider (`/map?type=<kind>`). The existing pin icon on the shared IconButton, labelled "Map".
 */
export function MapEntryButton({ kind, testID }: { kind?: MapKind; testID?: string }) {
  const { theme, k } = useScreenUi();
  return <IconButton name="pin" label={k('services.cat.map')} variant="outlined" theme={theme} onPress={() => router.push(mapHref(kind) as Href)} testID={testID ?? 'map-entry'} />;
}
