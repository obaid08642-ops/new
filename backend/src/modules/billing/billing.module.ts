/**
 * M6 / ZATCA (Phase 1 — فوترة إلكترونية مبسطة):
 * Every paid booking gets an e-invoice with a ZATCA-compliant QR code
 * (TLV tags 1–5, base64) as mandated since 04/12/2021.
 * Phase 2 (Fatoora clearance / UBL XML / cryptographic signing) requires a
 * certified integration — tracked in PROJECT_CONTEXT debts.
 *
 * NOTE: booking models are fetched from the shared mongoose connection
 * (already registered by their owning modules) — no re-registration here.
 */
import {
  Body, Delete, HttpException, HttpStatus, Req,
  BadRequestException, Controller, Get, Post, Module, Param, Query,
  NotFoundException, Injectable, UseGuards, Res, StreamableFile, Logger,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { ShareLinkDto } from './billing.dto';
import { JwtAuthGuard, Roles, SelfService, CurrentUser, Public } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { findCopayTransaction } from '../../common/copay-transaction';
import { renderInvoicePdf } from './invoice-pdf';
import { MailModule, MailService } from '../mail/mail.module';
import { readInvoiceConfig, documentKindOf, type DocumentKind } from '../../common/tax-registration';

const VAT_RATE = 0.15;

// ── Schema ─────────────────────────────────────────────────────────────────
@Schema({ timestamps: true })
export class EInvoice {
  @Prop({ default: () => randomUUID() }) id: string;
  @Prop({ unique: true, index: true }) invoice_no: string; // INV-2026-000001 (tax invoice) | RCT-2026-000001 (receipt)
  @Prop({ index: true }) booking_kind: string;
  @Prop({ index: true }) booking_id: string;
  @Prop({ index: true }) patient_id: string;
  @Prop({ default: 0 }) subtotal: number;
  @Prop({ default: VAT_RATE }) vat_rate: number;
  @Prop({ default: 0 }) vat_amount: number;
  @Prop({ default: 0 }) total: number;
  @Prop({ default: 'SAR' }) currency: string;
  @Prop() qr_base64: string; // ZATCA TLV QR payload
  @Prop({ default: 'ISSUED', index: true }) status: string; // ISSUED|CANCELLED
  @Prop({ default: 'invoice', index: true }) type: string; // invoice | credit_note (a negative invoice that references the original)
  @Prop() original_invoice_no: string; // credit note: the invoice it reverses
  @Prop({ sparse: true, unique: true }) refund_ref: string; // credit note: one per refund
  @Prop({ type: Object }) lines: any[]; // what was bought: [{ key, name_ar, name_en, qty, unit_price, amount }]
  @Prop({ type: Object }) payment: any; // { method, last4 }
  @Prop({ type: Object }) insured: any; // { insurer, price, covered, copay } when an insurer paid part
  @Prop() seller_name: string;
  @Prop() vat_number: string;
  /** false while the seller's legal name or VAT number is not configured (a receipt). Kept for documents issued before `document_kind`. */
  @Prop({ default: true }) seller_complete: boolean;
  /** tax_invoice (VAT number configured when issued) | receipt (not VAT-registered: no VAT, no QR). Fixed at issue, never changed later. */
  @Prop({ enum: ['tax_invoice', 'receipt'], index: true }) document_kind: string;
  @Prop() seller_cr_number: string; // commercial registration, from config
  @Prop() seller_address: string;
  /** The provider who delivered the service (a snapshot: name, type, licence number if we hold one); our company stays the issuer. */
  @Prop({ type: Object }) provider: any;
  @Prop() patient_name: string; // optional on a simplified invoice
  @Prop() booking_ref: string; // the number the patient knows the booking by
  /** What was taken off the price (coupon, points): the lines add up to the price before it, `total` is after it. */
  @Prop({ default: 0 }) discount: number;
  @Prop() issued_at: Date; // the instant in tag 3 of the QR
}
export const EInvoiceSchema = SchemaFactory.createForClass(EInvoice);

/** The title of a document, in both languages. A receipt is never called a tax invoice. */
export function documentTitle(kind: DocumentKind, refund = false): { ar: string; en: string } {
  if (kind === 'receipt') return refund ? { ar: 'إيصال استرداد', en: 'Refund receipt' } : { ar: 'إيصال دفع', en: 'Payment receipt' };
  return refund ? { ar: 'إشعار دائن', en: 'Credit note' } : { ar: 'فاتورة ضريبية مبسطة', en: 'Simplified tax invoice' };
}

// ── ZATCA TLV QR (Phase 1: tags 1–5) ───────────────────────────────────────
export function tlvQr(sellerName: string, vatNumber: string, isoDate: string, total: number, vat: number): string {
  const tlv = (tag: number, value: string) => {
    const buf = Buffer.from(value, 'utf8');
    return Buffer.concat([Buffer.from([tag, buf.length]), buf]);
  };
  const payload = Buffer.concat([
    tlv(1, sellerName),
    tlv(2, vatNumber),
    tlv(3, isoDate),
    tlv(4, total.toFixed(2)),
    tlv(5, vat.toFixed(2)),
  ]);
  return payload.toString('base64');
}

/** Reads a ZATCA phase-1 QR payload back: { 1: seller, 2: VAT number, 3: ISO time, 4: total incl. VAT, 5: VAT }. */
export function decodeTlv(base64: string): Record<number, string> {
  const buf = Buffer.from(base64, 'base64');
  const out: Record<number, string> = {};
  for (let i = 0; i + 2 <= buf.length;) {
    const tag = buf[i]; const len = buf[i + 1];
    out[tag] = buf.subarray(i + 2, i + 2 + len).toString('utf8');
    i += 2 + len;
  }
  return out;
}

// ── Service ────────────────────────────────────────────────────────────────
@Injectable()
export class BillingService {
  private readonly logger = new Logger('Billing');
  constructor(@InjectConnection() private conn: Connection) {}

  private get invoices() { return this.conn.model('EInvoice'); }

  /** Tax invoices INV-<year>-<n>; receipts have their own series, RCT-<year>-<n>, so a receipt never takes an invoice number. */
  private async nextInvoiceNo(kind: DocumentKind = 'tax_invoice'): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = kind === 'receipt' ? 'RCT' : 'INV';
    const counter = await this.conn.collection('counters').findOneAndUpdate(
      { _id: `${kind === 'receipt' ? 'receipt' : 'invoice'}-${year}` } as any,
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    const seq = (counter as any)?.seq ?? (counter as any)?.value?.seq ?? 1;
    return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
  }

  private bookingModelName(kind: string): string {
    switch (kind) {
      case 'pharmacy': case 'order': return 'Order';
      case 'appointment': case 'consultation': return 'Appointment';
      case 'lab': return 'LabBooking';
      case 'radiology': return 'RadiologyBooking';
      case 'home_care': case 'nursing': return 'HomeCareBooking';
      default: throw new BadRequestException('unsupported booking_kind');
    }
  }

  /** The booking kind as the payments module names it (the transactions are stored under that name). */
  private transactionKind(kind: string): string {
    return ({ order: 'pharmacy', appointment: 'consultation', home_care: 'nursing' } as Record<string, string>)[kind] || kind;
  }

  private async findBooking(kind: string, bookingId: string): Promise<any> {
    const found: any = await this.conn.model(this.bookingModelName(kind)).findOne({ id: bookingId }).lean();
    if (found || this.transactionKind(kind) !== 'pharmacy') return found;
    // governed pharmacy orders (broadcast, offer, selection) live in pharmacy_orders
    return this.conn.collection('pharmacy_orders').findOne({ id: bookingId });
  }

  /** The VAT rate of the finance config (the one the provider settlement uses), 15% when none is set. */
  private async vatRate(): Promise<number> {
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' }).catch(() => null);
    const pct = Number(cfg?.tax?.vat_percent);
    return Number.isFinite(pct) && pct >= 0 && pct <= 50 ? pct / 100 : VAT_RATE;
  }

  /** What the patient actually paid: the settled card payments of the booking, else the cash the provider recorded as collected. 0 = nothing paid. */
  async paidTotal(kind: string, booking: any, bookingId: string): Promise<number> {
    const rows: any[] = await this.conn.collection('transactions').find(
      { booking_kind: this.transactionKind(kind), booking_id: bookingId, status: { $in: ['paid', 'partially_refunded', 'refunded'] } },
      { projection: { amount: 1, _id: 0 } },
    ).toArray();
    let card = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    // an insured booking's co-pay is paid on its insurance request (transactions.booking_kind 'insurance'), never on the booking
    if (!(card > 0)) card = Number((await findCopayTransaction(this.conn as never, booking, bookingId))?.amount || 0);
    const cash = Number(booking?.collection_proof?.amount_collected || 0);
    return Math.round((card > 0 ? card : cash > 0 ? cash : 0) * 100) / 100;
  }

  /**
   * Who sells: `finance_config` document `{ key: 'invoice', seller_name, vat_number, cr_number, address, support_email, support_phone }`,
   * else `ZATCA_SELLER_NAME`, `ZATCA_VAT_NUMBER`, `ZATCA_CR_NUMBER`, `ZATCA_SELLER_ADDRESS`, `INVOICE_SUPPORT_EMAIL`, `INVOICE_SUPPORT_PHONE`.
   * The owner supplies them; nothing is invented, so an empty one stays null. A tax invoice needs the legal name and the VAT number
   * (`configured`, see common/tax-registration.ts); without them the document is a payment receipt. The CR number and the address are shown when set.
   */
  async seller(): Promise<{ name: string | null; vatNumber: string | null; crNumber: string | null; address: string | null; supportEmail: string | null; supportPhone: string | null; configured: boolean }> {
    const c = await readInvoiceConfig(this.conn);
    return { name: c.name, vatNumber: c.vatNumber, crNumber: c.crNumber, address: c.address, supportEmail: c.supportEmail, supportPhone: c.supportPhone, configured: c.taxRegistered };
  }

  /**
   * The provider who delivered the service, from its profile: name (Arabic and English), type, licence number if we hold one.
   * Nothing else of the profile is copied. null when the booking names no provider we can find.
   */
  async providerOf(kind: string, booking: any, bookingId: string): Promise<any | null> {
    const k = this.transactionKind(kind);
    const ids: unknown[] = k === 'consultation' ? [booking?.doctor_id, booking?.doctor_user_id]
      : k === 'nursing' ? [booking?.provider_id, booking?.nurse_id, booking?.provider_account_id]
      : k === 'pharmacy' ? [booking?.pharmacy_account_id, booking?.pharmacy_id, booking?.selected_pharmacy_id, booking?.provider_account_id]
      : [booking?.provider_account_id, booking?.lab_id, booking?.facility_id, booking?.radiology_center_id, booking?.provider_id];
    if (k === 'pharmacy' && !ids.some((v) => typeof v === 'string' && v)) {
      try {
        const alloc: any = await this.conn.collection('pharmacy_allocations').findOne({ order_id: { $eq: bookingId } } as any, { projection: { pharmacy_account_id: 1, _id: 0 } });
        ids.push(alloc?.pharmacy_account_id);
      } catch { /* no allocation store */ }
    }
    const list = ids.filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (!list.length) return null;
    let p: any = null;
    try {
      p = await this.conn.collection('provider_profiles').findOne(
        { $or: [{ id: { $in: list } }, { account_id: { $in: list } }, { user_id: { $in: list } }] } as any,
        { projection: { _id: 0, id: 1, type: 1, name_ar: 1, name_en: 1, display_name_ar: 1, display_name_en: 1, clinic_name: 1, license_number: 1, scfhs_license_number: 1, moh_license_number: 1, sfda_license_number: 1 } },
      );
    } catch { /* no profile store */ }
    if (!p) return null;
    const type = String(p.type || '').toLowerCase();
    const licence = type === 'doctor' ? p.scfhs_license_number || p.moh_license_number || p.license_number
      : type === 'pharmacy' ? p.sfda_license_number || p.moh_license_number || p.license_number
      : p.moh_license_number || p.license_number || p.scfhs_license_number;
    return {
      name_ar: p.display_name_ar || p.name_ar || null, name_en: p.display_name_en || p.name_en || null,
      facility_name: p.clinic_name || null, type: type || null, license_number: licence ? String(licence) : null,
    };
  }

  /** How it was paid: the method and the last 4 digits of the card (the gateway gives a masked number; nothing longer is kept). */
  async paymentInfo(kind: string, booking: any, bookingId: string): Promise<{ method: string; last4: string | null }> {
    const t: any = (await this.conn.collection('transactions').findOne(
      { booking_kind: this.transactionKind(kind), booking_id: bookingId, status: { $in: ['paid', 'partially_refunded', 'refunded'] } },
      { projection: { method: 1, webhook_payload: 1, _id: 0 } },
    )) || (await findCopayTransaction(this.conn as never, booking, bookingId));
    const raw = t?.webhook_payload || {};
    const masked = String(raw?.source?.number ?? raw?.source?.last4 ?? raw?.payment_method_details?.card?.last4 ?? '');
    const last4 = /(\d{4})\D*$/.exec(masked)?.[1] ?? null;
    return { method: String(t?.method || booking?.payment_method || (Number(booking?.collection_proof?.amount_collected) > 0 ? 'cash' : 'card')).toLowerCase(), last4 };
  }

  /** What was bought. Items when the booking has them, else its fee lines; a rounding or discount difference becomes one adjustment line, so the lines add up to the booking price. */
  buildLines(kind: string, booking: any, discount = 0): any[] {
    const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? Math.round(x * 100) / 100 : 0; };
    const lines: any[] = [];
    const items: any[] = Array.isArray(booking?.items) ? booking.items : [];
    for (const it of items.slice(0, 50)) {
      const qty = n(it?.qty ?? it?.quantity) || 1;
      const unit = n(it?.price ?? it?.unit_price);
      lines.push({ key: 'item', name_ar: it?.name_ar ?? it?.name ?? it?.title ?? null, name_en: it?.name_en ?? it?.name ?? it?.title ?? null, qty, unit_price: unit, amount: Math.round(unit * qty * 100) / 100 });
    }
    if (!lines.length && n(booking?.price)) lines.push({ key: this.transactionKind(kind) === 'consultation' ? 'consultation_fee' : 'service', name_ar: null, name_en: null, qty: 1, unit_price: n(booking.price), amount: n(booking.price) });
    const fees: Array<[string, unknown]> = [['platform_fee', booking?.service_fee && this.transactionKind(kind) === 'consultation' ? booking.service_fee : 0], ['home_visit_fee', booking?.home_visit_fee], ['transport_fee', booking?.transportation_fee], ['delivery_fee', booking?.delivery_fee]];
    for (const [key, v] of fees) if (n(v)) lines.push({ key, name_ar: null, name_en: null, qty: 1, unit_price: n(v), amount: n(v) });
    // the booking total is after the discount: the lines add up to the price before it
    const base = n(booking?.total_price) || n(booking?.total) || n(booking?.price);
    const price = base ? base + (discount > 0 ? discount : 0) : 0;
    const sum = Math.round(lines.reduce((a, l) => a + l.amount, 0) * 100) / 100;
    if (price && Math.abs(price - sum) >= 0.01) lines.push({ key: 'adjustment', name_ar: null, name_en: null, qty: 1, unit_price: Math.round((price - sum) * 100) / 100, amount: Math.round((price - sum) * 100) / 100 });
    return lines;
  }

  /** What was taken off the booking's price, from the booking's own fields (coupon, loyalty points, a plain discount). */
  discountOf(booking: any): number {
    const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; };
    return Math.round((n(booking?.coupon_discount) + n(booking?.loyalty_discount) + n(booking?.discount)) * 100) / 100;
  }

  /**
   * A document keeps the kind it was issued with: a receipt is never turned into a tax invoice (no VAT number, no QR, no VAT split is
   * added later). It only picks up the legal name, CR number and address when the owner fills them in after it was issued.
   */
  private async sealIfPossible(doc: any): Promise<any> {
    if (!doc || documentKindOf(doc) !== 'receipt') return doc;
    if (doc.seller_name && doc.seller_cr_number && doc.seller_address) return doc;
    const c = await readInvoiceConfig(this.conn);
    const fill: Record<string, unknown> = {};
    if (!doc.seller_name && c.name) fill.seller_name = c.name;
    if (!doc.seller_cr_number && c.crNumber) fill.seller_cr_number = c.crNumber;
    if (!doc.seller_address && c.address) fill.seller_address = c.address;
    if (!Object.keys(fill).length) return doc;
    await this.invoices.updateOne({ id: doc.id }, { $set: fill });
    return { ...doc, ...fill };
  }

  /**
   * The document as the API returns it. Everything on it was stored from the payment and the booking when it was issued; the client
   * only displays it:
   *   lines, discount, subtotal, vat_rate, vat_amount, total          the amounts (total = lines - discount; VAT is inside the total of a tax invoice;
   *                                                                   on a receipt vat_rate and vat_amount are null and subtotal = total = the amount paid)
   *   payment { method, last4 }                                       from the gateway record, never more than the last 4 digits
   *   insured { insurer, price, insurer_share, patient_share }        when an insurer paid part (total = the patient's share)
   *   document_kind, title { ar, en }                                 tax_invoice | receipt, fixed when the document was issued
   *   seller { legal_name, vat_number, configured }                   from config; vat_number null and configured:false for a receipt
   *   qr { format, payload } and pdf_url                              the ZATCA phase-1 TLV (null on a receipt, which has no VAT) and the PDF
   *   state, refunded_total, credit_notes                             paid | partially_refunded | refunded, with the credit notes that reverse it
   */
  async present(inv: any): Promise<any> {
    if (!inv) return inv;
    const doc = await this.sealIfPossible(inv);
    const notes: any[] = doc.type === 'credit_note' ? [] : await this.invoices.find({ type: 'credit_note', original_invoice_no: doc.invoice_no }, { _id: 0, __v: 0 }).lean();
    return this.shape(doc, notes, await this.footer());
  }

  /** `present` for a list: one query for the credit notes of all of them. */
  async presentMany(rows: any[]): Promise<any[]> {
    const sealed = await Promise.all(rows.map((r) => this.sealIfPossible(r)));
    const nos = sealed.filter((r) => r.type !== 'credit_note').map((r) => r.invoice_no);
    const notes: any[] = nos.length ? await this.invoices.find({ type: 'credit_note', original_invoice_no: { $in: nos } }, { _id: 0, __v: 0 }).lean() : [];
    const footer = await this.footer();
    return sealed.map((r) => this.shape(r, notes.filter((n) => n.original_invoice_no === r.invoice_no), footer));
  }

  /** The footer of every document: how to reach support and where the refund policy is. Only what is configured; nothing invented. */
  async footer(): Promise<{ support_email: string | null; support_phone: string | null; refund_policy_url: { ar: string; en: string } }> {
    const seller = await this.seller();
    const base = String(process.env.NABD_PUBLIC_URL || 'https://nabd.plus').replace(/\/+$/, '');
    return { support_email: seller.supportEmail, support_phone: seller.supportPhone, refund_policy_url: { ar: `${base}/ar/refund-policy`, en: `${base}/en/refund-policy` } };
  }

  private shape(doc: any, notes: any[], footer: Awaited<ReturnType<BillingService['footer']>>): any {
    const money = (v: unknown) => Math.round(Number(v) * 100) / 100;
    const refunded = money(notes.reduce((sum, n) => sum + Math.abs(Number(n.total) || 0), 0));
    const state = doc.type === 'credit_note' ? 'credit_note' : !notes.length ? 'paid' : refunded >= money(doc.total) - 0.001 ? 'refunded' : 'partially_refunded';
    const ins = doc.insured;
    const kind = documentKindOf(doc);
    const receipt = kind === 'receipt';
    return {
      ...doc,
      document_kind: kind,
      title: documentTitle(kind, doc.type === 'credit_note'),
      vat_rate: receipt ? null : doc.vat_rate,
      vat_amount: receipt ? null : doc.vat_amount,
      subtotal: receipt ? doc.total : doc.subtotal,
      insured: ins ? { ...ins, insurer_share: ins.covered, patient_share: ins.copay } : null,
      seller: { legal_name: doc.seller_name ?? null, vat_number: doc.vat_number ?? null, cr_number: doc.seller_cr_number ?? null, address: doc.seller_address ?? null, configured: !receipt },
      provider: doc.provider ?? null,
      patient_name: doc.patient_name ?? null,
      booking_ref: doc.booking_ref ?? null,
      qr: doc.qr_base64 ? { format: 'zatca-phase1-tlv-base64', payload: doc.qr_base64 } : null,
      footer,
      pdf_url: `/billing/documents/${doc.invoice_no}/pdf`,
      state,
      refunded_total: doc.type === 'credit_note' ? 0 : refunded,
      credit_notes: notes.map((n) => ({ invoice_no: n.invoice_no, total: n.total, vat_amount: documentKindOf(n) === 'receipt' ? null : n.vat_amount, issued_at: n.issued_at ?? n.createdAt ?? null })),
    };
  }

  /**
   * Issue (or return the existing) e-invoice of a PAID booking. The invoice total is what was charged (the card payment or the
   * cash collected, so an insured booking is invoiced at the co-pay, not at its price), VAT is taken out of it at the configured rate.
   * `user` null = the system, on `payment.completed`.
   */
  async issue(user: any | null, kind: string, bookingId: string) {
    const existing: any = await this.invoices.findOne({ booking_kind: kind, booking_id: bookingId, status: 'ISSUED', type: { $ne: 'credit_note' } }, { _id: 0, __v: 0 }).lean();
    if (existing) {
      if (user && existing.patient_id !== user.id && user.role !== 'admin') throw new BadRequestException('not your booking');
      return this.sealIfPossible(existing);
    }

    const booking: any = await this.findBooking(kind, bookingId);
    if (!booking) throw new NotFoundException('booking not found');
    const owner = booking.patient_id || booking.patient_account_id || booking.user_id;
    if (user && owner !== user.id && booking.user_id !== user.id && user.role !== 'admin') throw new BadRequestException('not your booking');

    const total = await this.paidTotal(kind, booking, bookingId);
    if (!(total > 0)) throw new BadRequestException('booking_not_paid');
    // ONE switch (common/tax-registration.ts): a VAT number on file = a tax invoice (VAT taken out of the total, ZATCA QR); none = a
    // payment receipt for exactly what was paid (no VAT line, no rate, no QR). The kind is stored and never changes afterwards.
    const seller = await this.seller();
    const documentKind: DocumentKind = seller.configured ? 'tax_invoice' : 'receipt';
    const rate = documentKind === 'tax_invoice' ? await this.vatRate() : 0;
    const vat = rate > 0 ? Math.round((total - total / (1 + rate)) * 100) / 100 : 0; // VAT-inclusive extraction
    const subtotal = Math.round((total - vat) * 100) / 100;
    const issuedAt = new Date();
    const qr = documentKind === 'tax_invoice' ? tlvQr(seller.name as string, seller.vatNumber as string, issuedAt.toISOString(), total, vat) : null;

    const discount = this.discountOf(booking);
    const lines = this.buildLines(kind, booking, discount);
    const bookingPrice = Math.round(Number(booking?.total_price ?? booking?.total ?? booking?.price ?? 0) * 100) / 100;
    const insured = String(booking?.payment_method || '').toLowerCase() === 'insurance' || Number(booking?.insurance_copay) > 0
      ? { insurer: booking?.insurance_provider ?? booking?.insurance?.provider ?? null, price: bookingPrice, covered: Math.max(0, Math.round((bookingPrice - total) * 100) / 100), copay: total }
      : null;
    const payment = await this.paymentInfo(kind, booking, bookingId);
    const provider = await this.providerOf(kind, booking, bookingId);
    const patientName = String(booking?.patient_name || '').trim() || null;
    const bookingRef = String(booking?.tracking_id || booking?.order_number || booking?.reference || bookingId.slice(0, 8));

    try {
      const doc = await this.invoices.create({
        invoice_no: await this.nextInvoiceNo(documentKind),
        type: 'invoice', document_kind: documentKind,
        booking_kind: kind,
        booking_id: bookingId,
        patient_id: owner,
        subtotal, vat_rate: rate, vat_amount: vat, total,
        qr_base64: qr, lines, payment, insured, discount, provider, patient_name: patientName, booking_ref: bookingRef,
        seller_name: seller.name, vat_number: seller.vatNumber, seller_cr_number: seller.crNumber, seller_address: seller.address, seller_complete: documentKind === 'tax_invoice', issued_at: issuedAt,
      });
      return await this.invoices.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
    } catch (e: any) {
      // two writers (the payment event and the patient's request) can race: the one that lost reads the winner's invoice
      const again = await this.invoices.findOne({ booking_kind: kind, booking_id: bookingId, status: 'ISSUED', type: { $ne: 'credit_note' } }, { _id: 0, __v: 0 }).lean();
      if (again) return again;
      throw e;
    }
  }

  /**
   * A refund to the card reverses the invoice: a credit note, which is a negative invoice that names the original. One per refund
   * (`refund_ref`), so a repeated event changes nothing. A refund of a booking that was never invoiced issues nothing.
   */
  @OnEvent('payment.refund.card')
  async issueCreditNote(e: { booking_kind?: string; booking_id?: string; amount?: number; refund_ref?: string }) {
    const amount = Math.round(Number(e?.amount) * 100) / 100;
    if (!(amount > 0) || !e?.refund_ref) return null;
    const target = await this.resolveBooking(e?.booking_kind, e?.booking_id);
    if (!target) return null;
    const kind = target.kind;
    e = { ...e, booking_id: target.id };
    try {
      const done: any = await this.invoices.findOne({ refund_ref: e.refund_ref }, { _id: 0, __v: 0 }).lean();
      if (done) return done;
      const original: any = await this.invoices.findOne({ booking_kind: kind, booking_id: e.booking_id, status: 'ISSUED', type: { $ne: 'credit_note' } }).lean();
      if (!original) return null;
      const capped = Math.min(amount, Math.round(Number(original.total) * 100) / 100);
      // a refund document has the kind of the document it reverses: a tax invoice gets a credit note (negative VAT, QR), a receipt a refund receipt
      const docKind = documentKindOf(original);
      const rate = docKind === 'tax_invoice' ? Number(original.vat_rate) || VAT_RATE : 0;
      const vat = rate > 0 ? -Math.round((capped - capped / (1 + rate)) * 100) / 100 : 0;
      const total = -capped;
      const issuedAt = new Date();
      const cfgSeller = original.seller_name && (docKind === 'receipt' || original.vat_number) ? null : await this.seller();
      const seller = { name: original.seller_name || cfgSeller?.name || null, vatNumber: docKind === 'tax_invoice' ? original.vat_number || cfgSeller?.vatNumber || null : null };
      const year = issuedAt.getFullYear();
      const counter: any = await this.conn.collection('counters').findOneAndUpdate({ _id: `${docKind === 'receipt' ? 'refundreceipt' : 'creditnote'}-${year}` } as any, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
      const seq = counter?.seq ?? counter?.value?.seq ?? 1;
      const doc = await this.invoices.create({
        invoice_no: `${docKind === 'receipt' ? 'RRC' : 'CN'}-${year}-${String(seq).padStart(6, '0')}`,
        type: 'credit_note', document_kind: docKind, original_invoice_no: original.invoice_no, refund_ref: e.refund_ref,
        booking_kind: kind, booking_id: e.booking_id, patient_id: original.patient_id,
        subtotal: Math.round((total - vat) * 100) / 100, vat_rate: rate, vat_amount: vat, total,
        qr_base64: docKind === 'tax_invoice' && seller.name && seller.vatNumber ? tlvQr(seller.name, seller.vatNumber, issuedAt.toISOString(), total, vat) : null,
        lines: [{ key: 'refund', name_ar: null, name_en: null, qty: 1, unit_price: total, amount: total }],
        payment: original.payment ?? null, insured: null,
        provider: original.provider ?? null, booking_ref: original.booking_ref, seller_cr_number: original.seller_cr_number ?? null, seller_address: original.seller_address ?? null,
        seller_name: seller.name, vat_number: seller.vatNumber, seller_complete: docKind === 'tax_invoice', issued_at: issuedAt,
      });
      return await this.invoices.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
    } catch (err: any) {
      this.logger.warn(`credit note not issued for ${kind} ${e.booking_id}: ${err?.message}`);
      return null;
    }
  }

  /** A paid booking gets its invoice at once, so it is there when the patient opens the receipt. Never fails the payment. */
  /** A co-pay is paid on the insurance request: the invoice and the credit note belong to the booking that request is for. */
  private async resolveBooking(kindRaw: unknown, idRaw: unknown): Promise<{ kind: string; id: string } | null> {
    const kind = String(kindRaw || '');
    const id = String(idRaw || '');
    if (!kind || !id) return null;
    if (kind !== 'insurance') return { kind, id };
    try {
      const req: any = await this.conn.collection('insuranceservicerequests').findOne({ id: { $eq: id } } as any, { projection: { booking_id: 1, booking_kind: 1, _id: 0 } });
      return req?.booking_id && req?.booking_kind ? { kind: String(req.booking_kind), id: String(req.booking_id) } : null;
    } catch { return null; }
  }

  @OnEvent('payment.completed')
  async issueOnPayment(raw: { booking_kind?: string; booking_id?: string }) {
    const target = await this.resolveBooking(raw?.booking_kind, raw?.booking_id);
    if (!target) return;
    const event = { booking_kind: target.kind, booking_id: target.id };
    const kind = target.kind;
    try { this.bookingModelName(kind); } catch { return; } // kinds without an invoice (insurance, diagnostics parent) are skipped
    try { await this.issue(null, kind, event.booking_id); } catch (e: any) { this.logger.warn(`invoice not issued for ${kind} ${event.booking_id}: ${e?.message}`); }
  }

  myInvoices(user: any) {
    return this.invoices.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean().then((rows: any[]) => this.presentMany(rows));
  }

  adminList(limit = 100) {
    return this.invoices.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(Math.min(limit, 500)).lean().then((rows: any[]) => this.presentMany(rows));
  }

  /** E1 S17: patient invoice PDF with embedded ZATCA QR image. */
  async invoicePdf(user: any, kind: string, bookingId: string): Promise<Buffer> {
    return this.renderPdf(await this.issue(user, kind, bookingId));
  }

  /** One stored document by its number (no ownership check: the caller has proved the right to it, e.g. with a share-link token). */
  async invoiceByNumber(invoiceNo: string): Promise<any | null> {
    if (typeof invoiceNo !== 'string' || !invoiceNo) return null;
    return this.invoices.findOne({ invoice_no: { $eq: invoiceNo } }, { _id: 0, __v: 0 }).lean();
  }

  /** The PDF of one stored document (an invoice or a credit note) for its patient or an admin. */
  async documentPdf(user: any, invoiceNo: string): Promise<Buffer> {
    if (typeof invoiceNo !== 'string' || !invoiceNo) throw new NotFoundException('document not found');
    const inv: any = await this.invoices.findOne({ invoice_no: { $eq: invoiceNo } }, { _id: 0, __v: 0 }).lean();
    if (!inv || (inv.patient_id !== user.id && user.role !== 'admin')) throw new NotFoundException('document not found');
    return this.renderPdf(inv);
  }

  /** The PDF (invoice-pdf.ts) is drawn from the presented document, with the QR it carries: the picture and the API payload are one value. */
  async renderPdf(stored: any): Promise<Buffer> {
    const inv: any = stored?.state ? stored : await this.present(stored); // sealed, with its state, credit notes and footer
    let qrPng: Buffer | null = null;
    if (inv.qr?.payload) {
      try { qrPng = await require('qrcode').toBuffer(inv.qr.payload, { type: 'png', width: 220, margin: 1 }); } catch { qrPng = null; }
    }
    return renderInvoicePdf({ inv, qrPng });
  }

  /** E1 S17: email the invoice to the patient (Resend primary, SES fallback). */
  async emailInvoice(user: any, kind: string, bookingId: string, mail: MailService) {
    const inv: any = await this.issue(user, kind, bookingId);
    const u: any = await this.conn.collection('users').findOne({ id: inv.patient_id } as any);
    const email = u?.email;
    if (!email) throw new BadRequestException('no_email_on_profile');
    const receipt = documentKindOf(inv) === 'receipt';
    const html = receipt ? `
      <div dir="rtl" style="font-family:Arial">
        <h2>إيصال الدفع من نبض</h2>
        <p>رقم الإيصال: <b>${inv.invoice_no}</b></p>
        <p>المبلغ المدفوع: <b>${Number(inv.total).toFixed(2)} ر.س</b></p>
        <p>يمكنك تحميل الإيصال PDF من التطبيق.</p>
      </div>` : `
      <div dir="rtl" style="font-family:Arial">
        <h2>فاتورتك من نبض</h2>
        <p>رقم الفاتورة: <b>${inv.invoice_no}</b></p>
        <p>الإجمالي (شامل الضريبة): <b>${Number(inv.total).toFixed(2)} ر.س</b></p>
        <p>الضريبة (${Math.round((Number(inv.vat_rate) || VAT_RATE) * 100)}%): ${Number(inv.vat_amount).toFixed(2)} ر.س</p>
        <p>يمكنك تحميل الفاتورة PDF من التطبيق.</p>
      </div>`;
    await mail.send(email, receipt ? `إيصال نبض ${inv.invoice_no}` : `فاتورة نبض ${inv.invoice_no}`, html, receipt ? `Payment receipt ${inv.invoice_no} — paid ${inv.total} SAR` : `Invoice ${inv.invoice_no} — total ${inv.total} SAR`);
    return { ok: true, emailed_to: email.replace(/(.{2}).*(@.*)/, '$1***$2') };
  }
}

// ── Share links ───────────────────────────────────────────────────────────
const SHARE_DEFAULT_DAYS = 7;
const SHARE_CREATE_PER_HOUR = 10; // per patient
const SHARE_ACTIVE_PER_INVOICE = 20;
let shareIndexes: Promise<unknown> | null = null;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/**
 * A read-only, expiring, revocable link to ONE invoice. The token is 32 random bytes shown once, in the URL; only its SHA-256 is
 * stored, so a database read cannot rebuild a link. A link that is unknown, expired or revoked answers the same 404. Every view
 * is logged (`invoice_share_views`: time, which link, page or PDF, a hash of the address, the browser string), and what it shows is
 * the invoice and nothing else of the account: no patient id, no patient name, no internal booking id.
 */
@Injectable()
export class InvoiceShareService {
  constructor(@InjectConnection() private readonly conn: Connection, private readonly billing: BillingService) {}

  private get links() { return this.conn.collection('invoice_share_links'); }
  private get views() { return this.conn.collection('invoice_share_views'); }

  private ensureIndexes() {
    shareIndexes ??= Promise.all([
      this.links.createIndex({ token_hash: 1 }, { unique: true, name: 'share_token_hash' }),
      this.links.createIndex({ invoice_no: 1, created_at: -1 }, { name: 'share_invoice' }),
      this.links.createIndex({ created_by: 1, created_at: -1 }, { name: 'share_creator' }),
      this.views.createIndex({ link_id: 1, viewed_at: -1 }, { name: 'share_views_link' }),
    ]).catch(() => null);
    return shareIndexes;
  }

  private status(link: any, now = new Date()): 'active' | 'expired' | 'revoked' {
    if (link.revoked_at) return 'revoked';
    return new Date(link.expires_at).getTime() <= now.getTime() ? 'expired' : 'active';
  }

  /** Makes a link for the invoice of a booking the user owns. The token is returned once, inside `url` and `token`. */
  async create(user: any, kind: string, bookingId: string, body: { expires_in_days?: number } = {}) {
    const invoice: any = await this.billing.issue(user, kind, bookingId); // the owner check and the paid check are the invoice's
    if (invoice.type === 'credit_note') throw new BadRequestException('not_an_invoice');
    await this.ensureIndexes();
    const now = new Date();
    const recent = await this.links.countDocuments({ created_by: user.id, created_at: { $gte: new Date(now.getTime() - 3600_000) } } as any);
    if (recent >= SHARE_CREATE_PER_HOUR) throw new HttpException('share_link_rate_limited', HttpStatus.TOO_MANY_REQUESTS);
    const active = await this.links.countDocuments({ invoice_no: invoice.invoice_no, revoked_at: null, expires_at: { $gt: now } } as any);
    if (active >= SHARE_ACTIVE_PER_INVOICE) throw new HttpException('too_many_active_share_links', HttpStatus.TOO_MANY_REQUESTS);
    const days = body.expires_in_days === undefined ? SHARE_DEFAULT_DAYS : Number(body.expires_in_days);
    if (!Number.isInteger(days) || days < 1 || days > 30) throw new BadRequestException('expires_in_days_invalid');
    const token = randomBytes(32).toString('base64url');
    const link = { id: randomUUID(), token_hash: sha256(token), invoice_no: invoice.invoice_no, patient_id: invoice.patient_id, created_by: user.id, created_at: now, expires_at: new Date(now.getTime() + days * 86400_000), revoked_at: null, view_count: 0, last_viewed_at: null };
    await this.links.insertOne(link as any);
    const base = String(process.env.API_BASE_URL || '').replace(/\/+$/, '');
    const path = `/billing/shared/${token}`;
    return {
      id: link.id, token, expires_at: link.expires_at, invoice_no: invoice.invoice_no,
      path, pdf_path: `${path}/pdf`,
      url: base ? `${base}/api/v1${path}/pdf` : null, // opens the PDF; the JSON of the same invoice is `page_url`
      page_url: base ? `${base}/api/v1${path}` : null,
    };
  }

  /** The links of an invoice the user owns, without their tokens. */
  async list(user: any, kind: string, bookingId: string) {
    const invoice: any = await this.billing.issue(user, kind, bookingId);
    const rows: any[] = await this.links.find({ invoice_no: invoice.invoice_no } as any).sort({ created_at: -1 }).limit(100).toArray();
    return rows.map((l) => ({ id: l.id, created_at: l.created_at, expires_at: l.expires_at, revoked_at: l.revoked_at ?? null, view_count: l.view_count ?? 0, last_viewed_at: l.last_viewed_at ?? null, status: this.status(l) }));
  }

  /** Revokes one link; repeating it changes nothing. */
  async revoke(user: any, kind: string, bookingId: string, linkId: string) {
    const invoice: any = await this.billing.issue(user, kind, bookingId);
    if (typeof linkId !== 'string' || !linkId) throw new NotFoundException('link_not_found');
    const link: any = await this.links.findOne({ id: { $eq: linkId }, invoice_no: invoice.invoice_no } as any);
    if (!link) throw new NotFoundException('link_not_found');
    if (!link.revoked_at) await this.links.updateOne({ id: link.id } as any, { $set: { revoked_at: new Date() } });
    return { id: link.id, status: 'revoked' };
  }

  /** The link behind a token, logged as viewed. One 404 for every reason it cannot be used. */
  private async open(token: string, kind: 'page' | 'pdf', ctx: { ip?: string; userAgent?: string }) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) throw new NotFoundException('link_not_found');
    const link: any = await this.links.findOne({ token_hash: sha256(token) } as any);
    if (!link || this.status(link) !== 'active') throw new NotFoundException('link_not_found');
    const now = new Date();
    await this.views.insertOne({ id: randomUUID(), link_id: link.id, invoice_no: link.invoice_no, kind, viewed_at: now, ip_hash: ctx.ip ? sha256(`${process.env.INVOICE_SHARE_LOG_SALT || 'nabd-invoice-share'}:${ctx.ip}`).slice(0, 24) : null, user_agent: String(ctx.userAgent || '').slice(0, 160) } as any);
    await this.links.updateOne({ id: link.id } as any, { $inc: { view_count: 1 }, $set: { last_viewed_at: now } });
    return link;
  }

  /** The invoice as the link shows it: the receipt, not the account. */
  private async shared(link: any) {
    const inv: any = await this.billing.invoiceByNumber(link.invoice_no);
    if (!inv) throw new NotFoundException('link_not_found');
    const presented = await this.billing.present(inv);
    const keep = ['invoice_no', 'type', 'document_kind', 'title', 'original_invoice_no', 'issued_at', 'currency', 'lines', 'discount', 'subtotal', 'vat_rate', 'vat_amount', 'total', 'payment', 'insured', 'seller', 'provider', 'state', 'refunded_total', 'credit_notes', 'qr', 'footer'];
    const out: Record<string, unknown> = {};
    for (const k of keep) out[k] = presented[k];
    out.booking_ref = presented.booking_ref || String(presented.booking_id || '').slice(0, 8);
    out.shared = { expires_at: link.expires_at, read_only: true };
    return out;
  }

  async viewPage(token: string, ctx: { ip?: string; userAgent?: string }) {
    return this.shared(await this.open(token, 'page', ctx));
  }

  async viewPdf(token: string, ctx: { ip?: string; userAgent?: string }) {
    const link = await this.open(token, 'pdf', ctx);
    return { pdf: await this.billing.renderPdf(await this.shared(link)), invoice_no: link.invoice_no };
  }
}

// ── Controller ─────────────────────────────────────────────────────────────
@Controller('billing')
@SelfService()
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private svc: BillingService, private mail: MailService, private share: InvoiceShareService) {}

  /** Issue/retrieve the e-invoice for a paid booking (patient or admin). */
  @Get('invoice/:kind/:bookingId')
  async invoice(@CurrentUser() user: any, @Param('kind') kind: string, @Param('bookingId') bookingId: string) {
    return this.svc.present(await this.svc.issue(user, kind, bookingId));
  }

  /** The PDF of one document (invoice or credit note) by its number. */
  @Get('documents/:invoiceNo/pdf')
  async documentPdf(@CurrentUser() user: any, @Param('invoiceNo') invoiceNo: string, @Res({ passthrough: true }) res: any) {
    const pdf = await this.svc.documentPdf(user, invoiceNo);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${invoiceNo.replace(/[^A-Za-z0-9-]/g, '')}.pdf"` });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(pdf));
  }

  /** E1 S17: download the invoice as PDF (with ZATCA QR image). */
  @Get('invoice/:kind/:bookingId/pdf')
  async invoicePdf(@CurrentUser() user: any, @Param('kind') kind: string, @Param('bookingId') bookingId: string, @Res({ passthrough: true }) res: any) {
    const pdf = await this.svc.invoicePdf(user, kind, bookingId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${bookingId.slice(0, 8)}.pdf"` });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(pdf));
  }

  /** A read-only link to this invoice: random token, expires (7 days by default), revocable, every view logged. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('invoice/:kind/:bookingId/share-link')
  createShareLink(@CurrentUser() user: any, @Param('kind') kind: string, @Param('bookingId') bookingId: string, @Body() body: ShareLinkDto) {
    return this.share.create(user, kind, bookingId, body);
  }

  @Get('invoice/:kind/:bookingId/share-links')
  listShareLinks(@CurrentUser() user: any, @Param('kind') kind: string, @Param('bookingId') bookingId: string) {
    return this.share.list(user, kind, bookingId);
  }

  @Delete('invoice/:kind/:bookingId/share-links/:linkId')
  revokeShareLink(@CurrentUser() user: any, @Param('kind') kind: string, @Param('bookingId') bookingId: string, @Param('linkId') linkId: string) {
    return this.share.revoke(user, kind, bookingId, linkId);
  }

  /** E1 S17: email the invoice to the patient. */
  @Post('invoice/:kind/:bookingId/email')
  emailInvoice(@CurrentUser() user: any, @Param('kind') kind: string, @Param('bookingId') bookingId: string) {
    return this.svc.emailInvoice(user, kind, bookingId, this.mail);
  }

  @Get('my')
  my(@CurrentUser() user: any) {
    return this.svc.myInvoices(user);
  }

  /** Admin: list recent invoices. */
  @Get('admin/list')
  @Roles(UserRole.ADMIN)
  adminInvoices(@Query('limit') limit?: string) {
    return this.svc.adminList(Number(limit) || 100);
  }
}


/** What a share link opens: no login, the invoice only. */
@Controller('billing/shared')
export class BillingSharedController {
  constructor(private readonly share: InvoiceShareService) {}

  private static headers(res: any) {
    res.set({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
  }
  private static ctx(req: any) {
    return { ip: String(req?.headers?.['x-forwarded-for'] || req?.ip || '').split(',')[0].trim(), userAgent: String(req?.headers?.['user-agent'] || '') };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':token')
  async page(@Param('token') token: string, @Req() req: any, @Res({ passthrough: true }) res: any) {
    BillingSharedController.headers(res);
    return this.share.viewPage(token, BillingSharedController.ctx(req));
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':token/pdf')
  async pdf(@Param('token') token: string, @Req() req: any, @Res({ passthrough: true }) res: any) {
    BillingSharedController.headers(res);
    const { pdf, invoice_no } = await this.share.viewPdf(token, BillingSharedController.ctx(req));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${String(invoice_no).replace(/[^A-Za-z0-9-]/g, '')}.pdf"` });
    const { Readable } = require('stream');
    return new StreamableFile(Readable.from(pdf));
  }
}

@Module({
  imports: [MailModule, MongooseModule.forFeature([{ name: 'EInvoice', schema: EInvoiceSchema }])],
  controllers: [BillingController, BillingSharedController],
  providers: [BillingService, InvoiceShareService],
})
export class BillingModule {}
