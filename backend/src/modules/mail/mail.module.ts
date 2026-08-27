/**
 * Unified Mail Module
 * ─────────────────────────────────────────────────────────────
 * Provider strategy (no self-hosted mail server):
 *   1. Resend  — PRIMARY  (RESEND_API_KEY)
 *   2. Amazon SES — AUTOMATIC FALLBACK on any Resend failure
 *      (SES_SMTP_HOST / SES_SMTP_PORT / SES_SMTP_USER / SES_SMTP_PASS)
 *
 * Every send returns { ok, provider, fallback_used } and logs a
 * 'mail.sent' / 'mail.failed' event so admin analytics can watch it.
 */
import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

export interface MailResult {
  ok: boolean;
  provider: 'resend' | 'ses' | 'none';
  fallback_used: boolean;
  error?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private resend: Resend | null = null;

  constructor(private readonly events: EventEmitter2) {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  get fromAddress(): string {
    return process.env.MAIL_FROM || 'نَبْض <no-reply@nabd.plus>';
  }

  private sesConfigured(): boolean {
    return !!(process.env.SES_SMTP_HOST && process.env.SES_SMTP_USER && process.env.SES_SMTP_PASS);
  }

  private async sendViaResend(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.resend) throw new Error('resend_not_configured');
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    if (error) throw new Error(error.message || 'resend_error');
  }

  private async sendViaSes(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.sesConfigured()) throw new Error('ses_not_configured');
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
    });
  }

  /** Resend first → automatic SES fallback. Never throws. */
  async send(to: string, subject: string, html: string, text?: string): Promise<MailResult> {
    // 1) Primary: Resend
    try {
      await this.sendViaResend(to, subject, html, text);
      this.events.emit('mail.sent', { to, subject, provider: 'resend', fallback_used: false });
      return { ok: true, provider: 'resend', fallback_used: false };
    } catch (e: any) {
      this.logger.warn(`Resend failed for ${to}: ${e.message} — attempting SES fallback`);
    }
    // 2) Automatic fallback: Amazon SES
    try {
      await this.sendViaSes(to, subject, html, text);
      this.logger.log(`SES fallback delivered mail to ${to}`);
      this.events.emit('mail.sent', { to, subject, provider: 'ses', fallback_used: true });
      return { ok: true, provider: 'ses', fallback_used: true };
    } catch (e2: any) {
      this.logger.error(`Both mail providers failed for ${to}: ${e2.message}`);
      this.events.emit('mail.failed', { to, subject, error: e2.message });
      return { ok: false, provider: 'none', fallback_used: true, error: e2.message };
    }
  }

  /** Shared OTP template (Arabic, RTL) — used by auth + notifications. */
  async sendOtp(to: string, code: string): Promise<MailResult> {
    const html = `
      <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 30px; text-align: right; background-color: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">منظومة نَبْض الطبية</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">رمز التحقق (OTP) الخاص بك هو:</p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #0284c7; margin: 25px 0;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 14px;">ينتهي مفعول هذا الرمز تلقائياً خلال 10 دقائق. يرجى عدم مشاركته مع أي شخص.</p>
      </div>`;
    return this.send(to, 'رمز التحقق — نَبْض', html, `رمز التحقق الخاص بك: ${code}`);
  }
}

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
