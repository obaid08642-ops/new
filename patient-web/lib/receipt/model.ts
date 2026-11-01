import { decodeZatcaTlv, type ZatcaPayload } from "./tlv";

/** The kinds of booking the backend invoices (`/billing/invoice/:kind/:id`), as the billing module names them. */
export const RECEIPT_KINDS = ["pharmacy", "order", "appointment", "consultation", "lab", "radiology", "home_care", "nursing"] as const;
export type ReceiptKind = (typeof RECEIPT_KINDS)[number];
export const isReceiptKind = (value: unknown): value is ReceiptKind => typeof value === "string" && (RECEIPT_KINDS as readonly string[]).includes(value);

export type ReceiptView = {
  invoiceNo: string;
  kind: string;
  bookingId: string;
  issuedAt: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  qr: string | null;
  /** seller name, VAT registration number and time as signed in the QR; null when the QR is missing or not phase-1 */
  seller: ZatcaPayload | null;
  /** "invoice" or "credit_note" */
  type: string;
  /** paid | partially_refunded | refunded | credit_note; null when the backend sent none */
  state: string | null;
  refundedTotal: number;
  creditNotes: ReceiptCreditNote[];
  /** our company as the API sends it: each field null when the owner has not configured it */
  company: { legalName: string | null; vatNumber: string | null; crNumber: string | null; address: string | null; configured: boolean };
  /** the party that delivered the service (a snapshot taken at issue); null when none was recorded */
  provider: ReceiptProvider | null;
  bookingRef: string | null;
};

export type ReceiptCreditNote = { invoiceNo: string; total: number; vatAmount: number; issuedAt: string | null };
export type ReceiptProvider = { nameAr: string | null; nameEn: string | null; facility: string | null; type: string | null; licence: string | null };

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null);
const text = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value : null);

/** One invoice of `GET /billing/invoice/:kind/:id` or an element of `GET /billing/my`; null when it lacks the number or an amount (nothing is invented). */
const obj = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

/** `shared`: the public share-link view carries no internal booking id, so none is required (and none is kept). */
export function extractReceipt(raw: unknown, opts: { shared?: boolean } = {}): ReceiptView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const invoiceNo = text(r.invoice_no);
  const total = num(r.total);
  const vatAmount = num(r.vat_amount);
  const subtotal = num(r.subtotal);
  const bookingId = text(r.booking_id);
  if (!invoiceNo || total === null || vatAmount === null || subtotal === null || (!bookingId && !opts.shared)) return null;
  // the list and the single read send `qr_base64`; the share-link view sends `qr: { payload }`
  const qr = text(r.qr_base64) ?? text(obj(r.qr)?.payload);
  const seller = decodeZatcaTlv(qr);
  return {
    invoiceNo,
    kind: text(r.booking_kind) ?? "",
    bookingId: bookingId ?? "",
    issuedAt: seller?.issuedAt ?? text(r.issued_at) ?? text(r.createdAt),
    subtotal,
    vatRate: num(r.vat_rate) ?? 0,
    vatAmount,
    total,
    currency: text(r.currency) ?? "SAR",
    qr,
    seller,
    type: text(r.type) ?? "invoice",
    state: text(r.state),
    refundedTotal: num(r.refunded_total) ?? 0,
    creditNotes: Array.isArray(r.credit_notes) ? r.credit_notes.flatMap((n) => {
      const note = obj(n);
      const no = text(note?.invoice_no);
      const noteTotal = num(note?.total);
      return note && no && noteTotal !== null ? [{ invoiceNo: no, total: noteTotal, vatAmount: num(note.vat_amount) ?? 0, issuedAt: text(note.issued_at) }] : [];
    }) : [],
    company: {
      legalName: text(obj(r.seller)?.legal_name) ?? seller?.seller ?? null,
      vatNumber: text(obj(r.seller)?.vat_number) ?? seller?.vatNumber ?? null,
      crNumber: text(obj(r.seller)?.cr_number),
      address: text(obj(r.seller)?.address),
      configured: obj(r.seller) ? obj(r.seller)?.configured !== false : seller !== null,
    },
    provider: (() => {
      const p = obj(r.provider);
      if (!p) return null;
      const view = { nameAr: text(p.name_ar), nameEn: text(p.name_en), facility: text(p.facility_name), type: text(p.type), licence: text(p.license_number) };
      return view.nameAr || view.nameEn || view.facility ? view : null;
    })(),
    bookingRef: text(r.booking_ref),
  };
}

/** The provider's name in the page language (Arabic for ar and ur, English otherwise), else the other one, else the facility. */
export function providerName(provider: ReceiptProvider, locale: string): string {
  const arabicScript = locale === "ar" || locale === "ur";
  return (arabicScript ? provider.nameAr ?? provider.nameEn : provider.nameEn ?? provider.nameAr) ?? provider.facility ?? "";
}

/** The share-link pages and calls the web uses, as one place (paths relative to /api/patient). */
export const shareLinkPath = (kind: ReceiptKind, bookingId: string) => `/api/patient/billing/invoice/${kind}/${encodeURIComponent(bookingId)}/share-link`;

export type ShareLinkRow = { id: string; createdAt: string | null; expiresAt: string | null; revokedAt: string | null; viewCount: number; status: "active" | "expired" | "revoked" };

export function extractShareLinks(raw: unknown): ShareLinkRow[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.flatMap((entry) => {
    const l = obj(entry);
    const id = text(l?.id);
    const status = text(l?.status);
    if (!l || !id || (status !== "active" && status !== "expired" && status !== "revoked")) return [];
    return [{ id, createdAt: text(l.created_at), expiresAt: text(l.expires_at), revokedAt: text(l.revoked_at), viewCount: num(l.view_count) ?? 0, status }];
  });
}

/** The answer of POST .../share-link: the token is shown once. */
export function extractNewShareLink(raw: unknown): { id: string; token: string; expiresAt: string | null } | null {
  const l = obj(raw);
  const id = text(l?.id);
  const token = text(l?.token);
  return l && id && token ? { id, token, expiresAt: text(l.expires_at) } : null;
}

export function extractReceipts(raw: unknown): ReceiptView[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data) ? (raw as { data: unknown[] }).data : [];
  return list.flatMap((entry) => {
    const view = extractReceipt(entry);
    return view ? [view] : [];
  });
}
