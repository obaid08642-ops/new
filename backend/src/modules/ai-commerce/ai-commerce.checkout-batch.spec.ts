import { NotFoundException } from '@nestjs/common';
import { AiCommerceService } from './ai-commerce.service';

/**
 * Perf Rank 6 proof: checkout resolves all cart items with a single $in
 * query per collection (medicines, provider_profiles) + in-memory maps —
 * no sequential findOne-per-item — while preserving exact totals/decisions.
 */
describe('AiCommerceService checkout batching', () => {
  const medFixtures = [
    { id: 'med-1', slug: 'panadol-advance', sku: 101, name_ar: 'بانادول', name_en: 'Panadol', price: 18.5, requires_prescription: false, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' },
    { id: 'med-2', slug: 'lipitor-20mg', sku: 202, name_ar: 'ليبيتور', name_en: 'Lipitor', price: 95.0, requires_prescription: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' },
    { id: 'med-3', slug: 'augmentin-625', sku: 303, name_ar: 'أوجمنتين', name_en: 'Augmentin', price: 12.25, requires_prescription: false, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' },
  ];
  const docFixtures = [
    { id: 'doc-1', slug: 'dr-sara', name_ar: 'د. سارة', name_en: 'Dr. Sara', specialty: 'pediatrics', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', price_clinic: 150 },
    { id: 'doc-2', slug: 'dr-omar', name_ar: 'د. عمر', name_en: 'Dr. Omar', specialty: 'dermatology', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', price_clinic: 150 },
  ];

  // Minimal in-memory $or/$in matcher so the mock behaves like Mongo for our filters.
  const matches = (doc: any, filter: any) =>
    (filter?.$or ?? []).some((clause: any) => {
      const [field, cond] = Object.entries<any>(clause)[0];
      return (cond?.$in ?? []).map(String).includes(String(doc[field]));
    }) &&
    // Q106 public filters next to $or: equality and $ne.
    Object.entries<any>(filter ?? {}).filter(([k]) => k !== '$or').every(([k, v]) =>
      v && typeof v === 'object' && '$ne' in v ? doc[k] !== v.$ne : doc[k] === v);

  let service: AiCommerceService;
  let medHandle: any;
  let docHandle: any;

  beforeEach(() => {
    medHandle = {
      find: jest.fn((filter: any) => ({ toArray: () => Promise.resolve(medFixtures.filter((d) => matches(d, filter))) })),
      findOne: jest.fn(() => Promise.resolve(null)),
    };
    docHandle = {
      find: jest.fn((filter: any) => ({ toArray: () => Promise.resolve(docFixtures.filter((d) => matches(d, filter))) })),
      findOne: jest.fn(() => Promise.resolve(null)),
    };
    const connection = {
      collection: jest.fn((name: string) => {
        if (name === 'medicines') return medHandle;
        if (name === 'provider_profiles') return docHandle;
        if (name === 'finance_config') return { findOne: jest.fn(() => Promise.resolve(null)) };
        if (name === 'ai_checkout_sessions') return { insertOne: jest.fn(() => Promise.resolve({ insertedId: 'x' })) };
        throw new Error(`unexpected collection ${name}`);
      }),
    } as any;
    service = new AiCommerceService(connection);
  });

  it('resolves a mixed cart with exactly one query per collection and identical totals', async () => {
    const session = await service.createCheckoutSession({
      items: [
        { type: 'medicine', id: 'panadol-advance', quantity: 2 }, // slug lookup: 18.5*2 = 37.00
        { type: 'medicine', id: 'med-2', quantity: 1 },           // id lookup: 95.00 (Rx)
        { type: 'medicine', id: '303', quantity: 3 },            // sku lookup: 12.25*3 = 36.75
        { type: 'consultation', id: 'dr-sara' },                 // slug lookup: 150.00
        { type: 'consultation', id: 'doc-2' },                   // id lookup: 150.00
        { type: 'medicine', id: 'panadol-advance', quantity: 1 },// duplicate: 18.50
      ],
      locale: 'ar',
    });

    // One batched round-trip per collection, zero per-item findOne lookups.
    expect(medHandle.find).toHaveBeenCalledTimes(1);
    expect(docHandle.find).toHaveBeenCalledTimes(1);
    expect(medHandle.findOne).not.toHaveBeenCalled();
    expect(docHandle.findOne).not.toHaveBeenCalled();

    // Batch filters cover every distinct cart id.
    const medFilter = medHandle.find.mock.calls[0][0];
    const docFilter = docHandle.find.mock.calls[0][0];
    expect(medFilter.$or).toEqual(
      expect.arrayContaining([{ id: { $in: expect.arrayContaining(['panadol-advance', 'med-2', '303']) } }]),
    );
    expect(docFilter.$or).toEqual(
      expect.arrayContaining([{ slug: { $in: expect.arrayContaining(['dr-sara', 'doc-2']) } }]),
    );

    // Exact pricing decisions preserved:
    // subtotal 37+95+36.75+150+150+18.5 = 487.25; VAT 15% = 73.09; total = 560.34.
    expect(session.pricing).toEqual({ currency: 'SAR', subtotal: 487.25, vat_amount: 73.09, total_sar: 560.34 });
    expect(session.requires_prescription).toBe(true);
    expect(session.items_count).toBe(6);
    expect(session.items.map((i: any) => i.line_total)).toEqual([37, 95, 36.75, 150, 150, 18.5]);
    expect(session.items.map((i: any) => i.id)).toEqual(['med-1', 'med-2', 'med-3', 'doc-1', 'doc-2', 'med-1']);
  });

  it('preserves NotFound decisions for unknown medicine/doctor', async () => {
    await expect(service.createCheckoutSession({ items: [{ type: 'medicine', id: 'nope' }] })).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.createCheckoutSession({ items: [{ type: 'consultation', id: 'nope' }] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('skips the unneeded collection query for single-type carts', async () => {
    await service.createCheckoutSession({ items: [{ type: 'medicine', id: 'med-1', quantity: 1 }] });
    expect(medHandle.find).toHaveBeenCalledTimes(1);
    expect(docHandle.find).not.toHaveBeenCalled();

    medHandle.find.mockClear();
    docHandle.find.mockClear();
    await service.createCheckoutSession({ items: [{ type: 'consultation', id: 'doc-1' }] });
    expect(docHandle.find).toHaveBeenCalledTimes(1);
    expect(medHandle.find).not.toHaveBeenCalled();
  });

  // 6fa7fce review: the query coerces the key with Number() (as before the
  // batching) but the map was keyed by String(sku), so "0101" found sku 101 in
  // the database and then missed it in the map (404).
  it('resolves a sku key the same way the query matched it', async () => {
    const session = await service.createCheckoutSession({ items: [{ type: 'medicine', id: '0101', quantity: 1 }] });
    expect(session.items[0]).toEqual(expect.objectContaining({ id: 'med-1', sku: 101 }));
  });
});
