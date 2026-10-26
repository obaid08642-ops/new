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

import { HOLO_H, HOLO_W, base64, encodePng, parseColor, renderHoloPixels } from '../../components/map-hologram-image';
import { inflateSync } from 'zlib';

describe('hologram pin image', () => {
  it('parses hex and rgba colours', () => {
    expect(parseColor('#FF0000')).toEqual([255, 0, 0, 1]);
    expect(parseColor('rgba(10,20,30,0.5)')).toEqual([10, 20, 30, 0.5]);
  });
  it('draws a different, non-empty pin per kind in the given colours and encodes a valid PNG', () => {
    const a = renderHoloPixels('lab', '#0E7C5E', '#E6F7F1');
    const b = renderHoloPixels('hospital', '#0E7C5E', '#E6F7F1');
    expect(a.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
    const png = encodePng(a, HOLO_W, HOLO_H);
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const idat = Buffer.from(png).indexOf('IDAT');
    const len = Buffer.from(png).readUInt32BE(idat - 4);
    const raw = inflateSync(Buffer.from(png.slice(idat + 4, idat + 4 + len)));
    expect(raw.length).toBe((HOLO_W * 4 + 1) * HOLO_H);
    expect(base64(Uint8Array.from([77, 97, 110]))).toBe('TWFu');
  });
});
