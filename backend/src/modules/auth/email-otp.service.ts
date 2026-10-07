import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../modules/redis/redis.service';

export interface EmailProvider {
  name: 'resend' | 'ses' | 'brevo';
  sendOtp(email: string, code: string): Promise<boolean>;
  isHealthy(): boolean;
  getQuota(): Promise<{ daily: number; monthly: number; used: number; remaining: number; resetAt: Date }>;
  getHealthState(): { healthy: boolean; cooldownUntil?: Date; lastError?: string; consecutiveFailures: number };
  resetHealth(): void;
  recordFailure(error: string): Promise<void>;
  recordSuccess(): Promise<void>;
}

interface ProviderConfig {
  name: 'resend' | 'ses' | 'brevo';
  dailyQuota: number;
  monthlyQuota: number;
  cooldownMs: number;
  maxConsecutiveFailures: number;
  timeoutMs: number;
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  { name: 'resend', dailyQuota: 100, monthlyQuota: 3000, cooldownMs: 5 * 60 * 1000, maxConsecutiveFailures: 3, timeoutMs: 10000 },
  { name: 'ses', dailyQuota: 1000, monthlyQuota: 30000, cooldownMs: 5 * 60 * 1000, maxConsecutiveFailures: 3, timeoutMs: 10000 },
  { name: 'brevo', dailyQuota: 300, monthlyQuota: 9000, cooldownMs: 5 * 60 * 1000, maxConsecutiveFailures: 3, timeoutMs: 10000 },
];

interface ProviderState {
  health: {
    healthy: boolean;
    cooldownUntil?: Date;
    lastError?: string;
    consecutiveFailures: number;
  };
  quota: {
    dailyUsed: number;
    monthlyUsed: number;
    dailyResetAt: Date;
    monthlyResetAt: Date;
  };
}

@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);
  private providers: Map<string, EmailProvider> = new Map();
  private providerStates: Map<string, ProviderState> = new Map();
  private currentProviderIndex = 0;
  private readonly emailRateLimitConfig = {
    maxOtpsPerEmailPerHour: 5,
    maxOtpsPerIpPerHour: 20,
    maxEmailsPerIpPerHour: 15,
  };

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.initializeProviders();
    this.startQuotaResetInterval();
  }

  private initializeProviders(): void {
    for (const cfg of PROVIDER_CONFIGS) {
      const provider = this.createProvider(cfg);
      this.providers.set(cfg.name, provider);
      this.providerStates.set(cfg.name, {
        health: { healthy: true, consecutiveFailures: 0 },
        quota: { dailyUsed: 0, monthlyUsed: 0, dailyResetAt: this.getNextDailyReset(), monthlyResetAt: this.getNextMonthlyReset() },
      });
    }
  }

  private createProvider(cfg: ProviderConfig): EmailProvider {
    const state = this.providerStates.get(cfg.name)!;
    const quotaKeyPrefix = `email:quota:${cfg.name}`;
    const healthKeyPrefix = `email:health:${cfg.name}`;

    return {
      name: cfg.name,
      sendOtp: async (email: string, code: string) => {
        const quota = await this.getQuotaFromRedis(cfg.name);
        if (quota.used >= quota.dailyLimit || quota.monthlyUsed >= quota.monthlyLimit) {
          throw new Error(`Quota exceeded for ${cfg.name}`);
        }

        const sent = await this.sendViaProvider(cfg.name, email, code);
        if (sent) {
          await this.incrementQuota(cfg.name);
        }
        return sent;
      },
      isHealthy: () => {
        const health = state.health;
        if (!health.healthy && health.cooldownUntil && health.cooldownUntil > new Date()) {
          return false;
        }
        if (!health.healthy && health.cooldownUntil && health.cooldownUntil <= new Date()) {
          health.healthy = true;
          health.consecutiveFailures = 0;
          health.cooldownUntil = undefined;
          health.lastError = undefined;
          return true;
        }
        return health.healthy;
      },
      getQuota: async () => {
        const quota = await this.getQuotaFromRedis(cfg.name);
        return {
          daily: cfg.dailyQuota,
          monthly: cfg.monthlyQuota,
          used: quota.used,
          remaining: Math.max(0, cfg.dailyQuota - quota.used),
          resetAt: quota.dailyResetAt,
        };
      },
      getHealthState: () => ({ ...state.health }),
      resetHealth: () => {
        state.health = { healthy: true, consecutiveFailures: 0 };
        this.redis.del(`${healthKeyPrefix}:failures`);
      },
      recordFailure: async (error: string) => {
        state.health.lastError = error;
        state.health.consecutiveFailures++;
        await this.redis.incr(`${healthKeyPrefix}:failures`);
        await this.redis.expire(`${healthKeyPrefix}:failures`, 3600);
        if (state.health.consecutiveFailures >= cfg.maxConsecutiveFailures) {
          state.health.healthy = false;
          state.health.cooldownUntil = new Date(Date.now() + cfg.cooldownMs);
          this.logger.warn(`Provider ${cfg.name} marked unhealthy, cooldown until ${state.health.cooldownUntil}`);
        }
      },
      recordSuccess: async () => {
        state.health.consecutiveFailures = 0;
        state.health.healthy = true;
        state.health.cooldownUntil = undefined;
        state.health.lastError = undefined;
        await this.redis.del(`${healthKeyPrefix}:failures`);
      },
    };
  }

  private async getQuotaFromRedis(providerName: string): Promise<{ used: number; dailyLimit: number; monthlyLimit: number; dailyUsed: number; monthlyUsed: number; dailyResetAt: Date }> {
    const now = Date.now();
    const dayKey = Math.floor(now / 86400000);
    const monthKey = Math.floor(now / (86400000 * 30));
    const cfg = PROVIDER_CONFIGS.find(c => c.name === providerName)!;
    
    const dailyKey = `email:quota:${providerName}:daily:${dayKey}`;
    const monthlyKey = `email:quota:${providerName}:monthly:${monthKey}`;
    
    const [dailyUsed, monthlyUsed] = await Promise.all([
      this.redis.get(dailyKey).then(v => parseInt(v || '0', 10)),
      this.redis.get(monthlyKey).then(v => parseInt(v || '0', 10)),
    ]);

    return {
      used: dailyUsed,
      dailyLimit: cfg.dailyQuota,
      monthlyLimit: cfg.monthlyQuota,
      dailyUsed,
      monthlyUsed,
      dailyResetAt: new Date((dayKey + 1) * 86400000),
    };
  }

  private async incrementQuota(providerName: string): Promise<void> {
    const now = Date.now();
    const dayKey = Math.floor(now / 86400000);
    const monthKey = Math.floor(now / (86400000 * 30));
    
    const dailyKey = `email:quota:${providerName}:daily:${dayKey}`;
    const monthlyKey = `email:quota:${providerName}:monthly:${monthKey}`;
    
    const [dailyCount, monthlyCount] = await Promise.all([
      this.redis.incr(dailyKey),
      this.redis.incr(monthlyKey),
    ]);
    
    if (dailyCount === 1) await this.redis.expire(dailyKey, 86400);
    if (monthlyCount === 1) await this.redis.expire(monthlyKey, 86400 * 30);
  }

  private getNextDailyReset(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  }

  private getNextMonthlyReset(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  }

  private startQuotaResetInterval(): void {
    setInterval(() => {
      this.currentProviderIndex = 0;
      this.logger.log('Daily quota reset: returning to primary provider (Resend)');
    }, 86400000);
  }

  private async sendViaProvider(providerName: string, email: string, code: string): Promise<boolean> {
    const timeout = PROVIDER_CONFIGS.find(c => c.name === providerName)!.timeoutMs;
    
    try {
      switch (providerName) {
        case 'resend':
          return await this.withTimeout(this.sendViaResend(email, code), timeout);
        case 'ses':
          return await this.withTimeout(this.sendViaSes(email, code), timeout);
        case 'brevo':
          return await this.withTimeout(this.sendViaBrevo(email, code), timeout);
        default:
          throw new Error(`Unknown provider: ${providerName}`);
      }
    } catch (err) {
      throw err;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('provider_timeout')), ms)
      ).then(() => { throw new Error('provider_timeout'); })
    ]);
  }

  async sendOtp(email: string, purpose: 'signup' | 'signin' | 'reset', ip?: string): Promise<{ success: boolean; provider: string; code?: string }> {
    // Rate limiting for email OTP
    if (ip) {
      const rateLimitCheck = await this.checkEmailRateLimit(email, ip);
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason!);
      }
    }

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

    // Try providers in order: Resend → SES → Brevo
    for (let i = 0; i < PROVIDER_CONFIGS.length; i++) {
      const providerName = PROVIDER_CONFIGS[(this.currentProviderIndex + i) % PROVIDER_CONFIGS.length].name;
      const provider = this.providers.get(providerName)!;
      
      if (!provider.isHealthy()) {
        this.logger.debug(`Provider ${providerName} is unhealthy, skipping`);
        continue;
      }

      try {
        const quota = await provider.getQuota();
        if (quota.used >= quota.daily) {
          this.logger.warn(`Provider ${providerName} daily quota exceeded (${quota.used}/${quota.daily})`);
          continue;
        }

        const sent = await provider.sendOtp(email, code);
        if (sent) {
          await provider.recordSuccess();
          this.currentProviderIndex = (this.currentProviderIndex + i) % PROVIDER_CONFIGS.length;
          
          // Update OTP record with provider info
          await this.connection.collection('email_otps').updateOne(
            { id: otpId },
            { $set: { provider: providerName, sent_at: new Date() } }
          );

          return { success: true, provider: providerName, code };
        }
      } catch (err) {
        this.logger.warn(`Provider ${providerName} failed: ${err.message}`);
        await provider.recordFailure(err.message);
      }
    }

    return { success: false, provider: 'none' };
  }

  private async checkEmailRateLimit(email: string, ip: string): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now();
    const hourKey = Math.floor(now / 3600000);

    // Check OTPs per email per hour
    const emailKey = `email:rate:email:${email.toLowerCase()}:${hourKey}`;
    const emailCount = await this.redis.incr(emailKey);
    if (emailCount === 1) await this.redis.expire(emailKey, 3600);
    if (emailCount > this.emailRateLimitConfig.maxOtpsPerEmailPerHour) {
      return { allowed: false, reason: `Too many OTPs for this email (max ${this.emailRateLimitConfig.maxOtpsPerEmailPerHour}/hour)` };
    }

    // Check OTPs per IP per hour
    const ipKey = `email:rate:ip:${ip}:${hourKey}`;
    const ipCount = await this.redis.incr(ipKey);
    if (ipCount === 1) await this.redis.expire(ipKey, 3600);
    if (ipCount > this.emailRateLimitConfig.maxOtpsPerIpPerHour) {
      return { allowed: false, reason: `Too many OTP requests from this IP (max ${this.emailRateLimitConfig.maxOtpsPerIpPerHour}/hour)` };
    }

    // Check unique emails per IP per hour
    const uniqueEmailKey = `email:rate:ip:unique:${ip}:${hourKey}`;
    await this.redis.sadd(uniqueEmailKey, email.toLowerCase());
    const uniqueCount = await this.redis.scard(uniqueEmailKey);
    if (uniqueCount === 1) await this.redis.expire(uniqueEmailKey, 3600);
    if (uniqueCount > this.emailRateLimitConfig.maxEmailsPerIpPerHour) {
      return { allowed: false, reason: `Too many different emails from this IP (max ${this.emailRateLimitConfig.maxEmailsPerIpPerHour}/hour)` };
    }

    return { allowed: true };
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

  // Admin: Get provider status and quotas
  async getProviderStatus(): Promise<Array<{
    name: string;
    healthy: boolean;
    current: boolean;
    quota: { daily: number; monthly: number; used: number; remaining: number; resetAt: Date };
    health: { healthy: boolean; cooldownUntil?: Date; lastError?: string; consecutiveFailures: number };
    dkim: { configured: boolean; domain?: string; selector?: string };
    spf: { configured: boolean; domain?: string };
    dmarc: { configured: boolean; policy?: string };
  }>> {
    const results = [];
    for (const cfg of PROVIDER_CONFIGS) {
      const provider = this.providers.get(cfg.name)!;
      const state = this.providerStates.get(cfg.name)!;
      const quota = await provider.getQuota();
      
      results.push({
        name: cfg.name,
        healthy: provider.isHealthy(),
        current: PROVIDER_CONFIGS[this.currentProviderIndex].name === cfg.name,
        quota,
        health: provider.getHealthState(),
        dkim: await this.getDkimStatus(cfg.name),
        spf: await this.getSpfStatus(cfg.name),
        dmarc: await this.getDmarcStatus(cfg.name),
      });
    }
    return results;
  }

  // Admin: Force provider reset
  async resetProvider(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName);
    if (provider) {
      provider.resetHealth();
      this.logger.log(`Admin reset provider: ${providerName}`);
    }
  }

  // Admin: Set current provider index
  async setCurrentProvider(index: number): Promise<void> {
    if (index >= 0 && index < PROVIDER_CONFIGS.length) {
      this.currentProviderIndex = index;
      this.logger.log(`Admin set current provider to: ${PROVIDER_CONFIGS[index].name}`);
    }
  }

  private async getDkimStatus(providerName: string): Promise<{ configured: boolean; domain?: string; selector?: string }> {
    const envKeys: Record<string, { domainKey: string; selectorKey: string }> = {
      resend: { domainKey: 'RESEND_DKIM_DOMAIN', selectorKey: 'RESEND_DKIM_SELECTOR' },
      ses: { domainKey: 'SES_DKIM_DOMAIN', selectorKey: 'SES_DKIM_SELECTOR' },
      brevo: { domainKey: 'BREVO_DKIM_DOMAIN', selectorKey: 'BREVO_DKIM_SELECTOR' },
    };
    const keys = envKeys[providerName];
    const domain = this.config.get(keys.domainKey);
    const selector = this.config.get(keys.selectorKey);
    return { configured: !!(domain && selector), domain, selector };
  }

  private async getSpfStatus(providerName: string): Promise<{ configured: boolean; domain?: string }> {
    const envKeys: Record<string, string> = {
      resend: 'RESEND_SPF_DOMAIN',
      ses: 'SES_SPF_DOMAIN',
      brevo: 'BREVO_SPF_DOMAIN',
    };
    const domain = this.config.get(envKeys[providerName]);
    return { configured: !!domain, domain };
  }

  private async getDmarcStatus(providerName: string): Promise<{ configured: boolean; policy?: string }> {
    const envKeys: Record<string, string> = {
      resend: 'RESEND_DMARC_POLICY',
      ses: 'SES_DMARC_POLICY',
      brevo: 'BREVO_DMARC_POLICY',
    };
    const policy = this.config.get(envKeys[providerName]);
    return { configured: !!policy, policy };
  }

  // Provider implementations
  private async sendViaResend(email: string, code: string): Promise<boolean> {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (!apiKey) throw new Error('Resend not configured');
    
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    
    const html = this.generateOtpHtml(code);
    const { error } = await resend.emails.send({
      from: this.config.get('MAIL_FROM') || 'نَبْض <no-reply@nabd.plus>',
      to: email,
      subject: 'رمز التحقق — نَبْض',
      html,
      text: `رمز التحقق الخاص بك: ${code}`,
    });
    
    if (error) throw new Error(error.message || 'resend_error');
    return true;
  }

  private async sendViaSes(email: string, code: string): Promise<boolean> {
    const host = this.config.get('SES_SMTP_HOST');
    const port = parseInt(this.config.get('SES_SMTP_PORT') || '587', 10);
    const user = this.config.get('SES_SMTP_USER');
    const pass = this.config.get('SES_SMTP_PASS');
    
    if (!host || !user || !pass) throw new Error('SES not configured');
    
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });

    const html = this.generateOtpHtml(code);
    await transporter.sendMail({
      from: this.config.get('SES_FROM') || this.config.get('MAIL_FROM') || 'نَبْض <no-reply@nabd.plus>',
      to: email,
      subject: 'رمز التحقق — نَبْض',
      html,
      text: `رمز التحقق الخاص بك: ${code}`,
    });
    return true;
  }

  private async sendViaBrevo(email: string, code: string): Promise<boolean> {
    const apiKey = this.config.get('BREVO_API_KEY');
    if (!apiKey) throw new Error('Brevo not configured');
    
    let SibApiV3Sdk: any;
    try {
      // @ts-ignore - dynamic import, types may not be available
      const mod = await import('@getbrevo/brevo');
      SibApiV3Sdk = mod.default;
    } catch {
      throw new Error('Brevo SDK not installed. Run: npm install @getbrevo/brevo');
    }
    
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const apiKeyAuth = apiInstance.authentications['apiKey'];
    apiKeyAuth.apiKey = apiKey;
    
    const html = this.generateOtpHtml(code);
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail({
      to: [{ email }],
      sender: { 
        name: 'نَبْض', 
        email: this.config.get('BREVO_FROM_EMAIL') || 'no-reply@nabd.plus' 
      },
      subject: 'رمز التحقق — نَبْض',
      htmlContent: html,
      textContent: `رمز التحقق الخاص بك: ${code}`,
    });
    
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  }

  private generateOtpHtml(code: string): string {
    return `
      <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 30px; text-align: right; background-color: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">منظومة نَبْض الطبية</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">رمز التحقق (OTP) الخاص بك هو:</p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #0284c7; margin: 25px 0;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 14px;">ينتهي مفعول هذا الرمز تلقائياً خلال 10 دقائق. يرجى عدم مشاركته مع أي شخص.</p>
      </div>`;
  }
}