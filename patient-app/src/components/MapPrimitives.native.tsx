import React, { forwardRef, useEffect, useMemo, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Camera, GeoJSONSource, Images, Layer, Map as MLMap, Marker as MLMarker, UserLocation, type CameraRef } from '@maplibre/maplibre-react-native';
import { MAP_ATTRIBUTION, mapStyleFor, regionFromView, zoomForRegion, type Region } from './map-geometry';
import { useScreenUi, tint } from './screen/ScreenKit';
import { holoPinUri } from './map-hologram-image';
import { CLUSTER, HOLO_KINDS, HOLO_LOOK, matchByKind, type HoloFeatureCollection, type HoloKind } from './map-hologram';

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

const centreOf = (r: Region): [number, number] => [r.longitude, r.latitude];

type MapView = MapViewHandle;
const MapView = forwardRef<MapViewHandle, MapProps>(function MapView({ style, initialRegion, region, userInterfaceStyle, showsUserLocation, scrollEnabled = true, zoomEnabled = true, onPress, onRegionChangeComplete, children }, ref) {
  const camera = useRef<CameraRef>(null);
  const { c } = useScreenUi();
  // the width follows rotation and split screen; a ref so the imperative handle and the effect read the current one
  const { width } = useWindowDimensions();
  const widthRef = useRef(width);
  widthRef.current = width;
  const first = region ?? initialRegion;

  useImperativeHandle(ref, () => ({
    animateToRegion: (r, durationMs = 500) => camera.current?.easeTo({ center: centreOf(r), zoom: zoomForRegion(r, widthRef.current), duration: durationMs }),
  }), []);

  // a controlled `region` (the tracking screens) moves the camera when it changes
  const last = useRef(region);
  useEffect(() => {
    if (!region || (last.current && last.current.latitude === region.latitude && last.current.longitude === region.longitude && last.current.longitudeDelta === region.longitudeDelta)) return;
    last.current = region;
    camera.current?.easeTo({ center: centreOf(region), zoom: zoomForRegion(region, widthRef.current), duration: 500 });
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
        <Camera ref={camera} initialViewState={first ? { center: centreOf(first), zoom: zoomForRegion(first, widthRef.current) } : undefined} />
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

type HoloPressEvent = { nativeEvent: { features?: { id?: string | number; properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }[] } };

/**
 * The hologram pins of every provider, drawn by the map's native layers from one clustered GeoJSON source (no React view per pin):
 * a flattened (map-aligned) translucent base in the kind's service tone, a soft halo, and a core lifted above the base. The selected
 * provider is left out here; the screen draws it as a React marker. Colours are the tokens' service tones, light or dark.
 */
export function HologramLayer({ data, selectedId, onSelect, onCluster }: { data: HoloFeatureCollection; selectedId: string | null; onSelect: (id: string) => void; onCluster: (lngLat: [number, number]) => void }) {
  const { c } = useScreenUi();
  const by = (pick: (kind: HoloKind) => string) => matchByKind(Object.fromEntries(HOLO_KINDS.map((kind) => [kind, pick(kind)])) as Record<HoloKind, string>, c.service.map.glyph);
  // one pin image per kind, drawn from this theme's service tones (re-made when the theme changes)
  const images = useMemo(() => Object.fromEntries(HOLO_KINDS.map((kind) => [`holo-${kind}`, { uri: holoPinUri(kind, c.service[HOLO_LOOK[kind].tone].fg, c.service[HOLO_LOOK[kind].tone].bg) }])), [c]);
  const glow = by((kind) => tint(c.service[HOLO_LOOK[kind].tone].fg, 0.22));
  const single = ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'id'], selectedId ?? '']];
  return (
    <>
    <Images images={images as never} />
    <GeoJSONSource
      id="providers"
      data={data as never}
      cluster
      clusterRadius={CLUSTER.radius}
      clusterMaxZoom={CLUSTER.maxZoom}
      onPress={((e: HoloPressEvent) => {
        const f = e.nativeEvent.features?.[0];
        if (!f) return;
        if (f.properties?.point_count !== undefined) {
          const at = f.geometry?.coordinates;
          if (at && at.length >= 2) onCluster([at[0], at[1]]);
        } else if (typeof f.properties?.id === 'string') onSelect(f.properties.id);
      }) as never}
    >
      <Layer id="holo-cluster-halo" type="circle" filter={['has', 'point_count']} style={{ circleRadius: 26, circleColor: tint(c.service.map.glyph, 0.2), circlePitchAlignment: 'map', circleBlur: 0.6 }} />
      <Layer id="holo-cluster" type="circle" filter={['has', 'point_count']} style={{ circleRadius: 17, circleColor: c.service.map.bg, circleStrokeColor: c.service.map.glyph, circleStrokeWidth: 2 }} />
      <Layer id="holo-cluster-count" type="symbol" filter={['has', 'point_count']} style={{ textField: ['get', 'point_count_abbreviated'], textSize: 13, textColor: c.service.map.glyph, textAllowOverlap: true }} />
      <Layer id="holo-halo" type="circle" filter={single as never} style={{ circleRadius: 24, circleTranslate: [0, -6], circleColor: glow as never, circleBlur: 0.8, circlePitchAlignment: 'map' }} />
      <Layer id="holo-pin" type="symbol" filter={single as never} style={{ iconImage: ['concat', 'holo-', ['get', 'kind']], iconAnchor: 'bottom', iconSize: 1, iconAllowOverlap: true, iconPitchAlignment: 'viewport' }} />
    </GeoJSONSource>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pin: { width: 20, height: 20, borderRadius: 10, borderWidth: 3 },
  attribution: { position: 'absolute', bottom: 4, start: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, opacity: 0.9 },
  attributionText: { fontSize: 10 },
});
