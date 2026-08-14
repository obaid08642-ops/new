import { Controller, Post, Body, Req, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Controller('webhooks/moyasar')
export class MoyasarWebhookController {
  private readonly logger = new Logger(MoyasarWebhookController.name);

  constructor(private eventEmitter: EventEmitter2) {}

  @Post()
  async handleWebhook(@Body() body: any, @Req() req: Request) {
    this.logger.log('Received Moyasar Webhook', body);
    
    // Verify Webhook Secret / Signature if configured
    const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;
    const signature = req.headers['x-moyasar-signature'] || req.headers['authorization'];

    if (webhookSecret) {
      if (!signature) {
        this.logger.error('Missing Moyasar webhook signature header');
        throw new UnauthorizedException('Missing webhook signature');
      }
      const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(body)).digest('hex');
      if (signature !== webhookSecret && signature !== expectedSignature) {
        this.logger.error('Invalid Moyasar webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    if (!body || !body.type) {
      throw new BadRequestException('Invalid webhook payload');
    }

    if (body.type === 'payment.paid') {
      this.eventEmitter.emit('payment.successful', body.data);
    } else if (body.type === 'payment.failed') {
      this.eventEmitter.emit('payment.failed', body.data);
    }

    return { received: true };
  }
}
