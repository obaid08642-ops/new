import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Mailer abstraction. Delivery requires configured Resend or SMTP credentials.
 * The service fails closed when no delivery channel is configured and never logs
 * message bodies or verification codes.
 */
export interface MailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  tag?: string;
}

interface MailerAdapter { send(msg: MailMessage): Promise<{ id?: string; status: 'sent' | 'logged' | 'failed'; error?: string }> }

class DisabledAdapter implements MailerAdapter {
  async send(_msg: MailMessage) {
    return { status: 'failed' as const, error: 'mail_delivery_unavailable' };
  }
}

class ResendAdapter implements MailerAdapter {
  private logger = new Logger('Mailer:Resend');
  constructor(private apiKey: string, private from: string) {}
  async send(msg: MailMessage) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html, tags: msg.tag ? [{ name: 'tag', value: msg.tag }] : undefined }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) { this.logger.error(`Resend failed: ${res.status} ${JSON.stringify(json)}`); return { status: 'failed' as const, error: json?.message || res.statusText }; }
      return { status: 'sent' as const, id: json?.id };
    } catch (e: any) { this.logger.error('Resend exception: ' + e.message); return { status: 'failed' as const, error: e.message }; }
  }
}

class NodemailerAdapter implements MailerAdapter {
  private logger = new Logger('Mailer:Nodemailer');
  private transporter: nodemailer.Transporter;
  constructor(private host: string, private port: number, private user: string, private pass: string, private from: string) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  async send(msg: MailMessage) {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html || `<p>${msg.text}</p>`,
      });
      return { status: 'sent' as const, id: info.messageId };
    } catch (e: any) {
      this.logger.error('Nodemailer SMTP failed: ' + e.message);
      return { status: 'failed' as const, error: e.message };
    }
  }
}

@Injectable()
export class ProviderMailerService {
  private adapter: MailerAdapter;
  private logger = new Logger('Mailer');
  constructor() {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.PROVIDER_MAIL_FROM || 'noreply@nabd.app';
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (key && key.trim().length > 0) {
      this.adapter = new ResendAdapter(key, from);
      this.logger.log(`Initialised Resend adapter (from=${from})`);
    } else if (smtpUser && smtpPass && smtpUser.trim().length > 0) {
      const mailFrom = process.env.PROVIDER_MAIL_FROM || smtpUser;
      this.adapter = new NodemailerAdapter(smtpHost, smtpPort, smtpUser, smtpPass, mailFrom);
      this.logger.log(`Initialised Nodemailer SMTP adapter (host=${smtpHost}, port=${smtpPort}, from=${mailFrom})`);
    } else {
      this.adapter = new DisabledAdapter();
      this.logger.warn('Provider mail delivery is disabled because no delivery credentials are configured.');
    }
  }
  send(msg: MailMessage) { return this.adapter.send(msg); }
}
