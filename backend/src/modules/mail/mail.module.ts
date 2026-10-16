/**
 * Unified Mail Module
 * ─────────────────────────────────────────────────────────────
 * Provider chain (21.4):  Resend → Amazon SES → Brevo → Mailjet.
 * The chain switches on an error, a timeout or a used-up quota, and goes back
 * to the first provider when its window resets. Per provider there is a daily
 * and a monthly quota, a health state and a cooldown. Every send returns
 * { ok, provider, fallback_used } and writes a 'mail_log' row, so the admin can
 * see which provider sent each code and how much quota is left.
 * The daily/monthly counters live in the 'mail_quota' Mongo collection (one
 * document per provider per window), so restarts and several instances share
 * them; the in-memory copy is only a cache.
 */
import { BadGatewayException, Global, Injectable, Logger, Module, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

export type MailProvider = 'resend' | 'ses' | 'brevo' | 'mailjet';

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

const DEFAULT_ORDER: MailProvider[] = ['resend', 'ses', 'brevo', 'mailjet'];
const MAILJET_SEND_URL = 'https://api.mailjet.com/v3.1/send';
/** Mailjet free tier: 200 emails a day, 6,000 a month. */
const FREE_TIER: Partial<Record<MailProvider, { daily: number; monthly: number }>> = { mailjet: { daily: 200, monthly: 6_000 } };

interface QuotaDoc { _id: string; count: number }
const SEND_TIMEOUT_MS = Number(process.env.MAIL_SEND_TIMEOUT_MS || 10_000);
const COOLDOWN_MS = Number(process.env.MAIL_PROVIDER_COOLDOWN_MS || 5 * 60_000);

function quotaFor(provider: MailProvider, window: 'daily' | 'monthly'): number {
  const raw = process.env[`${provider.toUpperCase()}_${window === 'daily' ? 'DAILY' : 'MONTHLY'}_QUOTA`];
  const free = FREE_TIER[provider];
  const fallback = free ? free[window] : window === 'daily' ? 100_000 : 1_000_000;
  if (raw === undefined || raw === '') return fallback;
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
    if (provider === 'brevo') return Boolean(process.env.BREVO_SMTP_HOST && process.env.BREVO_API_KEY);
    return Boolean(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);
  }

  private quotaKeys(provider: MailProvider, s: { dailyWindowStart: number; monthlyWindowStart: number }) {
    return { daily: `${provider}:d:${s.dailyWindowStart}`, monthly: `${provider}:m:${s.monthlyWindowStart}` };
  }

  private quotaCollection() {
    return this.conn?.db?.collection<QuotaDoc>('mail_quota') ?? null;
  }

  /** Read the shared counters for the current windows (other instances, earlier runs). */
  private async loadUsage(provider: MailProvider, now: number) {
    const s = this.rollWindows(provider, now);
    const col = this.quotaCollection();
    if (!col) return s;
    try {
      const keys = this.quotaKeys(provider, s);
      const docs = await col.find({ _id: { $in: [keys.daily, keys.monthly] } }).toArray();
      for (const d of docs) {
        if (d._id === keys.daily) s.dailyUsed = d.count;
        if (d._id === keys.monthly) s.monthlyUsed = d.count;
      }
    } catch (e) {
      this.logger.warn(`mail_quota read failed for ${provider}: ${e instanceof Error ? e.message : String(e)}`);
    }
    return s;
  }

  /** Count one send in the shared store (atomic $inc, upserted per window). */
  private async recordUsage(provider: MailProvider, s: { dailyUsed: number; monthlyUsed: number; dailyWindowStart: number; monthlyWindowStart: number }) {
    const col = this.quotaCollection();
    if (!col) { s.dailyUsed += 1; s.monthlyUsed += 1; return; }
    try {
      const keys = this.quotaKeys(provider, s);
      const [d, m] = await Promise.all([
        col.findOneAndUpdate({ _id: keys.daily }, { $inc: { count: 1 }, $setOnInsert: { provider, window: 'daily', createdAt: new Date() } }, { upsert: true, returnDocument: 'after' }),
        col.findOneAndUpdate({ _id: keys.monthly }, { $inc: { count: 1 }, $setOnInsert: { provider, window: 'monthly', createdAt: new Date() } }, { upsert: true, returnDocument: 'after' }),
      ]);
      s.dailyUsed = d?.count ?? s.dailyUsed + 1;
      s.monthlyUsed = m?.count ?? s.monthlyUsed + 1;
    } catch (e) {
      s.dailyUsed += 1; s.monthlyUsed += 1;
      this.logger.warn(`mail_quota write failed for ${provider}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Refresh the cached counters from the shared store, then report state. */
  async sharedProviderState(): Promise<ProviderState[]> {
    const now = Date.now();
    for (const provider of this.order()) await this.loadUsage(provider, now);
    return this.providerState();
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

  /** Mailjet Send API v3.1 over HTTPS with basic auth; no SDK needed. */
  private async sendViaMailjet(to: string, subject: string, html: string, text?: string, attachment?: { filename: string; content: string } | null): Promise<void> {
    if (!this.isConfigured('mailjet')) throw new ServiceUnavailableException('mailjet_not_configured');
    const fromRaw = process.env.MAILJET_FROM || this.fromAddress;
    const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(fromRaw);
    const from = match ? { Email: match[2], Name: match[1] || undefined } : { Email: fromRaw.trim() };
    const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');
    const res = await fetch(MAILJET_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        Messages: [{
          From: from,
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
          ...(text ? { TextPart: text } : {}),
          ...(attachment ? { Attachments: [{ ContentType: 'text/csv', Filename: attachment.filename, Base64Content: Buffer.from(attachment.content, 'utf-8').toString('base64') }] } : {}),
        }],
      }),
    });
    if (!res.ok) throw new BadGatewayException(`mailjet_http_${res.status}`);
    const body = (await res.json().catch(() => null)) as { Messages?: Array<{ Status?: string }> } | null;
    if (body?.Messages?.[0]?.Status !== 'success') throw new BadGatewayException('mailjet_error');
  }

  /** Resend first → SES → Brevo → Mailjet. Never throws; the caller reads `ok`. */
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
      const state = await this.loadUsage(provider, now);
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
        await this.recordUsage(provider, state);
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
    if (provider === 'brevo') return this.sendViaBrevo(to, subject, html, text, attachment);
    return this.sendViaMailjet(to, subject, html, text, attachment);
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

  /** 435: the password-reset message, a button to the website's reset page with the token in the link (and the link as text). */
  async sendPasswordReset(to: string, subject: string, body: string, action: string, link: string, dir: 'rtl' | 'ltr'): Promise<MailResult> {
    const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const align = dir === 'rtl' ? 'right' : 'left';
    const html = `
      <div dir="${dir}" style="font-family: system-ui, sans-serif; padding: 30px; text-align: ${align}; background-color: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">${esc(body)}</p>
        <p style="margin: 25px 0;"><a href="${esc(link)}" style="background-color: #D42A38; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">${esc(action)}</a></p>
        <p style="color: #64748b; font-size: 13px; word-break: break-all;">${esc(link)}</p>
      </div>`;
    return this.send(to, subject, html, `${body}\n\n${link}`);
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