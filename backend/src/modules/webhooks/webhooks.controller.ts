import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Post, Body, Headers, Req, BadRequestException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';
import { Public } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('webhooks')
@Public() // Public endpoint, authenticated per provider (SMS token, LiveKit JWT)
// Q104: payment webhooks live only at POST /payments/webhook/moyasar.
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post('sms')
  async sms(
    @Body() body: Record<string, unknown>,
    @Headers('x-sms-token') token: string
  ) {
    return this.service.handleSmsWebhook(body, token);
  }

  @Post('livekit')
  async livekit(
    @Headers('authorization') authHeader: string,
    @Req() req: Request
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    return this.service.handleLiveKitWebhook(rawBody, authHeader);
  }
}
