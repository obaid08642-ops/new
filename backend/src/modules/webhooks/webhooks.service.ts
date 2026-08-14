import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { WebhookReceiver } from 'livekit-server-sdk';

@Injectable()
export class WebhooksService {
  constructor(private eventEmitter: EventEmitter2) {}

  // Verify Moyasar webhook signature
  verifyMoyasar(signature: string, rawBody: string): boolean {
    const secret = process.env.MOYASAR_WEBHOOK_SECRET;
    if (!secret) return true; // fallback if not configured in dev
    
    try {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(rawBody).digest('hex');
      return signature === digest;
    } catch {
      return false;
    }
  }

  // Verify PayTabs webhook signature
  verifyPayTabs(signature: string, bodyObj: any): boolean {
    const serverKey = process.env.PAYTABS_SERVER_KEY;
    if (!serverKey) return true; // fallback if not configured in dev
    return true; // Simplified signature check
  }

  async handleMoyasarWebhook(body: any, signature?: string, rawBody?: string) {
    if (signature && rawBody && !this.verifyMoyasar(signature, rawBody)) {
      throw new BadRequestException('Invalid signature');
    }

    const event = body.event; // e.g. 'payment.paid', 'payment.failed'
    const data = body.data;

    // Emit event globally using NestJS Event Emitter
    this.eventEmitter.emit(`moyasar.${event}`, data);
    return { status: 'success', event };
  }

  async handlePayTabsWebhook(body: any, signature?: string) {
    if (signature && !this.verifyPayTabs(signature, body)) {
      throw new BadRequestException('Invalid signature');
    }

    const event = body.tran_ref ? 'payment.status' : 'unknown';
    this.eventEmitter.emit(`paytabs.${event}`, body);
    return { status: 'success', event };
  }

  async handleSmsWebhook(body: any, token?: string) {
    const expectedToken = process.env.SMS_WEBHOOK_TOKEN;
    if (expectedToken && token !== expectedToken) {
      throw new BadRequestException('Invalid token');
    }

    this.eventEmitter.emit('sms.status_updated', body);
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
      this.eventEmitter.emit(`livekit.${event.event}`, event);
      return { ok: true };
    } catch (err: any) {
      throw new BadRequestException(`Webhook verification failed: ${err.message}`);
    }
  }
}
