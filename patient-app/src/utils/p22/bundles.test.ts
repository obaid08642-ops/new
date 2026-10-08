import {
  fetchAlternatives,
  fetchFrequentlyBoughtTogether,
  stripRxCrossSell,
  warningsFor,
} from './bundles';

describe('P22.3 bundles (pharmacist-safe rules)', () => {
  it('never cross-sells Rx items: they land in excludedRx, not suggestions', () => {
    const { safe, excludedRx } = stripRxCrossSell([
      { medicine_id: 'otc-1' },
      { medicine_id: 'rx-1', requires_prescription: true },
    ]);
    expect(safe.map((i) => i.medicine_id)).toEqual(['otc-1']);
    expect(excludedRx).toEqual(['rx-1']);
  });

  it('merges backend excluded_rx_ids with client-side stripping', async () => {
    const fetch = jest.fn().mockResolvedValue({
      items: [{ medicine_id: 'rx-9', requires_prescription: true }],
      excluded_rx_ids: ['rx-1'],
      interaction_warnings: [],
    });
    const res = await fetchFrequentlyBoughtTogether(fetch, 'm');
    expect(res.items).toEqual([]);
    expect(res.excluded_rx_ids.sort()).toEqual(['rx-1', 'rx-9']);
    expect(fetch).toHaveBeenCalledWith('/pharmacy/bundles/frequently-bought-together?medicine_id=m');
  });

  it('fetches same-ingredient alternatives through the catalog path', async () => {
    const fetch = jest.fn().mockResolvedValue({ items: [], interaction_warnings: [] });
    await fetchAlternatives(fetch, 'med-1');
    expect(fetch).toHaveBeenCalledWith('/pharmacy/medicines/med-1/alternatives');
  });

  it('keeps interaction warnings attached to their suggestion', () => {
    const warnings = [
      { suggested_id: 'a', interacts_with: 'warfarin', detail: 'bleeding risk' },
      { suggested_id: 'b', interacts_with: 'x', detail: 'y' },
    ];
    expect(warningsFor(warnings, 'a')).toEqual([warnings[0]]);
    expect(warningsFor(warnings, 'zzz')).toEqual([]);
    expect(warningsFor(undefined, 'a')).toEqual([]);
  });
});
