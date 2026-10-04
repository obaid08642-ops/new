import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { WebhookReceiver } from 'livekit-server-sdk';

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

  constructor(private eventEmitter: EventEmitter2) {}

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
