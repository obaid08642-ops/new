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
  BadRequestException, Controller, Get, Post, Module, Param, Query,
  NotFoundException, Injectable, UseGuards, Res, StreamableFile, Logger,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import * as PDFDocument from 'pdfkit';
import { JwtAuthGuard, Roles, SelfService, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { MailModule, MailService } from '../mail/mail.module';

const VAT_RATE = 0.15;

// ── Schema ─────────────────────────────────────────────────────────────────
@Schema({ timestamps: true })
export class EInvoice {
  @Prop({ default: () => randomUUID() }) id: string;
  @Prop({ unique: true, index: true }) invoice_no: string; // INV-2026-000001
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
  @Prop() issued_at: Date; // the instant in tag 3 of the QR
}
export const EInvoiceSchema = SchemaFactory.createForClass(EInvoice);

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

  private async nextInvoiceNo(): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await this.conn.collection('counters').findOneAndUpdate(
      { _id: `invoice-${year}` } as any,
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    const seq = (counter as any)?.seq ?? (counter as any)?.value?.seq ?? 1;
    return `INV-${year}-${String(seq).padStart(6, '0')}`;
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
    const card = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const cash = Number(booking?.collection_proof?.amount_collected || 0);
    return Math.round((card > 0 ? card : cash > 0 ? cash : 0) * 100) / 100;
  }

  /** Who sells: the finance config (`finance_config` key `invoice`: seller_name, vat_number) else the environment. */
  async seller(): Promise<{ name: string; vatNumber: string | null }> {
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'invoice' }).catch(() => null);
    const name = String(cfg?.seller_name || process.env.ZATCA_SELLER_NAME || 'منصة نَبْض للرعاية الصحية');
    const vatNumber = String(cfg?.vat_number || process.env.ZATCA_VAT_NUMBER || '')
      || (process.env.NODE_ENV === 'production' ? '' : '300000000000003'); // sandbox number, non-prod only
    return { name, vatNumber: vatNumber || null };
  }

  /** How it was paid: the method and the last 4 digits of the card (the gateway gives a masked number; nothing longer is kept). */
  async paymentInfo(kind: string, booking: any, bookingId: string): Promise<{ method: string; last4: string | null }> {
    const t: any = await this.conn.collection('transactions').findOne(
      { booking_kind: this.transactionKind(kind), booking_id: bookingId, status: { $in: ['paid', 'partially_refunded', 'refunded'] } },
      { projection: { method: 1, webhook_payload: 1, _id: 0 } },
    );
    const raw = t?.webhook_payload || {};
    const masked = String(raw?.source?.number ?? raw?.source?.last4 ?? raw?.payment_method_details?.card?.last4 ?? '');
    const last4 = /(\d{4})\D*$/.exec(masked)?.[1] ?? null;
    return { method: String(t?.method || booking?.payment_method || (Number(booking?.collection_proof?.amount_collected) > 0 ? 'cash' : 'card')).toLowerCase(), last4 };
  }

  /** What was bought. Items when the booking has them, else its fee lines; a rounding or discount difference becomes one adjustment line, so the lines add up to the booking price. */
  buildLines(kind: string, booking: any): any[] {
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
    const price = n(booking?.total_price) || n(booking?.total) || n(booking?.price);
    const sum = Math.round(lines.reduce((a, l) => a + l.amount, 0) * 100) / 100;
    if (price && Math.abs(price - sum) >= 0.01) lines.push({ key: 'adjustment', name_ar: null, name_en: null, qty: 1, unit_price: Math.round((price - sum) * 100) / 100, amount: Math.round((price - sum) * 100) / 100 });
    return lines;
  }

  /** The invoice as the API returns it: the document, the link to its PDF, and the QR payload (also `qr_base64`). */
  present(inv: any): any {
    if (!inv) return inv;
    const doc = inv.invoice_no;
    return { ...inv, qr: { format: 'zatca-phase1-tlv-base64', payload: inv.qr_base64 }, pdf_url: `/billing/documents/${doc}/pdf` };
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
      return existing;
    }

    const booking: any = await this.findBooking(kind, bookingId);
    if (!booking) throw new NotFoundException('booking not found');
    const owner = booking.patient_id || booking.patient_account_id || booking.user_id;
    if (user && owner !== user.id && booking.user_id !== user.id && user.role !== 'admin') throw new BadRequestException('not your booking');

    const total = await this.paidTotal(kind, booking, bookingId);
    if (!(total > 0)) throw new BadRequestException('booking_not_paid');
    const rate = await this.vatRate();
    const vat = Math.round((total - total / (1 + rate)) * 100) / 100; // VAT-inclusive extraction
    const subtotal = Math.round((total - vat) * 100) / 100;

    const seller = await this.seller();
    if (!seller.vatNumber) throw new BadRequestException('ZATCA_VAT_NUMBER is not configured — cannot issue compliant invoices');
    const issuedAt = new Date();
    const qr = tlvQr(seller.name, seller.vatNumber, issuedAt.toISOString(), total, vat);

    const lines = this.buildLines(kind, booking);
    const bookingPrice = Math.round(Number(booking?.total_price ?? booking?.total ?? booking?.price ?? 0) * 100) / 100;
    const insured = String(booking?.payment_method || '').toLowerCase() === 'insurance' || Number(booking?.insurance_copay) > 0
      ? { insurer: booking?.insurance_provider ?? booking?.insurance?.provider ?? null, price: bookingPrice, covered: Math.max(0, Math.round((bookingPrice - total) * 100) / 100), copay: total }
      : null;
    const payment = await this.paymentInfo(kind, booking, bookingId);

    try {
      const doc = await this.invoices.create({
        invoice_no: await this.nextInvoiceNo(),
        type: 'invoice',
        booking_kind: kind,
        booking_id: bookingId,
        patient_id: owner,
        subtotal, vat_rate: rate, vat_amount: vat, total,
        qr_base64: qr, lines, payment, insured,
        seller_name: seller.name, vat_number: seller.vatNumber, issued_at: issuedAt,
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
    const kind = String(e?.booking_kind || '');
    const amount = Math.round(Number(e?.amount) * 100) / 100;
    if (!kind || !e?.booking_id || !(amount > 0) || !e?.refund_ref) return null;
    try {
      const done: any = await this.invoices.findOne({ refund_ref: e.refund_ref }, { _id: 0, __v: 0 }).lean();
      if (done) return done;
      const original: any = await this.invoices.findOne({ booking_kind: kind, booking_id: e.booking_id, status: 'ISSUED', type: { $ne: 'credit_note' } }).lean();
      if (!original) return null;
      const capped = Math.min(amount, Math.round(Number(original.total) * 100) / 100);
      const rate = Number(original.vat_rate) || VAT_RATE;
      const vat = -Math.round((capped - capped / (1 + rate)) * 100) / 100;
      const total = -capped;
      const issuedAt = new Date();
      const seller = { name: original.seller_name || (await this.seller()).name, vatNumber: original.vat_number || (await this.seller()).vatNumber };
      if (!seller.vatNumber) return null;
      const year = issuedAt.getFullYear();
      const counter: any = await this.conn.collection('counters').findOneAndUpdate({ _id: `creditnote-${year}` } as any, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
      const seq = counter?.seq ?? counter?.value?.seq ?? 1;
      const doc = await this.invoices.create({
        invoice_no: `CN-${year}-${String(seq).padStart(6, '0')}`,
        type: 'credit_note', original_invoice_no: original.invoice_no, refund_ref: e.refund_ref,
        booking_kind: kind, booking_id: e.booking_id, patient_id: original.patient_id,
        subtotal: Math.round((total - vat) * 100) / 100, vat_rate: rate, vat_amount: vat, total,
        qr_base64: tlvQr(seller.name, seller.vatNumber, issuedAt.toISOString(), total, vat),
        lines: [{ key: 'refund', name_ar: null, name_en: null, qty: 1, unit_price: total, amount: total }],
        payment: original.payment ?? null, insured: null,
        seller_name: seller.name, vat_number: seller.vatNumber, issued_at: issuedAt,
      });
      return await this.invoices.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
    } catch (err: any) {
      this.logger.warn(`credit note not issued for ${kind} ${e.booking_id}: ${err?.message}`);
      return null;
    }
  }

  /** A paid booking gets its invoice at once, so it is there when the patient opens the receipt. Never fails the payment. */
  @OnEvent('payment.completed')
  async issueOnPayment(event: { booking_kind?: string; booking_id?: string }) {
    const kind = String(event?.booking_kind || '');
    if (!kind || !event?.booking_id) return;
    try { this.bookingModelName(kind); } catch { return; } // kinds without an invoice (insurance, diagnostics parent) are skipped
    try { await this.issue(null, kind, event.booking_id); } catch (e: any) { this.logger.warn(`invoice not issued for ${kind} ${event.booking_id}: ${e?.message}`); }
  }

  myInvoices(user: any) {
    return this.invoices.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean().then((rows: any[]) => rows.map((r) => this.present(r)));
  }

  adminList(limit = 100) {
    return this.invoices.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(Math.min(limit, 500)).lean().then((rows: any[]) => rows.map((r) => this.present(r)));
  }

  /** E1 S17: patient invoice PDF with embedded ZATCA QR image. */
  async invoicePdf(user: any, kind: string, bookingId: string): Promise<Buffer> {
    return this.renderPdf(await this.issue(user, kind, bookingId));
  }

  /** The PDF of one stored document (an invoice or a credit note) for its patient or an admin. */
  async documentPdf(user: any, invoiceNo: string): Promise<Buffer> {
    if (typeof invoiceNo !== 'string' || !invoiceNo) throw new NotFoundException('document not found');
    const inv: any = await this.invoices.findOne({ invoice_no: { $eq: invoiceNo } }, { _id: 0, __v: 0 }).lean();
    if (!inv || (inv.patient_id !== user.id && user.role !== 'admin')) throw new NotFoundException('document not found');
    return this.renderPdf(inv);
  }

  /** The PDF is drawn from the stored document, with the QR it stores: the picture and the API payload are one value. */
  async renderPdf(inv: any): Promise<Buffer> {
    const credit = inv.type === 'credit_note';
    const money = (v: unknown) => `${Number(v).toFixed(2)} SAR`;
    const qrPng: Buffer | null = await (async () => {
      try {
        const QRCode = require('qrcode');
        return await QRCode.toBuffer(inv.qr_base64, { type: 'png', width: 140, margin: 1 });
      } catch { return null; }
    })();
    const LABELS: Record<string, string> = { consultation_fee: 'Consultation', service: 'Service', platform_fee: 'Platform fee', home_visit_fee: 'Home visit', transport_fee: 'Transport', delivery_fee: 'Delivery', adjustment: 'Adjustment', refund: 'Refund' };

    return new Promise((resolve, reject) => {
      const PDFCtor: any = (PDFDocument as any).default ?? PDFDocument; // the namespace import is the class in the build, an object with `default` under ts-jest
      const doc = new PDFCtor({ margin: 50, size: 'A4' });
      const chunks: any[] = [];
      doc.on('data', (c: any) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).fillColor('#0F766E').text(credit ? 'Nabd — Credit Note / إشعار دائن' : 'Nabd — Tax Invoice / فاتورة ضريبية', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#555555').text(inv.seller_name || 'Nabd Health Platform', { align: 'center' });
      if (inv.vat_number) doc.text(`VAT No: ${inv.vat_number}`, { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(11).fillColor('#111111');
      doc.text(`${credit ? 'Credit note' : 'Invoice'} No: ${inv.invoice_no}`);
      if (credit && inv.original_invoice_no) doc.text(`Reverses invoice: ${inv.original_invoice_no}`);
      doc.text(`Issued At: ${new Date(inv.issued_at || inv.createdAt || Date.now()).toISOString()}`);
      doc.text(`Booking: ${inv.booking_kind} #${inv.booking_id}`);
      if (inv.payment?.method) doc.text(`Paid by: ${inv.payment.method}${inv.payment.last4 ? ` •••• ${inv.payment.last4}` : ''}`);
      doc.moveDown();

      const lines: any[] = Array.isArray(inv.lines) ? inv.lines : [];
      if (lines.length) {
        doc.fontSize(12).text('Items:', { underline: true });
        lines.slice(0, 40).forEach((l: any) => {
          const name = l.name_en || l.name_ar || LABELS[l.key] || l.key;
          doc.fontSize(10).text(`- ${name}  x${l.qty || 1}  =  ${money(l.amount)}`);
        });
        doc.moveDown();
      }
      if (inv.insured) {
        doc.fontSize(10).text(`Insurance${inv.insured.insurer ? ` (${inv.insured.insurer})` : ''}: price ${money(inv.insured.price)}, covered by insurer ${money(inv.insured.covered)}, paid by patient ${money(inv.insured.copay)}`);
        doc.moveDown();
      }

      doc.fontSize(11);
      doc.text(`Subtotal (excl. VAT): ${money(inv.subtotal)}`);
      doc.text(`VAT (${Math.round((inv.vat_rate || 0.15) * 1000) / 10}%): ${money(inv.vat_amount)}`);
      doc.fontSize(13).fillColor('#0F766E').text(`Total (incl. VAT): ${money(inv.total)}`);
      doc.moveDown(1.5);

      if (qrPng) {
        doc.image(qrPng, { fit: [140, 140], align: 'center' });
        doc.fontSize(8).fillColor('#555555').text('ZATCA TLV QR', { align: 'center' });
      } else {
        doc.fontSize(8).fillColor('#555555').text(`ZATCA TLV payload: ${inv.qr_base64}`);
      }

      doc.fontSize(9).fillColor('#999999').text('Generated by Nabd Health Platform — Phase-1 simplified e-invoice', 50, 760, { align: 'center' });
      doc.end();
    });
  }

  /** E1 S17: email the invoice to the patient (Resend primary, SES fallback). */
  async emailInvoice(user: any, kind: string, bookingId: string, mail: MailService) {
    const inv: any = await this.issue(user, kind, bookingId);
    const u: any = await this.conn.collection('users').findOne({ id: inv.patient_id } as any);
    const email = u?.email;
    if (!email) throw new BadRequestException('no_email_on_profile');
    const html = `
      <div dir="rtl" style="font-family:Arial">
        <h2>فاتورتك من نبض</h2>
        <p>رقم الفاتورة: <b>${inv.invoice_no}</b></p>
        <p>الإجمالي (شامل الضريبة): <b>${Number(inv.total).toFixed(2)} ر.س</b></p>
        <p>الضريبة (15%): ${Number(inv.vat_amount).toFixed(2)} ر.س</p>
        <p>يمكنك تحميل الفاتورة PDF من التطبيق.</p>
      </div>`;
    await mail.send(email, `فاتورة نبض ${inv.invoice_no}`, html, `Invoice ${inv.invoice_no} — total ${inv.total} SAR`);
    return { ok: true, emailed_to: email.replace(/(.{2}).*(@.*)/, '$1***$2') };
  }
}

// ── Controller ─────────────────────────────────────────────────────────────
@Controller('billing')
@SelfService()
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private svc: BillingService, private mail: MailService) {}

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

@Module({
  imports: [MailModule, MongooseModule.forFeature([{ name: 'EInvoice', schema: EInvoiceSchema }])],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
