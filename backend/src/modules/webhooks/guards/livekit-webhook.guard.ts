import { Injectable, CanActivate, ExecutionContext, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { WebhookReceiver } from 'livekit-server-sdk';

@Injectable()
export class LiveKitWebhookGuard implements CanActivate {
  private receiver: WebhookReceiver | null;

  constructor() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    this.receiver = apiKey && apiSecret ? new WebhookReceiver(apiKey, apiSecret) : null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.receiver) {
      throw new ServiceUnavailableException('LiveKit webhook verification is unavailable because signing credentials are not configured');
    }

    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers['authorization'];
    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing cryptographic authorization token header.');
    }

    try {
      const verifiedEvent = this.receiver.receive(request.body, authorizationHeader);
      request.livekitVerifiedEvent = verifiedEvent;
      return true;
    } catch {
      throw new UnauthorizedException('LiveKit webhook cryptographic identity mismatch.');
    }
  }
}
