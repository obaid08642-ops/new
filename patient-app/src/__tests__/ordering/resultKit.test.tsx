jest.mock('../../components/screen/ScreenKit', () => ({ useScreenUi: () => ({ c: {}, dir: 'ltr' }), step: () => ({}) }));
import { rangeLayout } from '../../components/ordering/ResultKit';

describe('rangeLayout (Ord11 range bar)', () => {
  it('puts a value inside the band between its edges', () => {
    const r = rangeLayout(14, 12, 16);
    expect(r).not.toBeNull();
    expect(r!.dot).toBeGreaterThan(r!.band[0]);
    expect(r!.dot).toBeLessThan(r!.band[1]);
  });
  it('puts a high value after the band and a low value before it', () => {
    const high = rangeLayout(7.1, 3.9, 5.6)!;
    expect(high.dot).toBeGreaterThan(high.band[1]);
    const low = rangeLayout(18, 30, 100)!;
    expect(low.dot).toBeLessThan(low.band[0]);
  });
  it('keeps everything inside 0..1', () => {
    const r = rangeLayout(1000, 3, 5)!;
    expect(r.dot).toBeLessThanOrEqual(1);
    expect(r.band[0]).toBeGreaterThanOrEqual(0);
    expect(r.band[1]).toBeLessThanOrEqual(1);
  });
  it('draws nothing for a missing or inverted range', () => {
    expect(rangeLayout(5, 10, 10)).toBeNull();
    expect(rangeLayout(5, 10, 2)).toBeNull();
    expect(rangeLayout(NaN, 1, 2)).toBeNull();
  });
});
