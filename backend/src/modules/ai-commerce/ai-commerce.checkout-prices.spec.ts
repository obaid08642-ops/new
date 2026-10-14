// The public AI checkout priced a medicine with no price at 20 SAR and every
// consultation at 150 SAR whatever the doctor charges, and sold items that are
// not public (unreviewed medicine, inactive doctor). No invented prices.
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AiCommerceService } from './ai-commerce.service';

type Row = Record<string, unknown>;
const matches = (row: Row, q: Row): boolean => Object.entries(q).every(([k, v]) => {
  if (k === '$or') return (v as Row[]).some((alt) => matches(row, alt));
  if (v && typeof v === 'object' && '$eq' in (v as Row)) return row[k] === (v as Row).$eq;
  if (v && typeof v === 'object' && '$ne' in (v as Row)) return row[k] !== (v as Row).$ne;
  return row[k] === v;
});

describe('AI checkout uses real prices of public items only', () => {
  const meds: Row[] = [
    { id: 'med-priced', slug: 'priced', price: 12, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' },
    { id: 'med-noprice', slug: 'noprice', is_deleted: false, public_eligibility: true, medical_review_status: 'approved' },
    { id: 'med-draft', slug: 'draft', price: 30, public_eligibility: false, medical_review_status: 'pending' },
  ];
  const docs: Row[] = [
    { id: 'doc-280', type: 'doctor', price_clinic: 280, status: 'active', public_eligibility: true, medical_review_status: 'approved' },
    { id: 'doc-noprice', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved' },
    { id: 'doc-suspended', type: 'doctor', price_clinic: 200, status: 'suspended', public_eligibility: true, medical_review_status: 'approved' },
  ];
  const conn = {
    collection: (name: string) => ({
      findOne: async (q: Row) => (name === 'provider_profiles' ? docs : meds).find((r) => matches(r, q)) ?? null,
      insertOne: async () => ({}),
      findOneAndUpdate: async () => null,
    }),
  };
  const service = new AiCommerceService(conn as never);

  it('charges the doctor\'s own clinic price', async () => {
    const s = await service.createCheckoutSession({ items: [{ type: 'consultation', id: 'doc-280' }] });
    expect(s.pricing.subtotal).toBe(280);
  });

  it('refuses a consultation when the doctor has no price', async () => {
    await expect(service.createCheckoutSession({ items: [{ type: 'consultation', id: 'doc-noprice' }] })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('refuses a medicine with no price instead of charging 20 SAR', async () => {
    await expect(service.createCheckoutSession({ items: [{ type: 'medicine', id: 'noprice' }] })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('does not sell an unreviewed medicine or a suspended doctor', async () => {
    await expect(service.createCheckoutSession({ items: [{ type: 'medicine', id: 'draft' }] })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.createCheckoutSession({ items: [{ type: 'consultation', id: 'doc-suspended' }] })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('still prices a public medicine from its record', async () => {
    const s = await service.createCheckoutSession({ items: [{ type: 'medicine', id: 'priced', quantity: 2 }] });
    expect(s.pricing.subtotal).toBe(24);
  });
});
