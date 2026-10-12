import { nearestFirst } from './nearest-first';

// #623: tests sorted by the closest lab that runs them; unreachable ones last; bad input never NaN.
describe('nearestFirst', () => {
  const here = { lat: 24.7136, lng: 46.6753 }; // Riyadh
  const near = { geo: { lat: 24.72, lng: 46.68 }, runs: ['cbc'] };
  const far = { geo: { lat: 21.4858, lng: 39.1925 }, runs: ['cbc', 'tsh'] }; // Jeddah
  const nowhere = { runs: ['vitd'] };
  const items = [{ id: 'vitd' }, { id: 'tsh' }, { id: 'cbc' }];
  const out = nearestFirst(items, [near, far, nowhere] as any[], here, (i: any, p: any) => p.runs.includes(i.id));

  it('orders by the closest provider that serves the item', () => {
    expect(out.map((o) => o.id)).toEqual(['cbc', 'tsh', 'vitd']);
    expect(out[0].nearest_provider_km).toBeLessThan(2);
    expect(out[1].nearest_provider_km).toBeGreaterThan(800);
  });

  it('gives null, never NaN or Infinity, when no located provider serves the item', () => {
    expect(out[2].nearest_provider_km).toBeNull();
  });
});
