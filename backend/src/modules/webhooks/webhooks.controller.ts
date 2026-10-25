import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Post, Body, Headers, Req, BadRequestException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';
import { Public } from '../../common/auth.guard';

/** A provider webhook always posts a JSON object; anything else is a malformed call (400), never a 500. */
function requireObjectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('invalid_webhook_body');
  return body as Record<string, unknown>;
}

@UseGuards(JwtAuthGuard)
@Controller('webhooks')
@Public() // Public endpoint, authenticated via headers signature
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post('moyasar')
  async moyasar(
    @Body() body: Record<string, unknown>,
    @Headers('moyasar-signature') signature: string,
    @Req() req: Request
  ) {
    requireObjectBody(body);
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    return this.service.handleMoyasarWebhook(body, signature, rawBody);
  }

  @Post('paytabs')
  async paytabs(
    @Body() body: Record<string, unknown>,
    @Headers('signature') signature: string,
    @Req() req: Request
  ) {
    requireObjectBody(body);
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    return this.service.handlePayTabsWebhook(body, signature, rawBody);
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
