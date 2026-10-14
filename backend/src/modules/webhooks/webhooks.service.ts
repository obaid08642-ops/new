import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { PharmacyPaymentEvidenceService } from '../pharmacy/services/pharmacy-payment-evidence.service';
import { PaymentsService } from '../payments/payments.module';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { WebhookReceiver } from 'livekit-server-sdk';
import { RedisService } from '../redis/redis.service';
import { isMoyasarWebhookAuthenticated } from '../../common/moyasar-webhook-auth';

const isProd = () => process.env.NODE_ENV === 'production';

/** Constant-time string compare (hex-safe, no early exit). */
function timingSafeEq(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a || '', 'utf8');
    const bb = Buffer.from(b || '', 'utf8');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('Webhooks');

  constructor(
    private eventEmitter: EventEmitter2,
    private readonly redis: RedisService,
    @Optional() private readonly paymentEvidence?: PharmacyPaymentEvidenceService,
    @Optional() private readonly payments?: PaymentsService,
  ) {}

  /** PayTabs signs the raw JSON body with HMAC-SHA256 using the server key. */
  verifyPayTabs(signature: string | undefined, rawBody: string): boolean {
    const serverKey = process.env.PAYTABS_SERVER_KEY;
    if (!serverKey) {
      if (isProd()) {
        this.logger.error('PAYTABS_SERVER_KEY is not set — rejecting webhook (fail-closed)');
        return false;
      }
      return true;
    }
    if (!signature) return false;
    const digest = crypto.createHmac('sha256', serverKey).update(rawBody).digest('hex');
    return timingSafeEq(signature, digest);
  }

  /**
   * E5-F1 replay protection: dedupe a gateway event for 24h.
   * Returns true when the event was already processed.
   */
  private async isReplay(kind: string, id: string): Promise<boolean> {
    if (!id) return false;
    const key = `webhook_seen:${kind}:${id}`;
    return await this.redis.exists(key);
  }

  private async markReplay(kind: string, id: string): Promise<void> {
    if (!id) return;
    const key = `webhook_seen:${kind}:${id}`;
    const firstSeen = await this.redis.setnx(key, String(Date.now()));
    if (firstSeen) await this.redis.expire(key, 24 * 3600);
  }

  async handleMoyasarWebhook(body: any, signature?: string, rawBody?: string) {
    const raw = rawBody ?? JSON.stringify(body);
    // S-5: Moyasar documents no signature header — the body secret_token is the
    // proof. The older HMAC path still works. Anything with neither is refused.
    if (!isMoyasarWebhookAuthenticated(body, signature, raw)) {
      throw new BadRequestException('Invalid signature');
    }

    // A native Moyasar payment body (type/data/secret_token) settles the
    // canonical transaction: every Moyasar receiver must agree on "paid".
    // The older internal shape (event/data, no secret_token) keeps the
    // evidence-writer path below, unchanged.
    const native = body && typeof body.type === 'string' && body.type.startsWith('payment_') && body.data?.id;
    if (native && this.payments) {
      const dedupId = body.data.id;
      if (await this.isReplay('moyasar:payment', dedupId)) {
        return { status: 'success', event: body.type, deduplicated: true };
      }
      await this.payments.handleWebhook('moyasar', body, signature, raw);
      await this.markReplay('moyasar:payment', dedupId);
      return { status: 'success', event: body.type };
    }

    const event = body.event; // e.g. 'payment.paid', 'payment.failed'
    const data = body.data;
    const dedupId = body?.data?.id ?? body?.id;
    if (await this.isReplay(`moyasar:${event}`, dedupId)) {
      return { status: 'success', event, deduplicated: true };
    }

    if (event === 'payment.paid') {
      if (!this.paymentEvidence) throw new BadRequestException('payment_evidence_writer_unavailable');
      // The durable writer is part of the HTTP command. Do not acknowledge or
      // mark replayed until signature, bindings, and evidence persistence succeed.
      await this.paymentEvidence.recordVerifiedGatewayPayment('moyasar', data);
    } else {
      await this.eventEmitter.emitAsync(`moyasar.${event}`, data);
    }
    await this.markReplay(`moyasar:${event}`, dedupId);
    return { status: 'success', event };
  }

  async handlePayTabsWebhook(body: any, signature?: string, rawBody?: string) {
    if (!this.verifyPayTabs(signature, rawBody ?? JSON.stringify(body))) {
      throw new BadRequestException('Invalid signature');
    }

    const event = body.tran_ref ? 'payment.status' : 'unknown';
    if (await this.isReplay('paytabs', body.tran_ref)) {
      return { status: 'success', event, deduplicated: true };
    }
    await this.eventEmitter.emitAsync(`paytabs.${event}`, body);
    await this.markReplay('paytabs', body.tran_ref);
    return { status: 'success', event };
  }

  async handleSmsWebhook(body: any, token?: string) {
    const expectedToken = process.env.SMS_WEBHOOK_TOKEN;
    if (!expectedToken) {
      if (isProd()) throw new BadRequestException('SMS webhook not configured');
    } else if (!token || !timingSafeEq(token, expectedToken)) {
      throw new BadRequestException('Invalid token');
    }

    await this.eventEmitter.emitAsync('sms.status_updated', body);
    return { status: 'success' };
  }

  async handleLiveKitWebhook(rawBody: string, authHeader: string) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new BadRequestException('LiveKit credentials not configured');
    }

    try {
      const receiver = new WebhookReceiver(apiKey, apiSecret);
      const event = await receiver.receive(rawBody, authHeader);
      await this.eventEmitter.emitAsync(`livekit.${event.event}`, event);
      return { ok: true };
    } catch (err: any) {
      throw new BadRequestException(`Webhook verification failed: ${err.message}`);
    }
  }
}
