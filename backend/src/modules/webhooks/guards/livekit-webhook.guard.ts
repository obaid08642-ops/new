import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WebhookReceiver } from 'livekit-server-sdk';

@Injectable()
export class LiveKitWebhookGuard implements CanActivate {
  private receiver: WebhookReceiver;

  constructor() {
    this.receiver = new WebhookReceiver(
      process.env.LIVEKIT_API_KEY || 'fake_key',
      process.env.LIVEKIT_API_SECRET || 'fake_secret'
    );
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
