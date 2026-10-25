import React, { forwardRef } from 'react';
import { Linking, Text, View } from 'react-native';
import NativeMapView, { Marker as NativeMarker, PROVIDER_DEFAULT } from 'react-native-maps';
import { mapAvailable, mapsUrl } from '../utils/mapAvailability';
import { Button } from '../../../packages/ui-native/src';
import { useScreenUi } from './screen/ScreenKit';

export { PROVIDER_DEFAULT, mapAvailable };
export type { Region } from 'react-native-maps';

/** Without a map key (Android build with no Google Maps key) a pin has nowhere to be drawn. */
export const Marker: typeof NativeMarker = (mapAvailable ? NativeMarker : () => null) as typeof NativeMarker;

type Centre = { latitude: number; longitude: number };

/**
 * Shown where a map would be when the build cannot mount one: a plain card with the point and a way out to the phone's Maps app.
 * Screens that can offer more (the providers list, the manual address) check `mapAvailable` themselves and never get here.
 */
function MapUnavailable({ style, centre, label }: { style?: unknown; centre?: Centre; label?: string }) {
  const { k, theme, c, flow } = useScreenUi();
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, backgroundColor: c.bg.sunken }, style as never]} accessibilityLabel={k('map.unavailable.title')} testID="map-unavailable">
      <Text style={{ color: c.text.primary, ...flow }}>{k('map.unavailable.title')}</Text>
      {centre ? (
        <Button label={k('map.openInMaps')} variant="outline" size="md" onPress={() => void Linking.openURL(mapsUrl(centre.latitude, centre.longitude, label || '')).catch(() => undefined)} theme={theme} testID="map-open-in-maps" />
      ) : null}
    </View>
  );
}

type MapProps = React.ComponentProps<typeof NativeMapView> & { fallbackLabel?: string };

/**
 * The map. With a key (or on iOS) it is react-native-maps as before; without one it is `MapUnavailable`, so the native view that
 * would crash the app is never mounted. Children (markers) are not rendered in that case.
 */
// The type and the value share the name so `useRef<MapView>(null)` keeps working in the screens.
type MapView = NativeMapView;
const MapView = forwardRef<NativeMapView, MapProps>(function MapView({ fallbackLabel, ...props }, ref) {
  if (mapAvailable) return <NativeMapView ref={ref} {...props} />;
  const region = props.region ?? props.initialRegion;
  return <MapUnavailable style={props.style} centre={region ? { latitude: region.latitude, longitude: region.longitude } : undefined} label={fallbackLabel} />;
});

export default MapView;
