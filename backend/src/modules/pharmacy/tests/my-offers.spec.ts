import { ForbiddenException } from '@nestjs/common';
import { PharmacyOfferService } from '../services/pharmacy-offer.service';

/** P3 "My offers": the pharmacy sees each offer as draft, sent, chosen, not chosen, expired or cancelled. */
describe('PharmacyOfferService.listForPharmacy (P3)', () => {
  const lean = (rows: any[]) => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }), lean: async () => rows });
  const make = (offers: any[], orders: any[], active = true) => {
    const svc: any = Object.create(PharmacyOfferService.prototype);
    svc.accounts = { findOne: () => ({ lean: async () => (active ? { id: 'ph1' } : null) }) };
    svc.offers = { find: jest.fn(() => lean(offers)) };
    svc.orders = { find: jest.fn(() => lean(orders)) };
    return svc as PharmacyOfferService;
  };
  const future = new Date(Date.now() + 3_600_000);
  const past = new Date(Date.now() - 3_600_000);
  const offers = [
    { id: 'a', order_id: 'o1', status: 'draft', quote_expires_at: future, items: [{}] },
    { id: 'b', order_id: 'o2', status: 'submitted', quote_expires_at: future, items: [] },
    { id: 'c', order_id: 'o3', status: 'selected', quote_expires_at: future },
    { id: 'd', order_id: 'o4', status: 'submitted', quote_expires_at: future },
    { id: 'e', order_id: 'o5', status: 'submitted', quote_expires_at: past },
    { id: 'f', order_id: 'o6', status: 'cancelled', quote_expires_at: future },
  ];
  const orders = [{ id: 'o3', selected_offer_id: 'c' }, { id: 'o4', selected_offer_id: 'other-pharmacy-offer' }];

  it('labels every offer from the pharmacy side', async () => {
    const out = await make(offers, orders).listForPharmacy({ id: 'ph1' });
    expect(Object.fromEntries(out.map((o: any) => [o.id, o.view_status]))).toEqual({ a: 'draft', b: 'sent', c: 'chosen', d: 'not_chosen', e: 'expired', f: 'cancelled' });
    expect(out.find((o: any) => o.id === 'a')).toMatchObject({ items_count: 1, quote_expires_at: future });
  });

  it('filters by the label and reads only this pharmacy', async () => {
    const svc = make(offers, orders);
    expect((await svc.listForPharmacy({ id: 'ph1' }, 'not_chosen')).map((o: any) => o.id)).toEqual(['d']);
    expect((svc as any).offers.find.mock.calls[0][0]).toEqual({ pharmacy_account_id: { $eq: 'ph1' } });
  });

  it('refuses an account that is not an approved pharmacy', async () => {
    await expect(make(offers, orders, false).listForPharmacy({ id: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
