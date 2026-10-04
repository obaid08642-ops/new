import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TurnstileService {
  private readonly secretKey: string;
  private readonly verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.secretKey = this.config.get<string>('TURNSTILE_SECRET_KEY') || '';
  }

  async verify(token: string, ip?: string): Promise<{ success: boolean; errorCodes?: string[] }> {
    if (!this.secretKey) {
      // Fail-open in dev, fail-closed in prod
      if (this.config.get('NODE_ENV') === 'production') {
        throw new HttpException('Turnstile not configured', HttpStatus.SERVICE_UNAVAILABLE);
      }
      return { success: true };
    }

    try {
      const params = new URLSearchParams();
      params.append('secret', this.secretKey);
      params.append('response', token);
      if (ip) params.append('remoteip', ip);

      const response = await firstValueFrom(
        this.http.post(this.verifyUrl, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      return response.data;
    } catch {
      throw new HttpException('Turnstile verification failed', HttpStatus.BAD_GATEWAY);
    }
  }
}
