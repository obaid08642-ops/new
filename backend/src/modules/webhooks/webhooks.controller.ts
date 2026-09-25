import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Post, Body, Headers, Req, BadRequestException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';
import { Public } from '../../common/auth.guard';
import { MoyasarDto, PaytabsDto } from './webhooks.dto';

@UseGuards(JwtAuthGuard)
@Controller('webhooks')
@Public() // Public endpoint, authenticated via headers signature
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post('moyasar')
  async moyasar(
    @Body() body: MoyasarDto,
    @Headers('moyasar-signature') signature: string,
    @Req() req: Request
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    return this.service.handleMoyasarWebhook(body, signature, rawBody);
  }

  @Post('paytabs')
  async paytabs(
    @Body() body: PaytabsDto,
    @Headers('signature') signature: string,
    @Req() req: Request
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    return this.service.handlePayTabsWebhook(body, signature, rawBody);
  }

  @Post('sms')
  async sms(
    @Body() body: any,
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
