import { readFileSync } from 'fs';
import { join } from 'path';

import { mapHref, parseMapKind } from './mapEntry';

const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('providers map entry', () => {
  it('builds the route with the type param', () => {
    expect(mapHref()).toBe('/map');
    expect(mapHref('pharmacy')).toBe('/map?type=pharmacy');
    expect(mapHref('lab')).toBe('/map?type=lab');
  });

  it('reads only a known kind from the param', () => {
    expect(parseMapKind('doctor')).toBe('doctor');
    expect(parseMapKind(['nursing', 'lab'])).toBe('nursing');
    expect(parseMapKind('radiology')).toBeNull();
    expect(parseMapKind(undefined)).toBeNull();
  });

  it('is offered as a Home quick tile (not in the top bar, owner 2026-10-26) and on consultations with the right type; not on the pharmacy or labs hubs', () => {
    expect(read('src/components/home/HomeTopRow.tsx')).not.toContain('MapEntryButton');
    expect(read('src/components/home/HomeQuick.tsx')).toContain("route: '/map'");
    // owner layout decision 4: the map lives on Home, not under the pharmacy header
    expect(read('app/(tabs)/pharmacy.tsx')).not.toContain('<MapEntryButton');
    // owner layout decision 10: nor under the labs and radiology header
    expect(read('app/(tabs)/diagnostics.tsx')).not.toContain('<MapEntryButton');
    expect(read('app/(tabs)/consultations/index.tsx')).toContain("mapHref('doctor')");
  });

  it('the map screen reads the type param to filter', () => {
    const view = read('src/components/account/ProvidersMapView.tsx');
    expect(view).toContain('useLocalSearchParams');
    expect(view).toContain('parseMapKind(params.type)');
  });
});
