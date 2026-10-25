/**
 * Map maths shared by the MapLibre adapter (MapPrimitives.native.tsx) and its tests. The screens speak "regions" (centre + degree
 * spans, as react-native-maps did); MapLibre speaks centre + zoom, so the two are converted here.
 * MapLibre Native zoom 0 shows the whole world across 512 dp, so a viewport `width` dp wide at zoom z spans 360 * width / (512 * 2^z) degrees.
 */
export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 19;

export function zoomForRegion(region: Pick<Region, 'longitudeDelta'>, widthDp: number): number {
  const delta = Math.max(region.longitudeDelta, 1e-6);
  const zoom = Math.log2((360 * Math.max(widthDp, 1)) / (512 * delta));
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** The region a camera shows, from MapLibre's bounds ([west, south, east, north]) and centre. */
export function regionFromView(center: [number, number], bounds: [number, number, number, number]): Region {
  const [west, south, east, north] = bounds;
  return { latitude: center[1], longitude: center[0], latitudeDelta: Math.abs(north - south), longitudeDelta: Math.abs(east - west) };
}

/** Open vector styles by OpenFreeMap (keyless, built on OpenStreetMap data). tile.openstreetmap.org is NOT used: its policy forbids app traffic. */
export const MAP_STYLE = { light: 'https://tiles.openfreemap.org/styles/liberty', dark: 'https://tiles.openfreemap.org/styles/dark' } as const;
export const mapStyleFor = (scheme: string | undefined): string => (scheme === 'dark' ? MAP_STYLE.dark : MAP_STYLE.light);

/** Shown on every map: the data licence (ODbL) asks for it to be visible, not behind an info button. */
export const MAP_ATTRIBUTION = '© OpenStreetMap contributors · OpenFreeMap';
