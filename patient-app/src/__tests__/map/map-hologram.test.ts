import { tokens } from '../../../../packages/design-tokens/dist/ts/tokens';
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

const mint = tokens('light').color.service.mint;
const FG = mint.fg;
const BG = mint.bg;

describe('hologram pin image', () => {
  it('parses a token colour to four channels', () => {
    const [r, g, b, a] = parseColor(FG);
    expect([r, g, b].every((v) => v >= 0 && v <= 255)).toBe(true);
    expect(a).toBeGreaterThan(0);
  });
  it('draws a different, non-empty pin per kind in the given colours and encodes a valid PNG', () => {
    const a = renderHoloPixels('lab', FG, BG);
    const b = renderHoloPixels('hospital', FG, BG);
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
