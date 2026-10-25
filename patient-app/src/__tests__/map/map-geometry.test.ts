import { MAP_ATTRIBUTION, MAP_STYLE, mapStyleFor, regionFromView, zoomForRegion } from '../../components/map-geometry';

describe('map geometry (MapLibre adapter)', () => {
  it('a 512 dp wide viewport spans 360 degrees at zoom 0, and each zoom halves it', () => {
    expect(zoomForRegion({ longitudeDelta: 360 }, 512)).toBe(1); // log2(1) = 0, clamped to the minimum zoom
    expect(zoomForRegion({ longitudeDelta: 0.02 }, 390)).toBeGreaterThan(zoomForRegion({ longitudeDelta: 0.05 }, 390));
    const z = zoomForRegion({ longitudeDelta: 0.02 }, 390);
    expect(zoomForRegion({ longitudeDelta: 0.01 }, 390)).toBeCloseTo(z + 1, 5);
  });
  it('clamps to the zoom range and never divides by zero', () => {
    expect(zoomForRegion({ longitudeDelta: 0 }, 390)).toBe(19);
    expect(zoomForRegion({ longitudeDelta: 1e9 }, 390)).toBe(1);
  });
  it('turns MapLibre bounds + centre into a region', () => {
    expect(regionFromView([46.7, 24.7], [46.6, 24.6, 46.8, 24.9])).toEqual({ latitude: 24.7, longitude: 46.7, latitudeDelta: expect.closeTo(0.3, 6), longitudeDelta: expect.closeTo(0.2, 6) });
  });
  it('uses the keyless OpenFreeMap styles, light and dark, never tile.openstreetmap.org', () => {
    expect(mapStyleFor('light')).toBe(MAP_STYLE.light);
    expect(mapStyleFor('dark')).toBe(MAP_STYLE.dark);
    expect(mapStyleFor(undefined)).toBe(MAP_STYLE.light);
    expect(JSON.stringify(MAP_STYLE)).not.toMatch(/tile\.openstreetmap\.org/);
    expect(MAP_STYLE.light).toMatch(/^https:\/\/tiles\.openfreemap\.org\/styles\//);
  });
  it('the attribution names OpenStreetMap', () => {
    expect(MAP_ATTRIBUTION).toMatch(/OpenStreetMap/);
  });
});
