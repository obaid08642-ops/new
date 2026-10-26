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

  it('is offered on Home only', () => {
    expect(read('src/components/home/HomeTopRow.tsx')).toContain('<MapEntryButton');
    // owner layout decisions 4, 10 and 12: the map lives on Home only, not under the pharmacy, labs or consultations headers
    expect(read('app/(tabs)/pharmacy.tsx')).not.toContain('<MapEntryButton');
    expect(read('app/(tabs)/diagnostics.tsx')).not.toContain('<MapEntryButton');
    expect(read('app/(tabs)/consultations/index.tsx')).not.toContain('mapHref');
  });

  it('the map screen reads the type param to filter', () => {
    const view = read('src/components/account/ProvidersMapView.tsx');
    expect(view).toContain('useLocalSearchParams');
    expect(view).toContain('parseMapKind(params.type)');
  });
});
