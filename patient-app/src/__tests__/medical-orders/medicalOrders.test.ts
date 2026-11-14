import { groupFlow, parseOrder, parseOrders } from '../../utils/medicalOrders';

const order = {
  id: 'o1', valid_until: '2026-11-30T00:00:00.000Z', expired: false, expires_soon: true, notes: ' fast 8h ', prescription_id: 'rx1',
  items: [{ id: 'i1', group: 'labs', catalog_id: 'c1', status: 'open' }, { id: 'bad', group: 'pharmacy', catalog_id: 'c', status: 'open' }],
  groups: { labs: { items: [{ id: 'i1', group: 'labs', catalog_id: 'c1', status: 'open' }] }, prescription: { prescription_id: 'rx1' } },
};

describe('M6 medical orders (app)', () => {
  it('keeps valid items and the flags, trims the note', () => {
    const o = parseOrder(order);
    expect(o?.items.map((i) => i.id)).toEqual(['i1']);
    expect(o?.expires_soon).toBe(true);
    expect(o?.notes).toBe('fast 8h');
    expect(o?.groups.labs?.items).toHaveLength(1);
  });

  it('reads a bare array or { data }, and drops a row with no id', () => {
    expect(parseOrders([order, { id: 'x' }])).toHaveLength(1);
    expect(parseOrders({ data: [order] })).toHaveLength(1);
    expect(parseOrders(null)).toEqual([]);
  });

  it('sends each group to the flow that exists for it', () => {
    const o = parseOrder(order)!;
    expect(groupFlow('labs', o)).toEqual({ pathname: '/diagnostics/search' });
    expect(groupFlow('nursing', o)).toEqual({ pathname: '/nursing' });
    expect(groupFlow('prescription', o)).toEqual({ pathname: '/pharmacy/rx-order', params: { prescriptionId: 'rx1' } });
  });
});
