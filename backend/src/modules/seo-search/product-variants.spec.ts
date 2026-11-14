import { NotFoundException } from '@nestjs/common';
import { SeoSearchService } from './seo-search.module';

/**
 * Owner decision D (issue 1556): GET public/product-variants/:locale/:id returns the published variants of a product
 * for the picker, with the public product filter and the per-locale projection of the product page.
 */
type Filter = Record<string, unknown>;
function serviceWith(rows: Array<Record<string, unknown>>) {
  const calls: { findOne: Filter[]; find: Filter[]; projection?: Record<string, unknown> } = { findOne: [], find: [] };
  const collection = {
    findOne: async (q: Filter) => {
      calls.findOne.push(q);
      return rows.find((r) => r.id === q.id && r.public_eligibility === true && r.medical_review_status === 'approved') ?? null;
    },
    find: (q: Filter, opts: { projection: Record<string, unknown> }) => {
      calls.find.push(q);
      calls.projection = opts.projection;
      const hits = rows.filter((r) => r.variant_group === q.variant_group && r.public_eligibility === true && r.medical_review_status === 'approved' && r.is_deleted !== true);
      return { limit: () => ({ toArray: async () => hits }) };
    },
  };
  const service = new SeoSearchService({ collection: () => collection } as never);
  return { service, calls };
}

const pub = { public_eligibility: true, medical_review_status: 'approved' };
const lens = (id: string, colour: string, power: number, position: number, extra: Record<string, unknown> = {}) => ({
  ...pub, id, sku: Number(id.replace(/\D/g, '')), name_ar: `ديفا ${colour} ${power}`, name_en: `Diva Lenses ${colour} ${power.toFixed(2)}`,
  price: 50 + position, images: [`${id}.webp`], variant_group: 'vg_diva', variant: { kind: 'colour_power', colour, power, position, source: 'name_en-parse-2026-10' },
  translations: { ur: { name: `ڈیوا ${colour} ${power}`, slug: `diva-ur-${id}` } }, ...extra,
});

describe('public product variants (decision D)', () => {
  const rows = [
    lens('d4', 'hazel', 1.5, 3),
    lens('d1', 'hazel', -2.5, 2),
    lens('d2', 'hazel', -0.25, 1),
    lens('d3', 'brown', -1, 0, { availability_status: 'discontinued' }),
    lens('d9', 'brown', -1.25, 4, { public_eligibility: false }),
    { ...pub, id: 'solo', name_en: 'Panadol', price: 10 },
  ];

  it('returns every published variant, sorted colour then power, with its own SKU, price, picture and availability', async () => {
    const { service, calls } = serviceWith(rows);
    const res = await service.publicProductVariants('ur', 'd1');
    expect(res.variant_group).toBe('vg_diva');
    expect(res.kind).toBe('colour_power');
    expect(res.variants.map((v) => v.id)).toEqual(['d3', 'd2', 'd1', 'd4']);
    const d1 = res.variants.find((v) => v.id === 'd1')!;
    expect(d1).toMatchObject({ sku: 1, price: 52, image: 'd1.webp', available: true, slug: 'diva-ur-d1', name: 'ڈیوا hazel -2.5' });
    expect(d1.variant).toEqual({ kind: 'colour_power', colour: 'hazel', power: -2.5, shade: null, position: 2 });
    expect(res.variants.find((v) => v.id === 'd3')!.available).toBe(false);
    // the public product filter on both reads; the unpublished variant (d9) is never returned
    for (const q of [...calls.findOne, ...calls.find]) expect(q).toMatchObject({ public_eligibility: true, medical_review_status: 'approved', is_deleted: { $ne: true } });
    expect(res.variants.some((v) => v.id === 'd9')).toBe(false);
    // only the picker's fields are read (no leaflet text, no internal review fields)
    expect(calls.projection).toMatchObject({ _id: 0, id: 1, price: 1, variant: 1 });
    expect(Object.keys(calls.projection!)).not.toContain('description_ar');
  });

  it('a product without a group has no variants', async () => {
    const { service } = serviceWith(rows);
    expect(await service.publicProductVariants('en', 'solo')).toEqual({ id: 'solo', variant_group: null, kind: null, variants: [] });
  });

  it('an unpublished or unknown product is not found', async () => {
    const { service } = serviceWith(rows);
    await expect(service.publicProductVariants('en', 'd9')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.publicProductVariants('en', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
