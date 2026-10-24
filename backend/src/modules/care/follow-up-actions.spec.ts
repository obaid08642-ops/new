import { buildFollowUpActions } from './follow-up-actions';

const NOW = new Date('2026-10-24T10:00:00Z');
const order = (over: Record<string, unknown> = {}) => ({
  id: 'mo1',
  prescription_id: null,
  valid_until: '2026-12-01T00:00:00Z',
  items: [
    { id: 'i1', group: 'labs', catalog_id: 'c1', status: 'open' },
    { id: 'i2', group: 'labs', catalog_id: 'c2', status: 'ordered' },
    { id: 'i3', group: 'labs', catalog_id: 'c3', status: 'open' },
    { id: 'i4', group: 'radiology', catalog_id: 'c4', status: 'open' },
    { id: 'i5', group: 'nursing', catalog_id: 'c5', status: 'open' },
  ],
  ...over,
});

describe('buildFollowUpActions', () => {
  it('returns nothing without prescriptions or an order', () => {
    expect(buildFollowUpActions(undefined, null, NOW)).toEqual([]);
  });

  it('adds a pharmacy action per prescription, deduped with the order prescription', () => {
    const out = buildFollowUpActions(['rx1', 'rx2'], order({ prescription_id: 'rx1' }) as never, NOW);
    expect(out.filter((a) => a.kind === 'pharmacy_order').map((a) => (a as { prescription_id: string }).prescription_id)).toEqual(['rx1', 'rx2']);
  });

  it('builds lab and radiology actions from open items only', () => {
    const out = buildFollowUpActions([], order() as never, NOW);
    expect(out).toEqual([
      { kind: 'lab_booking', medical_order_id: 'mo1', first_item_id: 'i1', item_ids: ['i1', 'i3'], catalog_ids: ['c1', 'c3'], valid_until: '2026-12-01T00:00:00.000Z' },
      { kind: 'radiology_booking', medical_order_id: 'mo1', first_item_id: 'i4', item_ids: ['i4'], catalog_ids: ['c4'], valid_until: '2026-12-01T00:00:00.000Z' },
    ]);
  });

  it('drops lab and radiology actions when the order has expired', () => {
    expect(buildFollowUpActions([], order({ valid_until: '2026-10-01T00:00:00Z' }) as never, NOW)).toEqual([]);
  });
});
