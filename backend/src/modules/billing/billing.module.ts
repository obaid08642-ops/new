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
  NotFoundException, Injectable, UseGuards, Res, StreamableFile,
} from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import * as PDFDocument from 'pdfkit';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { CurrentUser } from '../../common/auth.guard';
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

  /** Issue (or return existing) e-invoice for a paid booking. */
  async issue(user: any, kind: string, bookingId: string) {
    const existing = await this.invoices.findOne({ booking_kind: kind, booking_id: bookingId, status: 'ISSUED' }, { _id: 0, __v: 0 }).lean();
    if (existing) return existing;

    const booking: any = await this.conn.model(this.bookingModelName(kind)).findOne({ id: bookingId }).lean();
    if (!booking) throw new NotFoundException('booking not found');
    const isOwner = booking.patient_id === user.id || booking.user_id === user.id;
    if (!isOwner && user.role !== 'admin') throw new BadRequestException('not your booking');

    const total = Number(booking.total ?? booking.total_price ?? booking.price ?? 0);
    if (!(total > 0)) throw new BadRequestException('booking has no payable amount');
    const vat = Math.round((total - total / (1 + VAT_RATE)) * 100) / 100; // VAT-inclusive extraction
    const subtotal = Math.round((total - vat) * 100) / 100;

    const sellerName = process.env.ZATCA_SELLER_NAME || 'منصة نَبْض للرعاية الصحية';
    const vatNumber = process.env.ZATCA_VAT_NUMBER
      || (process.env.NODE_ENV === 'production' ? null : '300000000000003'); // sandbox number, non-prod only
    if (!vatNumber) throw new BadRequestException('ZATCA_VAT_NUMBER is not configured — cannot issue compliant invoices');
    const issuedAt = new Date();
    const qr = tlvQr(sellerName, vatNumber, issuedAt.toISOString(), total, vat);

    const doc = await this.invoices.create({
      invoice_no: await this.nextInvoiceNo(),
      booking_kind: kind,
      booking_id: bookingId,
      patient_id: booking.patient_id || booking.user_id,
      subtotal, vat_rate: VAT_RATE, vat_amount: vat, total,
      qr_base64: qr,
    });
    return this.invoices.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
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
    const booking: any = await this.conn.model(this.bookingModelName(kind)).findOne({ id: bookingId }).lean();
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
