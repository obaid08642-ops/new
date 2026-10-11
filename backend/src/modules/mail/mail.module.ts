/**
 * Unified Mail Module
 * ─────────────────────────────────────────────────────────────
 * Provider chain (21.4):  Resend → Amazon SES → Brevo.
 * The chain switches on an error, a timeout or a used-up quota, and goes back
 * to the first provider when its window resets. Per provider there is a daily
 * and a monthly quota, a health state and a cooldown. Every send returns
 * { ok, provider, fallback_used } and writes a 'mail_log' row, so the admin can
 * see which provider sent each code and how much quota is left.
 */
import { BadGatewayException, Global, Injectable, Logger, Module, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

export type MailProvider = 'resend' | 'ses' | 'brevo';

export interface MailResult {
  ok: boolean;
  provider: MailProvider | 'none';
  fallback_used: boolean;
  error?: string;
}

export interface ProviderState {
  provider: MailProvider;
  configured: boolean;
  healthy: boolean;
  consecutive_failures: number;
  cooldown_until: string | null;
  daily_used: number;
  monthly_used: number;
  daily_quota: number;
  monthly_quota: number;
}

const DEFAULT_ORDER: MailProvider[] = ['resend', 'ses', 'brevo'];
const SEND_TIMEOUT_MS = Number(process.env.MAIL_SEND_TIMEOUT_MS || 10_000);
const COOLDOWN_MS = Number(process.env.MAIL_PROVIDER_COOLDOWN_MS || 5 * 60_000);

function quotaFor(provider: MailProvider, window: 'daily' | 'monthly'): number {
  const raw =
    provider === 'resend'
      ? window === 'daily' ? process.env.RESEND_DAILY_QUOTA : process.env.RESEND_MONTHLY_QUOTA
      : provider === 'ses'
        ? window === 'daily' ? process.env.SES_DAILY_QUOTA : process.env.SES_MONTHLY_QUOTA
        : window === 'daily' ? process.env.BREVO_DAILY_QUOTA : process.env.BREVO_MONTHLY_QUOTA;
  const fallback = window === 'daily' ? 100_000 : 1_000_000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Escape a value before it is interpolated into an email body.
 *
 * Several of these bodies carry data the requester controls — the device name,
 * the User-Agent, the IP — so a device named `<img onerror=…>` would otherwise
 * be rendered as markup in the admin's mail client.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private resend: Resend | null = null;
  private readonly states = new Map<MailProvider, { consecutiveFailures: number; cooldownUntil: number; dailyUsed: number; dailyWindowStart: number; monthlyUsed: number; monthlyWindowStart: number }>();

  constructor(private readonly events: EventEmitter2, @Optional() @InjectConnection() private conn?: Connection) {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    for (const provider of this.order()) {
      this.states.set(provider, { consecutiveFailures: 0, cooldownUntil: 0, dailyUsed: 0, dailyWindowStart: 0, monthlyUsed: 0, monthlyWindowStart: 0 });
    }
  }

  /** The configured order; MAIL_PROVIDER_ORDER overrides the default. */
  private order(): MailProvider[] {
    const raw = process.env.MAIL_PROVIDER_ORDER;
    if (!raw) return [...DEFAULT_ORDER];
    return raw.split(',').map((s) => s.trim()).filter(Boolean).filter((p): p is MailProvider => DEFAULT_ORDER.includes(p as MailProvider));
  }

  /** Persist send outcome for admin email-usage reports (best-effort). */
  private async logMail(to: string, subject: string, ok: boolean, provider: string, fallback: boolean) {
    try {
      await this.conn?.collection('mail_log').insertOne({ to, subject: String(subject).slice(0, 120), ok, provider, fallback_used: fallback, createdAt: new Date() });
    } catch { /* observability never breaks delivery */ }
  }

  get fromAddress(): string {
    return process.env.MAIL_FROM || 'نبض بلس <no-reply@nabd.plus>';
  }

  isConfigured(provider: MailProvider): boolean {
    if (provider === 'resend') return Boolean(process.env.RESEND_API_KEY);
    if (provider === 'ses') return Boolean(process.env.SES_SMTP_HOST && process.env.SES_SMTP_USER && process.env.SES_SMTP_PASS);
    return Boolean(process.env.BREVO_SMTP_HOST && process.env.BREVO_API_KEY);
  }

  /** Live provider state for the admin page (21.4). */
  providerState(): ProviderState[] {
    const now = Date.now();
    return this.order().map((provider) => {
      const s = this.rollWindows(provider, now);
      return {
        provider,
        configured: this.isConfigured(provider),
        healthy: s.consecutiveFailures < 3 && s.cooldownUntil <= now,
        consecutive_failures: s.consecutiveFailures,
        cooldown_until: s.cooldownUntil ? new Date(s.cooldownUntil).toISOString() : null,
        daily_used: s.dailyUsed,
        monthly_used: s.monthlyUsed,
        daily_quota: quotaFor(provider, 'daily'),
        monthly_quota: quotaFor(provider, 'monthly'),
      };
    });
  }

  /** Reset a provider's counters when its window rolls over. */
  private rollWindows(provider: MailProvider, now: number) {
    const s = this.states.get(provider)!;
    const nowDate = new Date(now);
    const dayStart = new Date(nowDate); dayStart.setHours(0, 0, 0, 0);
    if (s.dailyWindowStart !== dayStart.getTime()) { s.dailyWindowStart = dayStart.getTime(); s.dailyUsed = 0; }
    const monthStart = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1));
    if (s.monthlyWindowStart !== monthStart.getTime()) { s.monthlyWindowStart = monthStart.getTime(); s.monthlyUsed = 0; }
    return s;
  }

  private async sendViaResend(to: string, subject: string, html: string, text?: string, attachment?: { filename: string; content: string } | null): Promise<void> {
    if (!this.resend) throw new ServiceUnavailableException('resend_not_configured');
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(attachment ? { attachments: [{ filename: attachment.filename, content: Buffer.from(attachment.content, 'utf-8').toString('base64') }] } : {}),
    });
    if (error) throw new BadGatewayException(error.message || 'resend_error');
  }

  private async sendViaSes(to: string, subject: string, html: string, text?: string, attachment?: { filename: string; content: string } | null): Promise<void> {
    if (!this.isConfigured('ses')) throw new ServiceUnavailableException('ses_not_configured');
    const transporter = nodemailer.createTransport({
      host: process.env.SES_SMTP_HOST,
      port: parseInt(process.env.SES_SMTP_PORT || '587', 10),
      secure: process.env.SES_SMTP_PORT === '465',
      auth: { user: process.env.SES_SMTP_USER, pass: process.env.SES_SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SES_FROM || this.fromAddress,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(attachment ? { attachments: [{ filename: attachment.filename, content: Buffer.from(attachment.content, 'utf-8') }] } : {}),
    });
  }

  /** Brevo speaks SMTP with the API key as the login; no extra SDK is needed. */
  private async sendViaBrevo(to: string, subject: string, html: string, text?: string, attachment?: { filename: string; content: string } | null): Promise<void> {
    if (!this.isConfigured('brevo')) throw new ServiceUnavailableException('brevo_not_configured');
    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
      secure: process.env.BREVO_SMTP_PORT === '465',
      auth: { user: 'apikey', pass: process.env.BREVO_API_KEY },
    });
    await transporter.sendMail({
      from: process.env.BREVO_FROM || this.fromAddress,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(attachment ? { attachments: [{ filename: attachment.filename, content: Buffer.from(attachment.content, 'utf-8') }] } : {}),
    });
  }

  /** Resend first → SES → Brevo. Never throws; the caller reads `ok`. */
  async send(to: string, subject: string, html: string, text?: string): Promise<MailResult> {
    return this.sendWithAttachment({ to, subject, html, text });
  }

  /**
   * Send with an optional CSV attachment (scheduled reports, A7).
   * Attachment is base64 for Resend, Buffer for nodemailer (SES / Brevo).
   */
  async sendWithAttachment(opts: { to: string; subject: string; html: string; text?: string; filename?: string; content?: string }): Promise<MailResult> {
    const attachment = opts.filename && opts.content ? { filename: opts.filename, content: opts.content } : null;
    const now = Date.now();
    let attempted = 0;
    let lastError = 'no_provider_configured';

    for (const provider of this.order()) {
      if (!this.isConfigured(provider)) continue;
      const state = this.rollWindows(provider, now);
      if (state.cooldownUntil > now) {
        this.logger.warn(`mail provider ${provider} is in cooldown until ${new Date(state.cooldownUntil).toISOString()}`);
        continue;
      }
      if (state.dailyUsed >= quotaFor(provider, 'daily') || state.monthlyUsed >= quotaFor(provider, 'monthly')) {
        this.logger.warn(`mail provider ${provider} quota used up; moving to the next provider`);
        continue;
      }
      attempted += 1;
      try {
        await this.withTimeout(
          this.dispatch(provider, opts.to, opts.subject, opts.html, opts.text, attachment),
          SEND_TIMEOUT_MS,
          provider,
        );
        state.dailyUsed += 1;
        state.monthlyUsed += 1;
        state.consecutiveFailures = 0;
        state.cooldownUntil = 0;
        const fallback = attempted > 1;
        this.events.emit('mail.sent', { to: opts.to, subject: opts.subject, provider, fallback_used: fallback });
        await this.logMail(opts.to, opts.subject, true, provider, fallback);
        return { ok: true, provider, fallback_used: fallback };
      } catch (e: any) {
        lastError = e?.message || 'mail_send_failed';
        state.consecutiveFailures += 1;
        if (state.consecutiveFailures >= 3) {
          state.cooldownUntil = now + COOLDOWN_MS;
          this.logger.error(`mail provider ${provider} failed ${state.consecutiveFailures} times; cooling down`);
        }
        this.logger.warn(`${provider} failed for ${opts.to}: ${lastError} — trying the next provider`);
      }
    }

    this.logger.error(`No mail provider delivered to ${opts.to}: ${lastError}`);
    this.events.emit('mail.failed', { to: opts.to, subject: opts.subject, error: lastError });
    await this.logMail(opts.to, opts.subject, false, 'none', attempted > 0);
    return { ok: false, provider: 'none', fallback_used: attempted > 0, error: lastError };
  }

  private dispatch(
    provider: MailProvider,
    to: string,
    subject: string,
    html: string,
    text?: string,
    attachment?: { filename: string; content: string } | null,
  ): Promise<void> {
    if (provider === 'resend') return this.sendViaResend(to, subject, html, text, attachment);
    if (provider === 'ses') return this.sendViaSes(to, subject, html, text, attachment);
    return this.sendViaBrevo(to, subject, html, text, attachment);
  }

  private withTimeout<T>(work: Promise<T>, ms: number, provider: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${provider}_timeout`)), ms);
      work.then(
        (value) => { clearTimeout(timer); resolve(value); },
        (error) => { clearTimeout(timer); reject(error); },
      );
    });
  }

  /** Shared OTP template — branded, short, and honest about the expiry. */
  async sendOtp(to: string, code: string, expiresMinutes = 5): Promise<MailResult> {
    const html = `
      <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 30px; text-align: right; background-color: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">نبض بلس</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">رمز التحقق الخاص بك هو:</p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #0284c7; margin: 25px 0;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 14px;">ينتهي مفعول هذا الرمز خلال ${expiresMinutes} دقائق. لا تشاركه مع أي شخص.</p>
      </div>`;
    return this.send(to, 'رمز التحقق — نبض بلس', html, `رمز التحقق الخاص بك: ${code}`);
  }
}

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}