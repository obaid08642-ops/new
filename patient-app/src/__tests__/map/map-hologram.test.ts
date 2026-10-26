import { HOLO_KINDS, HOLO_LOOK, holoMotion, isHoloKind, matchByKind, toFeatureCollection } from '../../components/map-hologram';

describe('hologram pin helpers', () => {
  it('gives every kind a tone and a shape, radiology included', () => {
    for (const kind of HOLO_KINDS) expect(HOLO_LOOK[kind].tone).toBeTruthy();
    expect(HOLO_LOOK.radiology.tone).toBe('violet');
    expect(isHoloKind('radiology')).toBe(true);
    expect(isHoloKind('spa')).toBe(false);
  });
  it('draws only the providers the server gave a position', () => {
    const fc = toFeatureCollection([{ id: 'a', kind: 'lab', lat: 24.7, lng: 46.6 }, { id: 'b', kind: 'doctor', lat: null, lng: 46.6 }]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.coordinates).toEqual([46.6, 24.7]);
  });
  it('builds a match expression with every kind and a fallback', () => {
    const values = Object.fromEntries(HOLO_KINDS.map((k) => [k, k])) as Record<(typeof HOLO_KINDS)[number], string>;
    const expr = matchByKind(values, 'x');
    expect(expr.length).toBe(2 + HOLO_KINDS.length * 2 + 1);
    expect(expr[expr.length - 1]).toBe('x');
  });
  it('turns pulse and lift off under reduced motion', () => {
    expect(holoMotion(true)).toEqual({ pulse: false, lift: false });
    expect(holoMotion(false)).toEqual({ pulse: true, lift: true });
  });
});
