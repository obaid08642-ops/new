import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WebhookReceiver } from 'livekit-server-sdk';

@Injectable()
export class LiveKitWebhookGuard implements CanActivate {
  private receiver: WebhookReceiver;

  constructor() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error('FATAL: LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required — webhook verification must not run against fake defaults');
    }
    this.receiver = new WebhookReceiver(apiKey, apiSecret);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers['authorization'];

    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing cryptographic authorization token header.');
    }

    try {
      // Verification of raw body using HMAC SHA256 signatures
      const verifiedEvent = this.receiver.receive(request.body, authorizationHeader);
      request.livekitVerifiedEvent = verifiedEvent;
      return true;
    } catch (error) {
      throw new UnauthorizedException('LiveKit webhook cryptographic identity mismatch.');
    }
  }
}
