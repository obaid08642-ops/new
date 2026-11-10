/**
 * One ISSUED invoice per booking. `BillingService.issue` checks that with a read before the insert, which two writers (the `payment.completed` event and the patient opening the
 * receipt) both pass; each then took its own invoice number, so a booking could carry two tax invoices. The unique partial index below makes the database the judge: the loser's
 * insert fails with a duplicate-key error and `issue` hands back the winner's invoice (the catch block that was always meant to do that).
 * The index is built only when no booking already has two issued invoices (Mongo would refuse to build it otherwise), and it covers only `type: 'invoice'` rows with
 * `status: 'ISSUED'` (credit notes, cancelled and legacy rows without a type are outside it).
 */
export const INVOICE_KEY_INDEX = 'einvoice_booking_unique';
export const INVOICE_KEY_FILTER = { type: 'invoice', status: 'ISSUED', booking_kind: { $type: 'string' }, booking_id: { $type: 'string' } };

type Db = { collection(name: string): any };

/** Counts only: how many bookings have more than one issued invoice, and how many invoices are extra. */
export async function countInvoiceDuplicates(db: Db): Promise<{ groups: number; extra_rows: number }> {
  const rows: Array<{ n: number }> = await db.collection('einvoices').aggregate([
    { $match: INVOICE_KEY_FILTER },
    { $group: { _id: { k: '$booking_kind', b: '$booking_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ], { allowDiskUse: true }).toArray();
  return { groups: rows.length, extra_rows: rows.reduce((s, r) => s + (r.n - 1), 0) };
}

export async function invoiceIndexPresent(db: Db): Promise<boolean> {
  try {
    const idx: Array<{ name?: string }> = await db.collection('einvoices').listIndexes().toArray();
    return idx.some((i) => i.name === INVOICE_KEY_INDEX);
  } catch { return false; }
}

export type InvoiceIndexResult = 'created' | 'present' | 'duplicates' | 'failed';

/** Builds the unique index when there is no duplicate; with duplicates it does nothing (and says so), so a deploy can never break on dirty data. */
export async function ensureInvoiceUniqueIndex(db: Db, warn: (msg: string) => void = () => undefined): Promise<InvoiceIndexResult> {
  try {
    // the index already exists (every start after the first): nothing to check, and no scan of the invoices
    if (await invoiceIndexPresent(db)) return 'present';
    const dup = await countInvoiceDuplicates(db);
    if (dup.groups > 0) {
      warn(`billing: ${dup.groups} bookings have ${dup.extra_rows} extra issued invoices: the unique index ${INVOICE_KEY_INDEX} was not built; finance resolves them first`);
      return 'duplicates';
    }
    await db.collection('einvoices').createIndex({ booking_kind: 1, booking_id: 1 }, { unique: true, name: INVOICE_KEY_INDEX, partialFilterExpression: INVOICE_KEY_FILTER });
    return 'created';
  } catch (e: any) {
    warn(`billing: the unique index ${INVOICE_KEY_INDEX} could not be built: ${e?.message}`);
    return 'failed';
  }
}
