import { PharmacyOfferService } from './pharmacy-offer.service';
import { catalogueFilter, cataloguePrice, catalogueSearchRow, catalogueSku } from './catalogue-lines';

// provider-journeys 1: a pharmacy with no inventory row for a line prices it from the national catalogue.
describe('catalogue lines', () => {
  const medicine = { id: 'med-1', sku: 4011, name_ar: 'بنادول 500', name_en: 'Panadol 500', generic_name: 'Paracetamol', form: 'tablet', strength: '500mg', sfda_price: 12.5, price: 14 };

  it('searches the catalogue by name, ingredient, sku or barcode', () => {
    expect(catalogueFilter('p')).toBeNull();
    expect(JSON.stringify(catalogueFilter('بنا'))).toContain('generic_name');
    expect(JSON.stringify(catalogueFilter('4011'))).toContain('"sku":4011');
    expect(catalogueFilter(undefined, '628100')).toEqual({ is_deleted: { $ne: true }, barcode: '628100' });
  });

  it('gives a catalogue row the composer can pick, priced at the SFDA reference', () => {
    expect(catalogueSku(medicine)).toBe('med-1');
    expect(cataloguePrice(medicine)).toBe(12.5);
    expect(cataloguePrice({ price: 0 })).toBeNull();
    expect(catalogueSearchRow(medicine)).toMatchObject({ id: null, source: 'catalogue', medicine_id: 'med-1', sku: 'med-1', price: 12.5, stock: null });
  });

  function service(existing: any) {
    const created: any[] = [];
    const updates: any[] = [];
    const inventory: any = {
      findOne: () => ({ lean: async () => existing }),
      updateOne: async (filter: any, update: any) => { updates.push({ filter, update }); },
      create: async (row: any) => { created.push(row); return row; },
    };
    const connection: any = { collection: () => ({ findOne: async (q: any) => (JSON.stringify(q).includes('med-1') || JSON.stringify(q).includes('4011') ? medicine : null) }) };
    const svc = new PharmacyOfferService(connection, {} as any, {} as any, {} as any, {} as any, inventory, {} as any, {} as any);
    return { svc: svc as any, created, updates };
  }

  it('adds the picked catalogue item to the pharmacy inventory with the offered quantity', async () => {
    const { svc, created } = service(null);
    const id = await svc.adoptCatalogueItem('ph-1', { id: 'oi-1', qty: 2 }, { order_item_id: 'oi-1', availability: 'available', medicine_id: 'med-1', qty_offered: 2 });
    expect(id).toBe(created[0].id);
    expect(created[0]).toMatchObject({ provider_account_id: 'ph-1', sku: 'med-1', medicine_id: 'med-1', price: 12.5, stock: 2, available: true, generic_name: 'Paracetamol' });
  });

  it('uses the catalogue item the line already names when "available" is chosen without a pick', async () => {
    const { svc, created } = service(null);
    await svc.adoptCatalogueItem('ph-1', { id: 'oi-1', qty: 3, matched_sku: 'med-1' }, { order_item_id: 'oi-1', availability: 'available' });
    expect(created[0]).toMatchObject({ sku: 'med-1', stock: 3 });
  });

  it('makes an existing row available with at least the offered stock and keeps its own price', async () => {
    const { svc, created, updates } = service({ id: 'inv-9', sku: 'med-1', price: 11, stock: 0, available: false });
    const id = await svc.adoptCatalogueItem('ph-1', { id: 'oi-1', qty: 2 }, { order_item_id: 'oi-1', availability: 'available', medicine_id: 'med-1' });
    expect(id).toBe('inv-9');
    expect(created).toHaveLength(0);
    expect(updates[0].update).toEqual({ $set: { available: true, medicine_id: 'med-1' }, $max: { stock: 2 } });
  });

  it('refuses an unknown catalogue item and leaves a line with none to the old rule', async () => {
    const { svc } = service(null);
    await expect(svc.adoptCatalogueItem('ph-1', { id: 'oi-1', qty: 1 }, { order_item_id: 'oi-1', availability: 'available', medicine_id: 'nope' })).rejects.toThrow('catalogue_item_not_found');
    await expect(svc.adoptCatalogueItem('ph-1', { id: 'oi-1', qty: 1 }, { order_item_id: 'oi-1', availability: 'substitute' })).resolves.toBeUndefined();
  });
});
