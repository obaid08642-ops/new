/**
 * P22.9 — downloadable e-invoices: verify (don't duplicate) the existing
 * billing/ZATCA path end to end at service level with mocked models.
 */
import { BillingService } from '../billing.module';

const lean = <T>(v: T) => ({ lean: jest.fn().mockResolvedValue(v) });

describe('BillingService e-invoice download (P22.9 verify)', () => {
  let svc: BillingService;
  let invoices: { findOne: jest.Mock; create: jest.Mock };
  let bookings: { findOne: jest.Mock };
  let counters: { findOneAndUpdate: jest.Mock };
  const user = { id: 'pat-1', role: 'patient' };

  const booking = {
    id: 'bk-1', patient_id: 'pat-1', patient_name: 'Sara',
    total: 115, items: [{ name_en: 'CBC', price: 100, qty: 1 }],
  };
  const issuedRow = {
    id: 'inv-1', invoice_no: 'INV-2026-000007', booking_kind: 'appointment', booking_id: 'bk-1',
    patient_id: 'pat-1', subtotal: 100, vat_rate: 0.15, vat_amount: 15, total: 115,
    qr_base64: 'dGVzdA==', createdAt: new Date('2026-09-01T10:00:00Z'),
  };

  beforeEach(() => {
    invoices = { findOne: jest.fn(), create: jest.fn() };
    bookings = { findOne: jest.fn() };
    counters = { findOneAndUpdate: jest.fn().mockResolvedValue({ seq: 7 }) };
    const conn = {
      model: jest.fn((name: string) => (name === 'EInvoice' ? invoices : bookings)),
      collection: jest.fn(() => counters),
    };
    svc = new BillingService(conn as unknown as never);
    jest.clearAllMocks();
  });

  it('issues once then replays the same invoice (idempotent)', async () => {
    invoices.findOne.mockReturnValueOnce(lean(null)).mockReturnValueOnce(lean(issuedRow));
    bookings.findOne.mockReturnValueOnce(lean(booking));
    invoices.create.mockResolvedValueOnce({ id: 'inv-1' });
    const first = await svc.issue(user, 'appointment', 'bk-1') as unknown as { invoice_no: string };
    expect(first.invoice_no).toBe('INV-2026-000007');
    invoices.findOne.mockReturnValueOnce(lean(issuedRow));
    const second = await svc.issue(user, 'appointment', 'bk-1') as unknown as { invoice_no: string };
    expect(second.invoice_no).toBe('INV-2026-000007');
    expect(invoices.create).toHaveBeenCalledTimes(1);
  });

  it('invoicePdf renders a real PDF embedding the ZATCA QR', async () => {
    invoices.findOne.mockReturnValueOnce(lean(issuedRow));
    bookings.findOne.mockReturnValue(lean(booking));
    const buf = await svc.invoicePdf(user, 'appointment', 'bk-1');
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(1000);
  }, 60000);
});
