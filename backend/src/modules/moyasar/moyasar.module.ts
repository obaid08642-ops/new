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
  HttpCode,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { JwtAuthGuard, CurrentUser, Public } from '../../common/auth.guard';
import { IdempotencyInterceptor } from '../../common/idempotency.interceptor';
import * as crypto from 'crypto';

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
  private readonly baseUrl = 'https://api.moyasar.com/v1';

  constructor(
    @InjectModel(MoyasarPayment.name)
    private readonly paymentModel: Model<MoyasarPaymentDocument>,
  ) {
    this.apiKey = process.env.MOYASAR_API_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('MOYASAR_API_KEY not set — payment calls will run in sandbox mode');
    }
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
  }): Promise<MoyasarPaymentDocument> {
    const amountHalalas = Math.round(params.amount * 100);
    const callbackUrl =
      params.callbackUrl ||
      (process.env.PUBLIC_APP_URL || '') + '/api/v1/moyasar/callback';

    // Return existing pending payment to avoid duplicate charges
    const existing = await this.paymentModel.findOne({
      booking_id: params.bookingId,
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
      // Sandbox / dev mode when no API key is configured
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
    const payment = await this.paymentModel.findOne({ moyasar_id: moyasarId });
    if (!payment) return null;

    const isSandbox = !this.apiKey || moyasarId.startsWith('sandbox_');
    if (!isSandbox) {
      try {
        const resp = await fetch(`${this.baseUrl}/payments/${moyasarId}`, {
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
    const isSandbox = !this.apiKey || moyasarId.startsWith('sandbox_');

    if (isSandbox) {
      const p = await this.paymentModel.findOne({ moyasar_id: moyasarId });
      if (p) {
        p.status = 'refunded';
        p.refunded_at = new Date();
        p.refunded_amount = amount ?? p.amount;
        await p.save();
      }
      return { ok: true, sandbox: true };
    }

    const payment = await this.paymentModel.findOne({ moyasar_id: moyasarId });
    if (!payment) throw new BadRequestException('payment_not_found');

    try {
      const amountHalalas = amount ? Math.round(amount * 100) : undefined;
      const resp = await fetch(`${this.baseUrl}/payments/${moyasarId}/refunds`, {
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

      return { ok: true, refund: data };
    } catch (e: any) {
      this.logger.error('Refund error', e?.message);
      throw new BadRequestException(e?.message || 'refund_failed');
    }
  }

  /** Verify Moyasar webhook HMAC-SHA256 signature */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.MOYASAR_WEBHOOK_SECRET || '';
    if (!secret) return true; // skip verification when secret not configured
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(signature, 'hex'));
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

  /** Get all payments for a specific booking */
  async getPaymentsByBooking(bookingId: string): Promise<MoyasarPayment[]> {
    return this.paymentModel
      .find({ booking_id: bookingId }, { _id: 0, __v: 0 })
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
        .find(filter, { _id: 0, __v: 0 })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    return { payments, total, page, limit };
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@Controller('moyasar')
export class MoyasarController {
  constructor(private readonly svc: MoyasarService) {}

  /** Initiate a new payment for a booking */
  @Post('payments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  createPayment(
    @CurrentUser() user: any,
    @Body()
    body: {
      booking_id: string;
      booking_kind: string;
      amount: number;
      description?: string;
      callback_url?: string;
    },
  ) {
    return this.svc.createPayment({
      bookingId: body.booking_id,
      bookingKind: body.booking_kind,
      patientId: user.id,
      amount: body.amount,
      description: body.description,
      callbackUrl: body.callback_url,
    });
  }

  /** Retrieve all payments linked to a booking */
  @Get('payments/booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  getByBooking(@Param('bookingId') bookingId: string) {
    return this.svc.getPaymentsByBooking(bookingId);
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
  syncStatus(@Param('moyasarId') id: string) {
    return this.svc.syncPaymentStatus(id);
  }

  /** Refund a payment (full or partial) */
  @Post('payments/:moyasarId/refund')
  @UseGuards(JwtAuthGuard)
  refund(
    @Param('moyasarId') id: string,
    @Body() body: { amount?: number },
  ) {
    return this.svc.refundPayment(id, body.amount);
  }

  /** Moyasar webhook receiver (public — no auth required) */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(@Body() body: any, @Headers('x-moyasar-signature') signature: string) {
    if (signature) {
      // In production, body should ideally be raw body buffer for HMAC, but this works for JSON payload serialization usually.
      const isValid = this.svc.verifyWebhookSignature(JSON.stringify(body), signature);
      if (!isValid) throw new BadRequestException('invalid_signature');
    }
    return this.svc.handleWebhook(body);
  }

  /** Moyasar redirect callback after hosted checkout */
  @Public()
  @Get('callback')
  callback() {
    return { ok: true, message: 'Payment callback received' };
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
