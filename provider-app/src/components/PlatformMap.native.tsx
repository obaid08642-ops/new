import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map as MLMap, Marker as MLMarker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useTheme } from '../context';
import { MAP_ATTRIBUTION, circlePolygon, mapStyleFor, regionFromView, zoomForRegion, type Region } from '../utils/map-geometry';

/**
 * The provider app's map on MapLibre Native with OpenFreeMap's keyless OpenStreetMap vector tiles (owner decision 2026-10-25: no
 * Google Maps key; react-native-maps on Android crashes without one). Same shape as patient-app's MapPrimitives: `<MapView ref initialRegion
 * onPress>`, `<Marker coordinate>`, `<Circle center radius>` and `ref.animateToRegion(region, ms)`.
 */
export type { Region };

export interface MapViewHandle { animateToRegion(region: Region, durationMs?: number): void }

type PressInfo = { nativeEvent: { coordinate: { latitude: number; longitude: number } } };
type MapProps = {
  style?: unknown;
  initialRegion?: Region;
  userInterfaceStyle?: 'light' | 'dark';
  onPress?: (e: PressInfo) => void;
  onRegionChangeComplete?: (region: Region) => void;
  children?: React.ReactNode;
};

const centreOf = (r: Region): [number, number] => [r.longitude, r.latitude];

type MapView = MapViewHandle;
const MapView = forwardRef<MapViewHandle, MapProps>(function MapView({ style, initialRegion, userInterfaceStyle, onPress, onRegionChangeComplete, children }, ref) {
  const camera = useRef<CameraRef>(null);
  const { theme } = useTheme();
  useImperativeHandle(ref, () => ({
    animateToRegion: (r, durationMs = 500) => camera.current?.easeTo({ center: centreOf(r), zoom: zoomForRegion(r, Dimensions.get('window').width), duration: durationMs }),
  }), []);
  return (
    <View style={[styles.fill, style as never]}>
      <MLMap
        style={styles.fill}
        mapStyle={mapStyleFor(userInterfaceStyle)}
        attribution={false}
        logo={false}
        compass={false}
        onPress={onPress ? (e) => { const { lngLat } = e.nativeEvent; onPress({ nativeEvent: { coordinate: { latitude: lngLat[1], longitude: lngLat[0] } } }); } : undefined}
        onRegionDidChange={onRegionChangeComplete ? (e) => { const v = e.nativeEvent; onRegionChangeComplete(regionFromView(v.center, v.bounds)); } : undefined}
      >
        <Camera ref={camera} initialViewState={initialRegion ? { center: centreOf(initialRegion), zoom: zoomForRegion(initialRegion, Dimensions.get('window').width) } : undefined} />
        {children}
      </MLMap>
      <View pointerEvents="none" style={[styles.attribution, { backgroundColor: theme.card }]}>
        <Text style={[styles.attributionText, { color: theme.textSub }]}>{MAP_ATTRIBUTION}</Text>
      </View>
    </View>
  );
});
export default MapView;

export function Marker({ coordinate, children }: { coordinate: { latitude: number; longitude: number }; children?: React.ReactElement }) {
  const { theme } = useTheme();
  return (
    <MLMarker lngLat={[coordinate.longitude, coordinate.latitude]} anchor={children ? 'center' : 'bottom'}>
      {children ?? <View style={[styles.pin, { backgroundColor: theme.primary, borderColor: theme.card }]} />}
    </MLMarker>
  );
}

let circleSeq = 0;
/** A translucent disc of `radius` metres (the delivery / coverage radius). */
export function Circle({ center, radius, strokeColor, fillColor }: { center: { latitude: number; longitude: number }; radius: number; strokeColor?: string; fillColor?: string }) {
  const id = useRef(`circle-${(circleSeq += 1)}`).current;
  const data = React.useMemo(() => circlePolygon(center, radius), [center.latitude, center.longitude, radius]);
  return (
    <GeoJSONSource id={id} data={data}>
      <Layer id={`${id}-fill`} type="fill" source={id} paint={{ 'fill-color': fillColor ?? 'rgba(0,0,0,0.15)' }} />
      <Layer id={`${id}-line`} type="line" source={id} paint={{ 'line-color': strokeColor ?? '#000000', 'line-width': 2 }} />
    </GeoJSONSource>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pin: { width: 20, height: 20, borderRadius: 10, borderWidth: 3 },
  attribution: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, opacity: 0.9 },
  attributionText: { fontSize: 10 },
});
