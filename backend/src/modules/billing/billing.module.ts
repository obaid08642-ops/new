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

  /**
   * Issue (or return the existing) e-invoice of a PAID booking. The invoice total is what was charged (the card payment or the
   * cash collected, so an insured booking is invoiced at the co-pay, not at its price), VAT is taken out of it at the configured rate.
   * `user` null = the system, on `payment.completed`.
   */
  async issue(user: any | null, kind: string, bookingId: string) {
    const existing: any = await this.invoices.findOne({ booking_kind: kind, booking_id: bookingId, status: 'ISSUED' }, { _id: 0, __v: 0 }).lean();
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

    const sellerName = process.env.ZATCA_SELLER_NAME || 'منصة نَبْض للرعاية الصحية';
    const vatNumber = process.env.ZATCA_VAT_NUMBER
      || (process.env.NODE_ENV === 'production' ? null : '300000000000003'); // sandbox number, non-prod only
    if (!vatNumber) throw new BadRequestException('ZATCA_VAT_NUMBER is not configured — cannot issue compliant invoices');
    const issuedAt = new Date();
    const qr = tlvQr(sellerName, vatNumber, issuedAt.toISOString(), total, vat);

    try {
      const doc = await this.invoices.create({
        invoice_no: await this.nextInvoiceNo(),
        booking_kind: kind,
        booking_id: bookingId,
        patient_id: owner,
        subtotal, vat_rate: rate, vat_amount: vat, total,
        qr_base64: qr,
      });
      return await this.invoices.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
    } catch (e: any) {
      // two writers (the payment event and the patient's request) can race: the one that lost reads the winner's invoice
      const again = await this.invoices.findOne({ booking_kind: kind, booking_id: bookingId, status: 'ISSUED' }, { _id: 0, __v: 0 }).lean();
      if (again) return again;
      throw e;
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
    return this.invoices.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
  }

  adminList(limit = 100) {
    return this.invoices.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(Math.min(limit, 500)).lean();
  }

  /** E1 S17: patient invoice PDF with embedded ZATCA QR image. */
  async invoicePdf(user: any, kind: string, bookingId: string): Promise<Buffer> {
    const inv: any = await this.issue(user, kind, bookingId);
    const booking: any = await this.findBooking(kind, bookingId);
    const sellerName = process.env.ZATCA_SELLER_NAME || 'Nabd Health Platform';

    const qrPng: Buffer | null = await (async () => {
      try {
        const QRCode = require('qrcode');
        return await QRCode.toBuffer(inv.qr_base64, { type: 'png', width: 140, margin: 1 });
      } catch { return null; }
    })();

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ margin: 50, size: 'A4' });
      const chunks: any[] = [];
      doc.on('data', (c: any) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).fillColor('#0F766E').text('Nabd — Tax Invoice / فاتورة ضريبية', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#555555').text(sellerName, { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(11).fillColor('#111111');
      doc.text(`Invoice No: ${inv.invoice_no}`);
      doc.text(`Issued At: ${new Date(inv.createdAt || Date.now()).toISOString()}`);
      doc.text(`Booking: ${inv.booking_kind} #${inv.booking_id}`);
      if (booking?.patient_name) doc.text(`Patient: ${booking.patient_name}`);
      doc.moveDown();

      if (Array.isArray(booking?.items) && booking.items.length) {
        doc.fontSize(12).text('Items:', { underline: true });
        booking.items.slice(0, 25).forEach((it: any) => {
          doc.fontSize(10).text(`- ${it.name_en || it.name_ar || it.medicine_id}  x${it.qty || 1}  =  ${((it.price || 0) * (it.qty || 1)).toFixed(2)} SAR`);
        });
        doc.moveDown();
      }

      doc.fontSize(11);
      doc.text(`Subtotal (excl. VAT): ${Number(inv.subtotal).toFixed(2)} SAR`);
      doc.text(`VAT (${Math.round((inv.vat_rate || 0.15) * 100)}%): ${Number(inv.vat_amount).toFixed(2)} SAR`);
      doc.fontSize(13).fillColor('#0F766E').text(`Total (incl. VAT): ${Number(inv.total).toFixed(2)} SAR`);
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
  invoice(@CurrentUser() user: any, @Param('kind') kind: string, @Param('bookingId') bookingId: string) {
    return this.svc.issue(user, kind, bookingId);
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
