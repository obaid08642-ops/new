/**
 * The ONE switch between a tax invoice and a payment receipt.
 *
 * The platform is VAT-registered when `finance_config` document `{ key: 'invoice' }` (else the environment) holds both a legal seller
 * name and a VAT number. Registered: documents issued from then on are simplified tax invoices (VAT split, ZATCA QR). Not registered:
 * they are payment receipts (no VAT line, no VAT rate, no QR, total = the amount paid). A document keeps the kind it was issued with;
 * registering later never turns an old receipt into a tax invoice.
 *
 * Prices and charges do not depend on this: only the breakdown that is shown and the document that is issued.
 */
export interface InvoiceConfig {
  name: string | null;
  vatNumber: string | null;
  crNumber: string | null;
  address: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  /** true = a tax invoice may be issued. */
  taxRegistered: boolean;
}

export type DocumentKind = 'tax_invoice' | 'receipt';

export async function readInvoiceConfig(conn: { collection(name: string): any }): Promise<InvoiceConfig> {
  let cfg: any = null;
  try { cfg = await conn.collection('finance_config').findOne({ key: 'invoice' }); } catch { /* no config store: the environment */ }
  const pick = (field: string, env: string) => String(cfg?.[field] || process.env[env] || '').trim() || null;
  const name = pick('seller_name', 'ZATCA_SELLER_NAME');
  const vatNumber = pick('vat_number', 'ZATCA_VAT_NUMBER');
  return {
    name, vatNumber, crNumber: pick('cr_number', 'ZATCA_CR_NUMBER'), address: pick('address', 'ZATCA_SELLER_ADDRESS'),
    supportEmail: pick('support_email', 'INVOICE_SUPPORT_EMAIL'), supportPhone: pick('support_phone', 'INVOICE_SUPPORT_PHONE'),
    taxRegistered: !!(name && vatNumber),
  };
}

export async function isTaxRegistered(conn: { collection(name: string): any }): Promise<boolean> {
  return (await readInvoiceConfig(conn)).taxRegistered;
}

/**
 * The kind of a stored document. New documents store `document_kind`. A document from before the switch existed was a tax invoice
 * when it was sealed with a seller and a VAT number, and a receipt-like document (seller not configured, no QR) otherwise.
 */
export function documentKindOf(doc: { document_kind?: string; seller_complete?: boolean; vat_number?: string | null } | null | undefined): DocumentKind {
  if (doc?.document_kind === 'tax_invoice' || doc?.document_kind === 'receipt') return doc.document_kind;
  return doc?.seller_complete === false || !doc?.vat_number ? 'receipt' : 'tax_invoice';
}

/**
 * WHERE platform VAT applies (owner decision 2026-11-01, "Model A"): the provider is the supplier of the service and the platform
 * issues the patient's document as a third party. The platform's VAT appears ONLY on
 *   1. its commission (the platform → provider commission invoice; the settlement takes VAT on the commission), and
 *   2. the delivery fee, a line the platform charges.
 * The service price itself carries no platform VAT. Without a platform VAT number there are no VAT lines at all (receipt mode).
 */
export const PLATFORM_VAT_LINE_KEYS: readonly string[] = ['delivery_fee'];

const r2 = (n: number) => Math.round(n * 100) / 100;

/** The part of a VAT-inclusive total that is platform VAT: the VAT inside the delivery-fee lines, never more than what was paid. */
export function platformVatOf(lines: Array<{ key?: string; amount?: number }> | null | undefined, rate: number, paidTotal: number): number {
  if (!(rate > 0)) return 0;
  const fee = (lines ?? []).filter((l) => PLATFORM_VAT_LINE_KEYS.includes(String(l?.key))).reduce((sum, l) => sum + (Number(l?.amount) > 0 ? Number(l.amount) : 0), 0);
  const base = Math.min(fee, Math.max(0, paidTotal));
  return r2(base - base / (1 + rate));
}
