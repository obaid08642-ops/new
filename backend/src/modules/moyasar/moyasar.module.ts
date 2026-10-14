import { ServiceUnavailableException } from '@nestjs/common';
import {
  Module,
  Injectable,
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpCode,
  Headers,
  Req,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { RefundDto, CreateMoyasarPaymentDto } from './moyasar.dto';
import { InjectModel, InjectConnection, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model, Document, Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser, Public, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { IdempotencyInterceptor } from '../../common/idempotency.interceptor';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { moyasarBase } from '../../common/moyasar-base';

// ── Schemas ──────────────────────────────────────────────────────────────────

@Schema({ timestamps: true, collection: 'moyasar_payments' })
export class MoyasarPayment {
  @Prop({ required: true, index: true }) booking_id: string;
  @Prop({ required: true }) booking_kind: string;
  @Prop({ required: true }) patient_id: string;
  @Prop({ required: true }) amount: number; // in SAR (stored as SAR, sent as halalas)
  @Prop({ default: 'SAR' }) currency: string;
  @Prop() moyasar_id?: string; // Moyasar payment ID
  @Prop({
    default: 'initiated',
    enum: ['initiated', 'paid', 'failed', 'refunded', 'authorized'],
  })
  status: string;
  @Prop() payment_url?: string; // redirect URL for hosted checkout
  @Prop() source_type?: string; // creditcard, mada, applepay
  @Prop({ type: Object }) source?: Record<string, any>;
  @Prop() failure_reason?: string;
  @Prop() paid_at?: Date;
  @Prop() refunded_at?: Date;
  @Prop({ default: 0 }) refunded_amount: number;
  @Prop({ type: Object }) raw_response?: Record<string, any>;
  @Prop() callback_url?: string;
  @Prop() description?: string;
}

export type MoyasarPaymentDocument = MoyasarPayment & Document;
export const MoyasarPaymentSchema = SchemaFactory.createForClass(MoyasarPayment);
MoyasarPaymentSchema.index({ booking_id: 1, status: 1 });
MoyasarPaymentSchema.index({ patient_id: 1, createdAt: -1 });
MoyasarPaymentSchema.index({ moyasar_id: 1 }, { sparse: true });

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MoyasarService {
  private readonly logger = new Logger('MoyasarService');
  private readonly apiKey: string;
  private get baseUrl() { return moyasarBase(); }

  constructor(
    @InjectModel(MoyasarPayment.name)
    private readonly paymentModel: Model<MoyasarPaymentDocument>,
    @InjectConnection() private readonly conn: Connection,
    private readonly events: EventEmitter2,
  ) {
    this.apiKey = process.env.MOYASAR_API_KEY || process.env.MOYASAR_SECRET_KEY || process.env.MOYASAR_SECRET || '';
    if (!this.apiKey) {
      this.logger.warn('MOYASAR_API_KEY not set — payment calls will run in sandbox mode');
    }
  }

  /**
   * E1-F2: the server — never the client — decides how much a booking costs.
   * Resolves { amount, patient_id } from the actual booking document.
   */
  private async resolveBookingAmount(bookingKind: string, bookingId: string): Promise<{ amount: number; patient_id: string | null }> {
    const kindMap: Record<string, { collection: string; amounts: string[] }> = {
      pharmacy: { collection: 'orders', amounts: ['total', 'totals.total', 'amount'] },
      order: { collection: 'orders', amounts: ['total', 'totals.total', 'amount'] },
      orders: { collection: 'orders', amounts: ['total', 'totals.total', 'amount'] },
      consultation: { collection: 'appointments', amounts: ['total_price', 'price', 'amount'] },
      appointment: { collection: 'appointments', amounts: ['total_price', 'price', 'amount'] },
      lab: { collection: 'labbookings', amounts: ['total', 'total_price', 'price', 'amount'] },
      labs: { collection: 'labbookings', amounts: ['total', 'total_price', 'price', 'amount'] },
      radiology: { collection: 'radiologybookings', amounts: ['total', 'total_price', 'price', 'amount'] },
      nursing: { collection: 'homecarebookings', amounts: ['total', 'total_price', 'price', 'amount'] },
      'home-care': { collection: 'homecarebookings', amounts: ['total', 'total_price', 'price', 'amount'] },
      homecare: { collection: 'homecarebookings', amounts: ['total', 'total_price', 'price', 'amount'] },
      insurance: { collection: 'insuranceservicerequests', amounts: ['copay_amount', 'price'] },
      'insurance-copay': { collection: 'insuranceservicerequests', amounts: ['copay_amount', 'price'] },
      copay: { collection: 'insuranceservicerequests', amounts: ['copay_amount', 'price'] },
    };
    const cfg = kindMap[bookingKind];
    if (!cfg) throw new BadRequestException('invalid_booking_kind');
    // bookingId is DTO-validated as a string; pin with $eq so query
    // operators can never be injected into the filter.
    const doc: any = await this.conn.collection(cfg.collection).findOne({ id: { $eq: bookingId } } as any);
    if (!doc) throw new NotFoundException('booking_not_found');
    let amount = 0;
    for (const path of cfg.amounts) {
      const val = path.split('.').reduce((o: any, k: string) => (o != null ? o[k] : undefined), doc);
      if (Number(val) > 0) { amount = Number(val); break; }
    }
    if (!(amount > 0)) throw new BadRequestException('booking_has_no_payable_amount');
    return { amount: Math.round(amount * 100) / 100, patient_id: doc.patient_id || doc.user_id || null };
  }

  private assertSandboxAllowed(): void {
    if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('payment_gateway_not_configured');
  }

  private authHeaders(): Record<string, string> {
    const b64 = Buffer.from(`${this.apiKey}:`).toString('base64');
    return {
      Authorization: `Basic ${b64}`,
      'Content-Type': 'application/json',
    };
  }

  /** Create a Moyasar payment (hosted checkout flow) */
  async createPayment(params: {
    bookingId: string;
    bookingKind: string;
    patientId: string;
    amount: number; // SAR — converted to halalas before sending to API
    description?: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
    /** Internal flows with user-chosen amounts (wallet top-up) set this explicitly. */
    skipBookingValidation?: boolean;
  }): Promise<MoyasarPaymentDocument> {
    // E1-F2: amount comes from the booking document, not the request body.
    if (!params.skipBookingValidation) {
      const resolved = await this.resolveBookingAmount(params.bookingKind, params.bookingId);
      if (resolved.patient_id && resolved.patient_id !== params.patientId) {
        throw new ForbiddenException('not_your_booking');
      }
      params.amount = resolved.amount;
    }
    if (!(Number(params.amount) > 0)) throw new BadRequestException('invalid_amount');
    const amountHalalas = Math.round(params.amount * 100);
    const callbackUrl =
      params.callbackUrl ||
      (process.env.PUBLIC_APP_URL || '') + '/api/v1/moyasar/callback';

    // Return existing pending payment to avoid duplicate charges
    const existing = await this.paymentModel.findOne({
      booking_id: { $eq: params.bookingId },
      status: { $in: ['initiated', 'authorized'] },
    });
    if (existing) return existing;

    const requestBody = {
      amount: amountHalalas,
      currency: 'SAR',
      description:
        params.description ||
        `Nabd ${params.bookingKind} #${params.bookingId.slice(0, 8)}`,
      callback_url: callbackUrl,
      source: { type: 'creditcard' }, // frontend overrides with applepay / mada
      metadata: {
        booking_id: params.bookingId,
        booking_kind: params.bookingKind,
        patient_id: params.patientId,
        ...(params.metadata || {}),
      },
    };

    let moyasarResponse: any;

    if (this.apiKey) {
      try {
        const resp = await fetch(`${this.baseUrl}/payments`, {
          method: 'POST',
          headers: this.authHeaders(),
          body: JSON.stringify(requestBody),
        });
        moyasarResponse = await resp.json();
        if (!resp.ok) {
          throw new BadRequestException(
            moyasarResponse?.message || 'moyasar_create_failed',
          );
        }
      } catch (e: any) {
        this.logger.error('Moyasar createPayment error', e?.message);
        throw new BadRequestException(e?.message || 'payment_create_failed');
      }
    } else {
      // Sandbox / dev mode when no API key is configured — never in production,
      // where a missing key must fail closed instead of issuing a fake payment.
      this.assertSandboxAllowed();
      moyasarResponse = {
        id: `sandbox_${Date.now()}`,
        status: 'initiated',
        source: {
          transaction_url: `nabd://payment/sandbox?booking=${params.bookingId}&amount=${amountHalalas}`,
        },
      };
      this.logger.warn(
        'Running in sandbox payment mode — set MOYASAR_API_KEY for live payments',
      );
    }

    const payment = await this.paymentModel.create({
      booking_id: params.bookingId,
      booking_kind: params.bookingKind,
      patient_id: params.patientId,
      amount: params.amount,
      currency: 'SAR',
      moyasar_id: moyasarResponse?.id,
      status: moyasarResponse?.status || 'initiated',
      payment_url: moyasarResponse?.source?.transaction_url,
      description: params.description,
      callback_url: callbackUrl,
      raw_response: moyasarResponse,
    });

    return payment;
  }

  /** Fetch and sync a single payment's status from Moyasar */
  async syncPaymentStatus(moyasarId: string): Promise<MoyasarPaymentDocument | null> {
    this.assertMoyasarId(moyasarId);
    const payment = await this.paymentModel.findOne({ moyasar_id: { $eq: moyasarId } });
    if (!payment) return null;

    const isSandbox = !this.apiKey || moyasarId.startsWith('sandbox_');
    if (!isSandbox) {
      try {
        const resp = await fetch(`${this.baseUrl}/payments/${encodeURIComponent(moyasarId)}`, {
          headers: this.authHeaders(),
        });
        const data: any = await resp.json();

        const statusMap: Record<string, string> = {
          paid: 'paid',
          failed: 'failed',
          authorized: 'authorized',
          initiated: 'initiated',
          refunded: 'refunded',
        };

        payment.status = statusMap[data?.status] ?? payment.status;
        if (data?.source?.type) payment.source_type = data.source.type;
        if (data?.source) payment.source = data.source;
        payment.raw_response = data;

        if (data?.status === 'paid' && !payment.paid_at) {
          payment.paid_at = new Date();
        }
        if (data?.status === 'failed' && data?.source?.message) {
          payment.failure_reason = data.source.message;
        }

        await payment.save();
      } catch (e: any) {
        this.logger.error('Moyasar syncStatus error', e?.message);
      }
    }

    return payment;
  }

  /** Refund a payment fully or partially */
  async refundPayment(
    moyasarId: string,
    amount?: number,
  ): Promise<{ ok: boolean; refund?: any; sandbox?: boolean }> {
    this.assertMoyasarId(moyasarId);
    const isSandbox = !this.apiKey || moyasarId.startsWith('sandbox_');

    if (isSandbox) {
      // Without a key in production, marking a payment refunded would record a
      // refund that never reached Moyasar.
      this.assertSandboxAllowed();
      const p = await this.paymentModel.findOne({ moyasar_id: { $eq: moyasarId } });
      if (p) {
        p.status = 'refunded';
        p.refunded_at = new Date();
        p.refunded_amount = amount ?? p.amount;
        await p.save();
      }
      return { ok: true, sandbox: true };
    }

    const payment = await this.paymentModel.findOne({ moyasar_id: { $eq: moyasarId } });
    if (!payment) throw new BadRequestException('payment_not_found');

    try {
      const amountHalalas = amount ? Math.round(amount * 100) : undefined;
      const resp = await fetch(`${this.baseUrl}/payments/${encodeURIComponent(moyasarId)}/refunds`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(amountHalalas ? { amount: amountHalalas } : {}),
      });
      const data: any = await resp.json();
      if (!resp.ok) throw new BadRequestException(data?.message || 'refund_failed');

      payment.status = 'refunded';
      payment.refunded_at = new Date();
      payment.refunded_amount =
        (payment.refunded_amount || 0) + (amount ?? payment.amount);
      await payment.save();

      this.events.emit('payment.refund', {
        actor_id: 'admin', transaction_id: payment.moyasar_id,
        booking_id: payment.booking_id, booking_kind: payment.booking_kind,
        patient_id: payment.patient_id, amount: amount ?? payment.amount,
      });

      return { ok: true, refund: data };
    } catch (e: any) {
      this.logger.error('Refund error', e?.message);
      throw new BadRequestException(e?.message || 'refund_failed');
    }
  }

  private assertMoyasarId(id: string): void {
    if (typeof id !== 'string' || id.length > 128 || !/^[A-Za-z0-9_-]+$/.test(id)) {
      throw new BadRequestException('invalid_moyasar_payment_id');
    }
  }

  /** Verify Moyasar webhook HMAC-SHA256 signature.
   *  F60: the signature is required in EVERY environment. A missing secret used
   *  to be accepted outside production, which meant a staging deployment with
   *  no secret set would accept forged payment webhooks and could mark an
   *  order paid. A webhook that cannot be authenticated is never trusted. */
  verifyWebhookSignature(payload: string, signature?: string): boolean {
    const secret = process.env.MOYASAR_WEBHOOK_SECRET || '';
    if (!secret) {
      this.logger.error('MOYASAR_WEBHOOK_SECRET is not set — rejecting webhook (fail-closed)');
      return false;
    }
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    try {
      const a = Buffer.from(hmac, 'hex');
      const b = Buffer.from(signature, 'hex');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /** Process an inbound Moyasar webhook event */
  async handleWebhook(payload: any): Promise<{ ok: boolean }> {
    // Moyasar sends the payment object directly as the webhook body
    const moyasarId: string | undefined = payload?.id ?? payload?.data?.id;
    if (moyasarId) {
      await this.syncPaymentStatus(moyasarId);
    }
    return { ok: true };
  }

  /** Look up a stored payment by its Moyasar id (no gateway call). */
  async findByMoyasarId(moyasarId: string): Promise<MoyasarPayment | null> {
    this.assertMoyasarId(moyasarId);
    return this.paymentModel.findOne({ moyasar_id: { $eq: moyasarId } }, { _id: 0, __v: 0, raw_response: 0 }).lean();
  }

  /** Get all payments for a specific booking */
  async getPaymentsByBooking(bookingId: string): Promise<MoyasarPayment[]> {
    return this.paymentModel
      .find({ booking_id: bookingId }, { _id: 0, __v: 0, raw_response: 0 })
      .sort({ createdAt: -1 })
      .lean();
  }

  /** Get paginated payment history for a patient */
  async getPaymentsByUser(
    patientId: string,
    page = 1,
    limit = 20,
  ): Promise<{ payments: MoyasarPayment[]; total: number; page: number; limit: number }> {
    const filter = { patient_id: patientId };
    const [total, payments] = await Promise.all([
      this.paymentModel.countDocuments(filter),
      this.paymentModel
        .find(filter, { _id: 0, __v: 0, raw_response: 0 })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    return { payments, total, page, limit };
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

/** Client-facing view of a Moyasar payment: the raw gateway response stays server-side. */
function publicPayment(p: any): any {
  if (!p) return p;
  const o = typeof p.toObject === 'function' ? p.toObject() : { ...p };
  delete o.raw_response;
  delete o._id;
  delete o.__v;
  return o;
}

@Controller('moyasar')
@SelfService()
export class MoyasarController {
  constructor(private readonly svc: MoyasarService) {}

  /** Initiate a new payment for a booking */
  @Post('payments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  createPayment(
    @CurrentUser() user: any,
    @Body()
    body: CreateMoyasarPaymentDto,
  ) {
    return this.svc.createPayment({
      bookingId: body.booking_id,
      bookingKind: body.booking_kind,
      patientId: user.id,
      amount: body.amount,
      description: body.description,
      callbackUrl: body.callback_url,
    }).then(publicPayment);
  }

  /** Retrieve all payments linked to a booking (owner or admin only) */
  @Get('payments/booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  async getByBooking(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    const payments = await this.svc.getPaymentsByBooking(bookingId);
    if (user.role !== 'admin' && payments.some((p: any) => p.patient_id && p.patient_id !== user.id)) {
      throw new ForbiddenException('not_your_booking');
    }
    return payments;
  }

  /** Retrieve the authenticated patient's payment history */
  @Get('payments/me')
  @UseGuards(JwtAuthGuard)
  getMyPayments(@CurrentUser() user: any) {
    return this.svc.getPaymentsByUser(user.id);
  }

  /** Pull the latest status from Moyasar and persist it */
  @Get('payments/sync/:moyasarId')
  @UseGuards(JwtAuthGuard)
  async syncStatus(@CurrentUser() user: any, @Param('moyasarId') id: string) {
    // Owner check before contacting Moyasar: any signed-in user could otherwise
    // read (and trigger a write of) another patient's payment by id.
    const existing = await this.svc.findByMoyasarId(id);
    if (!existing) throw new NotFoundException('payment_not_found');
    if (user?.role !== 'admin' && existing.patient_id !== user?.id) {
      throw new ForbiddenException('not_your_payment');
    }
    const synced = await this.svc.syncPaymentStatus(id);
    return publicPayment(synced);
  }

  /**
   * Refund a payment (full or partial) — ADMIN ONLY.
   * E1-F3: previously any authenticated user (incl. patients) could refund
   * any payment by id. Patients must use POST /refunds/request (approval flow).
   */
  @Post('payments/:moyasarId/refund')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  refund(
    @Param('moyasarId') id: string,
    @Body() body: RefundDto,
  ) {
    return this.svc.refundPayment(id, body.amount);
  }

  /** Moyasar webhook receiver (public — authenticated via HMAC signature, E5-F1 fail-closed) */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(@Body() body: Record<string, unknown>, @Headers('x-moyasar-signature') signature: string, @Req() req: any) {
    const rawBody = req?.rawBody || JSON.stringify(body);
    if (!this.svc.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('invalid_signature');
    }
    return this.svc.handleWebhook(body);
  }

  /**
   * Moyasar redirect callback after the hosted checkout.
   *
   * F60-b: this used to answer `{ ok: true }` and nothing else, so a card payment
   * the patient completed only reached the platform when the app later polled
   * /payments/sync. If the patient never returned to the app, the order stayed
   * pending forever even though the money moved. The callback now reconciles the
   * payment with the gateway before responding, then redirects the patient to a
   * real result page carrying the status.
   */
  @Public()
  @Get('callback')
  async callback(@Query('id') moyasarId?: string, @Query('status') status?: string, @Res() res?: Response) {
    // Reconcile with the gateway: a hosted page can be abandoned, so trust the
    // provider's view of the payment, not the query string the browser sent.
    const synced = moyasarId ? await this.svc.syncPaymentStatus(moyasarId).catch(() => null) : null;
    const settled = String(synced?.status || status || 'pending');
    // The patient lands back in the app: hand them a real result page, not JSON.
    const target = process.env.PAYMENT_RESULT_URL || 'https://nabd.plus/payments/result';
    const back = `${target}?status=${encodeURIComponent(settled)}${moyasarId ? `&id=${encodeURIComponent(moyasarId)}` : ''}`;
    if (res && typeof res.redirect === 'function') return res.redirect(back);
    return { ok: true, status: settled, moyasar_id: moyasarId, redirect: back };
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MoyasarPayment.name, schema: MoyasarPaymentSchema },
    ]),
  ],
  controllers: [MoyasarController],
  providers: [MoyasarService],
  exports: [MoyasarService],
})
export class MoyasarModule {}
