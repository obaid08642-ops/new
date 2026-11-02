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
