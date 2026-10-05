import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface EmailProvider {
  name: string;
  sendOtp(email: string, code: string): Promise<boolean>;
  isHealthy(): boolean;
  getQuota(): { daily: number; monthly: number; used: number };
}

@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);
  private providers: EmailProvider[] = [];
  private currentProviderIndex = 0;

  constructor(@InjectConnection() private readonly connection: Connection) {
    this.providers = [
      { name: 'resend', sendOtp: (e, c) => this.sendViaResend(e, c), isHealthy: () => true, getQuota: () => ({ daily: 100, monthly: 3000, used: 0 }) },
      { name: 'ses', sendOtp: (e, c) => this.sendViaSes(e, c), isHealthy: () => true, getQuota: () => ({ daily: 1000, monthly: 30000, used: 0 }) },
      { name: 'brevo', sendOtp: (e, c) => this.sendViaBrevo(e, c), isHealthy: () => true, getQuota: () => ({ daily: 300, monthly: 9000, used: 0 }) },
    ];
  }

  async sendOtp(email: string, purpose: 'signup' | 'signin' | 'reset'): Promise<{ success: boolean; provider: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = uuidv4();

    await this.connection.collection('email_otps').insertOne({
      id: otpId,
      email,
      code,
      purpose,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
      created_at: new Date(),
    });

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[(this.currentProviderIndex + i) % this.providers.length];
      if (!provider.isHealthy()) continue;

      try {
        const sent = await provider.sendOtp(email, code);
        if (sent) {
          this.currentProviderIndex = (this.currentProviderIndex + i) % this.providers.length;
          return { success: true, provider: provider.name };
        }
      } catch (err) {
        this.logger.warn(`Provider ${provider.name} failed: ${err.message}`);
      }
    }

    return { success: false, provider: 'none' };
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const otp = await this.connection.collection('email_otps').findOne({
      email,
      code,
      used: false,
      expires_at: { $gt: new Date() },
    });

    if (!otp) return false;

    await this.connection.collection('email_otps').updateOne(
      { id: otp.id },
      { $set: { used: true, verified_at: new Date() } },
    );

    return true;
  }

  private async sendViaResend(email: string, code: string): Promise<boolean> {
    // Integration with Resend API
    return true;
  }

  private async sendViaSes(email: string, code: string): Promise<boolean> {
    // Integration with Amazon SES
    return true;
  }

  private async sendViaBrevo(email: string, code: string): Promise<boolean> {
    // Integration with Brevo API
    return true;
  }
}
