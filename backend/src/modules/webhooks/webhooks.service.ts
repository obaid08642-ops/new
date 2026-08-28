import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { PharmacyPaymentEvidenceService } from '../pharmacy/services/pharmacy-payment-evidence.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { WebhookReceiver } from 'livekit-server-sdk';
import { RedisService } from '../redis/redis.service';

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
  ) {}

  /**
   * E5-F1: webhook verification is FAIL-CLOSED in production.
   * A missing secret or missing signature can no longer silently pass.
   * In non-production (dev/test) a missing secret still skips verification
   * so local development does not need gateway credentials.
   */
  verifyMoyasar(signature: string | undefined, rawBody: string): boolean {
    const secret = process.env.MOYASAR_WEBHOOK_SECRET;
    if (!secret) {
      if (isProd()) {
        this.logger.error('MOYASAR_WEBHOOK_SECRET is not set — rejecting webhook (fail-closed)');
        return false;
      }
      return true;
    }
    if (!signature) return false;
    const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEq(signature, digest);
  }

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
    if (!this.verifyMoyasar(signature, rawBody ?? JSON.stringify(body))) {
      throw new BadRequestException('Invalid signature');
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
