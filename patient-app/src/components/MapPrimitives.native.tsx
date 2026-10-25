import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Camera, Map as MLMap, Marker as MLMarker, UserLocation, type CameraRef } from '@maplibre/maplibre-react-native';
import { MAP_ATTRIBUTION, mapStyleFor, regionFromView, zoomForRegion, type Region } from './map-geometry';
import { useScreenUi } from './screen/ScreenKit';

/**
 * The map of the app on MapLibre Native with OpenFreeMap's keyless OpenStreetMap vector tiles (owner decision 2026-10-25: no Google
 * Maps key; react-native-maps on Android always starts Google Maps and crashes without one). The screens keep the API they had:
 * `<MapView ref initialRegion | region provider userInterfaceStyle showsUserLocation onPress onRegionChangeComplete>`,
 * `<Marker coordinate pinColor onPress>` and `ref.animateToRegion(region, ms)`; only this file knows MapLibre.
 */
export type { Region };
export const PROVIDER_DEFAULT = 'maplibre';

export interface MapViewHandle {
  animateToRegion(region: Region, durationMs?: number): void;
}

type PressInfo = { nativeEvent: { coordinate: { latitude: number; longitude: number } } };
type MapProps = {
  style?: unknown;
  initialRegion?: Region;
  region?: Region;
  userInterfaceStyle?: 'light' | 'dark';
  showsUserLocation?: boolean;
  onPress?: (e: PressInfo) => void;
  onRegionChangeComplete?: (region: Region) => void;
  children?: React.ReactNode;
  /** Gestures: off for the read-only tracking maps. */
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  /** react-native-maps props the screens still pass: accepted and ignored (MapLibre has no such thing, or the adapter draws it itself). */
  provider?: string;
  showsCompass?: boolean;
  showsMyLocationButton?: boolean;
  moveOnMarkerPress?: boolean;
};

const viewWidth = () => Dimensions.get('window').width;
const centreOf = (r: Region): [number, number] => [r.longitude, r.latitude];

type MapView = MapViewHandle;
const MapView = forwardRef<MapViewHandle, MapProps>(function MapView({ style, initialRegion, region, userInterfaceStyle, showsUserLocation, scrollEnabled = true, zoomEnabled = true, onPress, onRegionChangeComplete, children }, ref) {
  const camera = useRef<CameraRef>(null);
  const { c } = useScreenUi();
  const first = region ?? initialRegion;

  useImperativeHandle(ref, () => ({
    animateToRegion: (r, durationMs = 500) => camera.current?.easeTo({ center: centreOf(r), zoom: zoomForRegion(r, viewWidth()), duration: durationMs }),
  }), []);

  // a controlled `region` (the tracking screens) moves the camera when it changes
  const last = useRef(region);
  useEffect(() => {
    if (!region || (last.current && last.current.latitude === region.latitude && last.current.longitude === region.longitude && last.current.longitudeDelta === region.longitudeDelta)) return;
    last.current = region;
    camera.current?.easeTo({ center: centreOf(region), zoom: zoomForRegion(region, viewWidth()), duration: 500 });
  }, [region]);

  return (
    <View style={[styles.fill, style as never]} testID="map-view">
      <MLMap
        style={styles.fill}
        mapStyle={mapStyleFor(userInterfaceStyle)}
        attribution={false}
        logo={false}
        compass={false}
        dragPan={scrollEnabled}
        touchZoom={zoomEnabled}
        doubleTapZoom={zoomEnabled}
        onPress={onPress ? (e) => { const { lngLat } = e.nativeEvent; onPress({ nativeEvent: { coordinate: { latitude: lngLat[1], longitude: lngLat[0] } } }); } : undefined}
        onRegionDidChange={onRegionChangeComplete ? (e) => { const v = e.nativeEvent; onRegionChangeComplete(regionFromView(v.center, v.bounds)); } : undefined}
      >
        <Camera ref={camera} initialViewState={first ? { center: centreOf(first), zoom: zoomForRegion(first, viewWidth()) } : undefined} />
        {showsUserLocation ? <UserLocation /> : null}
        {children}
      </MLMap>
      <View pointerEvents="none" style={[styles.attribution, { backgroundColor: c.bg.surface }]}>
        <Text style={[styles.attributionText, { color: c.text.secondary }]} testID="map-attribution">{MAP_ATTRIBUTION}</Text>
      </View>
    </View>
  );
});
export default MapView;

type MarkerProps = {
  coordinate: { latitude: number; longitude: number };
  /** react-native-maps' marker colour; a token colour from the screen. */
  pinColor?: string;
  onPress?: (e: { stopPropagation?: () => void }) => void;
  children?: React.ReactElement;
  /** react-native-maps props accepted and ignored: no callout, no per-frame view tracking. */
  title?: string;
  tracksViewChanges?: boolean;
};

function DefaultPin({ color }: { color?: string }) {
  const { c } = useScreenUi();
  return <View style={[styles.pin, { backgroundColor: color ?? c.action.primary.bg, borderColor: c.bg.surface }]} />;
}

export function Marker({ coordinate, pinColor, onPress, children }: MarkerProps) {
  return (
    <MLMarker lngLat={[coordinate.longitude, coordinate.latitude]} anchor={children ? 'center' : 'bottom'} onPress={onPress ? () => onPress({}) : undefined}>
      {children ?? <DefaultPin color={pinColor} />}
    </MLMarker>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pin: { width: 20, height: 20, borderRadius: 10, borderWidth: 3 },
  attribution: { position: 'absolute', bottom: 4, start: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, opacity: 0.9 },
  attributionText: { fontSize: 10 },
});
