import { BillingService, invoiceYear } from './billing.module';

describe('the year in a document number is the Riyadh year', () => {
  it('31 December 21:30 UTC is already 1 January in Riyadh: next year', () => {
    expect(invoiceYear(new Date('2026-12-31T21:30:00Z'))).toBe(2027);
    expect(invoiceYear(new Date('2026-12-31T20:59:59Z'))).toBe(2026);
    expect(invoiceYear(new Date('2027-01-01T00:00:00Z'))).toBe(2027);
    expect(invoiceYear(new Date('2026-06-15T12:00:00Z'))).toBe(2026);
  });

  const svcWith = (counters: any) => new BillingService({ collection: (n: string) => (n === 'counters' ? counters : undefined) } as any);
  it('the number and its counter use that year: INV-2027-000001 from the first Riyadh minute of 2027, with its own series', async () => {
    const counters = { findOneAndUpdate: jest.fn(async () => ({ seq: 1 })) };
    const svc: any = svcWith(counters);
    expect(await svc.allocateNo('invoice', new Date('2026-12-31T21:05:00Z'))).toBe('INV-2027-000001');
    expect(counters.findOneAndUpdate).toHaveBeenLastCalledWith({ _id: 'invoice-2027' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
    expect(await svc.allocateNo('receipt', new Date('2026-12-31T20:00:00Z'))).toBe('RCT-2026-000001');
    expect(counters.findOneAndUpdate).toHaveBeenLastCalledWith({ _id: 'receipt-2026' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  });
});
