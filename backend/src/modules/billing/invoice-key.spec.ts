import { BillingService } from './billing.module';
import { INVOICE_KEY_FILTER, INVOICE_KEY_INDEX, countInvoiceDuplicates, ensureInvoiceUniqueIndex } from './invoice-key';

const dupKey = Object.assign(new Error('E11000 duplicate key error collection: einvoices index: einvoice_booking_unique'), { code: 11000 });

function dbWith(groups: Array<{ n: number }>, createIndex: any = jest.fn().mockResolvedValue('ok')) {
  const einvoices = { aggregate: jest.fn(() => ({ toArray: async () => groups })), createIndex };
  return { db: { collection: (n: string) => (n === 'einvoices' ? einvoices : undefined) }, einvoices };
}

describe('one issued invoice per booking: the unique index', () => {
  it('is built (partial: issued invoices only, credit notes outside) when no booking has two', async () => {
    const { db, einvoices } = dbWith([]);
    expect(await ensureInvoiceUniqueIndex(db)).toBe('created');
    expect(einvoices.createIndex).toHaveBeenCalledWith({ booking_kind: 1, booking_id: 1 }, { unique: true, name: INVOICE_KEY_INDEX, partialFilterExpression: INVOICE_KEY_FILTER });
    expect(INVOICE_KEY_FILTER).toMatchObject({ type: 'invoice', status: 'ISSUED' });   // a credit note (type credit_note) is not covered: many per booking are fine
  });
  it('is NOT built while a booking has two issued invoices (it says so, nothing breaks)', async () => {
    const { db, einvoices } = dbWith([{ n: 2 }, { n: 3 }]);
    const warn = jest.fn();
    expect(await ensureInvoiceUniqueIndex(db, warn)).toBe('duplicates');
    expect(einvoices.createIndex).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 bookings have 3 extra issued invoices'));
    expect(await countInvoiceDuplicates(db)).toEqual({ groups: 2, extra_rows: 3 });
  });
  it('a build failure is reported, never thrown', async () => {
    const { db } = dbWith([], jest.fn().mockRejectedValue(new Error('not authorized')));
    const warn = jest.fn();
    expect(await ensureInvoiceUniqueIndex(db, warn)).toBe('failed');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not authorized'));
  });
});

describe('issue(): two writers race for the same booking', () => {
  function world(createImpl: (d: any) => Promise<any>) {
    const winner = { id: 'inv-winner', invoice_no: 'INV-2026-000001', booking_kind: 'lab', booking_id: 'b1', patient_id: 'p1', status: 'ISSUED', type: 'invoice', total: 115 };
    let reads = 0;
    const invoices = {
      // the first read (nothing issued yet) passes for BOTH writers; after the loser's failed insert the winner is there
      findOne: jest.fn(() => ({ lean: async () => (reads++ === 0 ? null : winner) })),
      create: jest.fn(createImpl),
      find: jest.fn(() => ({ lean: async () => [] })),
      updateOne: jest.fn(async () => ({})),
    };
    const einvoices = { aggregate: jest.fn(() => ({ toArray: async () => [] })), createIndex: jest.fn().mockResolvedValue('ok') };
    const collections: Record<string, any> = {
      einvoices,
      transactions: { find: jest.fn(() => ({ toArray: async () => [{ amount: 115 }] })), findOne: jest.fn(async () => null) },
      insuranceservicerequests: { find: jest.fn(() => ({ limit: () => ({ toArray: async () => [] }) })), findOne: jest.fn(async () => null) },
      finance_config: { findOne: jest.fn(async () => null) },
      pharmacy_orders: { findOne: jest.fn(async () => null) },
      counters: { findOneAndUpdate: jest.fn(async () => ({ seq: 2 })) },
    };
    const conn: any = {
      model: (n: string) => (n === 'EInvoice' ? invoices : { findOne: () => ({ lean: async () => ({ patient_id: 'p1', total: 115 }) }) }),
      collection: (n: string) => collections[n],
    };
    return { svc: new BillingService(conn), invoices, einvoices, winner };
  }

  it('the loser (duplicate-key error on the unique index) gets the winner\'s invoice back, not a second invoice and not an error', async () => {
    const { svc, invoices, winner } = world(async () => { throw dupKey; });
    const out: any = await svc.issue({ id: 'p1', role: 'patient' }, 'lab', 'b1');
    expect(out.id).toBe(winner.id);
    expect(invoices.create).toHaveBeenCalledTimes(1);
  });
  it('the index is ensured before the first invoice is written, once per process', async () => {
    const { svc, einvoices } = world(async (d: any) => ({ id: 'inv-1', ...d }));
    await svc.issue({ id: 'p1', role: 'patient' }, 'lab', 'b1').catch(() => undefined);
    await svc.issue({ id: 'p1', role: 'patient' }, 'lab', 'b1').catch(() => undefined);
    expect(einvoices.createIndex).toHaveBeenCalledTimes(1);
  });
  it('any other insert error is still thrown (when no winner exists)', async () => {
    const w = world(async () => { throw new Error('disk full'); });
    (w.invoices.findOne as jest.Mock).mockImplementation(() => ({ lean: async () => null }));
    await expect(w.svc.issue({ id: 'p1', role: 'patient' }, 'lab', 'b1')).rejects.toThrow('disk full');
  });
});

describe('the number is taken only after the insert wins (no gap in the series)', () => {
  function numbered() {
    const rows: any[] = [];
    const counters = { findOneAndUpdate: jest.fn(async () => ({ seq: rows.filter((r) => !String(r.invoice_no).startsWith('PENDING-')).length + 1 })) };
    let dupNext = false;
    const invoices = {
      findOne: jest.fn((q: any) => ({ lean: async () => rows.find((r) => (q.id === undefined || r.id === q.id) && (q.booking_id === undefined || r.booking_id === q.booking_id)) ?? null })),
      create: jest.fn(async (d: any) => { if (dupNext) throw dupKey; const row = { id: `i${rows.length + 1}`, ...d }; rows.push(row); return row; }),
      updateOne: jest.fn(async (q: any, u: any) => { const row = rows.find((r) => r.id === q.id && r.invoice_no === q.invoice_no); if (row) Object.assign(row, u.$set); return {}; }),
      find: jest.fn(() => ({ lean: async () => [] })),
    };
    const conn: any = { model: () => invoices, collection: (n: string) => (n === 'counters' ? counters : undefined) };
    const svc: any = new BillingService(conn);
    return { svc, rows, counters, invoices, setDup: (v: boolean) => { dupNext = v; } };
  }
  const fields = { type: 'invoice', document_kind: 'receipt', booking_kind: 'lab', booking_id: 'b1', issued_at: new Date('2026-06-01T10:00:00Z') };

  it('a winning insert gets its number AFTER it is stored; the stored row never keeps the placeholder', async () => {
    const { svc, rows, counters } = numbered();
    const doc = await svc.insertNumbered(fields, 'receipt', new Date('2026-06-01T10:00:00Z'));
    expect(doc.invoice_no).toBe('RCT-2026-000001');
    expect(rows[0].invoice_no).toBe('RCT-2026-000001');
    expect(counters.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
  it('a LOSING insert (duplicate key) takes no number at all: the counter is not touched', async () => {
    const { svc, counters, setDup } = numbered();
    setDup(true);
    await expect(svc.insertNumbered(fields, 'invoice', new Date())).rejects.toBe(dupKey);
    expect(counters.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('two documents in a row get 1 and 2 (no gap), credit notes and refund receipts have their own series', async () => {
    const { svc } = numbered();
    const a = await svc.insertNumbered({ ...fields, booking_id: 'a' }, 'invoice', new Date('2026-06-01T10:00:00Z'));
    expect(a.invoice_no).toBe('INV-2026-000001');
    const cn = await svc.insertNumbered({ ...fields, type: 'credit_note', booking_id: 'a' }, 'creditnote', new Date('2026-06-01T10:00:00Z'));
    expect(cn.invoice_no).toMatch(/^CN-2026-/);
    const rr = await svc.insertNumbered({ ...fields, type: 'credit_note', booking_id: 'a' }, 'refundreceipt', new Date('2026-06-01T10:00:00Z'));
    expect(rr.invoice_no).toMatch(/^RRC-2026-/);
  });
  it('a writer that died between the insert and the number leaves a placeholder: the next reader numbers it (once)', async () => {
    const { svc, rows, counters } = numbered();
    rows.push({ id: 'dead', invoice_no: 'PENDING-abc', type: 'invoice', document_kind: 'tax_invoice', booking_id: 'b9', issued_at: new Date('2026-06-01T10:00:00Z') });
    const settled = await svc.settle(rows[0]);
    expect(settled.invoice_no).toBe('INV-2026-000001');
    expect(counters.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect((await svc.settle(settled)).invoice_no).toBe('INV-2026-000001');   // already numbered: nothing more is taken
    expect(counters.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
  it('seriesOf: the series a stored document belongs to', () => {
    const { svc } = numbered();
    expect(svc.seriesOf({ type: 'invoice', document_kind: 'tax_invoice' })).toBe('invoice');
    expect(svc.seriesOf({ type: 'invoice', document_kind: 'receipt' })).toBe('receipt');
    expect(svc.seriesOf({ type: 'credit_note', document_kind: 'tax_invoice' })).toBe('creditnote');
    expect(svc.seriesOf({ type: 'credit_note', document_kind: 'receipt' })).toBe('refundreceipt');
  });
});

