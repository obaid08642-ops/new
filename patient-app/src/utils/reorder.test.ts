import { buildPatientPharmacyDraft } from './pharmacy-draft';
import { readReorderLines, readReorderMeta, reorderBody } from './reorder';

const address = { label: 'Test home', street: 'Test street', city: 'Test city', lat: 24.7, lng: 46.6 };

describe('readReorderLines', () => {
  it('offers only the lines the server returned, with the stored quantity, and drops a nameless one', () => {
    const lines = readReorderLines({
      id: 'o',
      items: [
        { id: 'i1', raw_name: 'Panadol 500', qty: 2, matched_sku: 'SKU-1' },
        { id: 'i2', name_en: 'Vitamin C', qty: 0 },
        { id: 'i3', raw_name: '  ' },
        null,
      ],
    });
    expect(lines).toEqual([
      { key: 'i1', sku: 'SKU-1', name: 'Panadol 500', qty: 2, selected: true },
      { key: 'i2', sku: null, name: 'Vitamin C', qty: 1, selected: true },
    ]);
  });

  it('reads an answer wrapped in { data } and an order without items', () => {
    expect(readReorderLines({ data: { items: [{ id: 'i1', raw_name: 'A', qty: 3 }] } })).toHaveLength(1);
    expect(readReorderLines({ id: 'o' })).toEqual([]);
    expect(readReorderLines(null)).toEqual([]);
  });
});

describe('reorderBody', () => {
  it('sends a sku only for a line the earlier order had matched, never the order item id', () => {
    const lines = readReorderLines({ items: [{ id: 'item-uuid-1', raw_name: 'Panadol', qty: 2, matched_sku: 'SKU-1' }, { id: 'item-uuid-2', raw_name: 'Vitamin C', qty: 1 }] });
    const body = reorderBody(lines, address, buildPatientPharmacyDraft);
    expect(body.items.map((i) => [i.raw_name, i.qty, i.sku])).toEqual([['Panadol', 2, 'SKU-1'], ['Vitamin C', 1, undefined]]);
    expect(JSON.stringify(body)).not.toContain('item-uuid');
    expect(body.delivery_address).toMatchObject({ lat: 24.7, lng: 46.6 });
    expect(body.payment_mode).toBe('cash');
    expect(body.fulfillment).toBe('delivery');
  });

  it('sends only the lines that were kept', () => {
    const lines = readReorderLines({ items: [{ id: 'a', raw_name: 'One' }, { id: 'b', raw_name: 'Two' }] });
    const kept = lines.filter((l) => l.key === 'b');
    expect(reorderBody(kept, address, buildPatientPharmacyDraft).items.map((i) => i.raw_name)).toEqual(['Two']);
  });
});

describe('reorder meta (372)', () => {
  it("reads the earlier order's prescription and receiving method, and nothing else", () => {
    expect(readReorderMeta({ data: { prescription_id: 'rx-1', fulfillment: 'pickup' } })).toEqual({ prescriptionId: 'rx-1', fulfillment: 'pickup' });
    expect(readReorderMeta({ fulfillment: 'courier' })).toEqual({ prescriptionId: null, fulfillment: null });
    expect(readReorderMeta(null)).toEqual({ prescriptionId: null, fulfillment: null });
  });

  it('sends them with the new request', () => {
    const lines = readReorderLines({ items: [{ id: 'i1', raw_name: 'Panadol', qty: 1 }] });
    const body = reorderBody(lines, address, buildPatientPharmacyDraft, { prescriptionId: 'rx-1', fulfillment: 'pickup' });
    expect(body).toMatchObject({ prescription_id: 'rx-1', fulfillment: 'pickup' });
    const plain = reorderBody(lines, address, buildPatientPharmacyDraft);
    expect(plain).toMatchObject({ fulfillment: 'delivery' });
    expect(plain).not.toHaveProperty('prescription_id');
  });
});
