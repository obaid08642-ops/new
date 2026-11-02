/**
 * Unified Mail Module
 * ─────────────────────────────────────────────────────────────
 * Providers (owner spec 2026-10-16): Resend, Brevo (REST API) and Mailjet (REST API v3.1).
 * Amazon SES is only used when MAIL_PROVIDER_ORDER names it. A provider without its key is skipped.
 *
 * Order: the PRIMARY provider rotates every calendar month in Riyadh time:
 *   primary = (year * 12 + month) mod N over the configured providers (in MAIL_PROVIDER_ORDER order).
 * Every send starts with the primary. When its daily or monthly quota is used up, or it fails (three failures in a
 * row put it in a cooldown), the send falls over to the next provider; the primary is used again as soon as its
 * window resets or its cooldown ends. Day and month windows are Riyadh days and months.
 *
 * Counters live in the 'mail_quota' Mongo collection (one document per provider per window, atomic $inc, window start
 * stored, plus one status document per provider with the last error), so restarts and several instances share them.
 *
 * Keep-alive: once a week every NON-primary provider sends one ops summary to OPS_ALERT_EMAIL, so no account goes idle.
 * The week is claimed per provider in 'mail_keepalive' with an atomic upsert, so it fires once per provider per week
 * across restarts and processes.
 */
import { BadGatewayException, Global, Injectable, Logger, Module, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import { timedFetch } from '../../common/external-call';

/** Mail provider API calls: 8 s, sent once (a repeat could mail twice); a timeout is a 504 `mail_gateway_timeout` that the mail queue treats as a failed send. */
const MAIL_FETCH = { timeoutMs: 8000, label: 'mail-api', timeoutCode: 'mail_gateway_timeout' } as const;
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
  primary: boolean;
  healthy: boolean;
  consecutive_failures: number;
  cooldown_until: string | null;
  daily_used: number;
  monthly_used: number;
  daily_quota: number | null;
  monthly_quota: number | null;
  daily_left: number | null;
  monthly_left: number | null;
  last_error: string | null;
  last_error_at: string | null;
}

const ALL_PROVIDERS: MailProvider[] = ['resend', 'ses', 'brevo', 'mailjet'];
/** SES is not in the default chain; it joins only when MAIL_PROVIDER_ORDER names it. */
const DEFAULT_ORDER: MailProvider[] = ['resend', 'brevo', 'mailjet'];
/** Free-tier daily defaults (Mailjet 200, Brevo 300, Resend 100). A monthly cap applies only when *_MONTHLY_QUOTA is set. */
const FREE_DAILY: Partial<Record<MailProvider, number>> = { mailjet: 200, brevo: 300, resend: 100 };
const RIYADH_OFFSET_MS = 3 * 3_600_000; // Asia/Riyadh is UTC+3 all year (no daylight saving).
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

interface QuotaDoc { _id: string; count?: number; provider?: string; window?: string; window_start?: Date; last_error?: string; last_error_at?: Date }
interface KeepAliveDoc { _id: string; week: number; claimed_at: Date; sent_at?: Date }
const SEND_TIMEOUT_MS = Number(process.env.MAIL_SEND_TIMEOUT_MS || 10_000);
const COOLDOWN_MS = Number(process.env.MAIL_PROVIDER_COOLDOWN_MS || 5 * 60_000);

/** The quota for a window; null means no cap (an unset *_MONTHLY_QUOTA, e.g. Brevo has no monthly limit). */
function quotaFor(provider: MailProvider, window: 'daily' | 'monthly'): number | null {
  const raw = process.env[`${provider.toUpperCase()}_${window === 'daily' ? 'DAILY' : 'MONTHLY'}_QUOTA`];
  const fallback = window === 'daily' ? (FREE_DAILY[provider] ?? 100_000) : null;
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function quotaUsedUp(provider: MailProvider, s: { dailyUsed: number; monthlyUsed: number }): boolean {
  const d = quotaFor(provider, 'daily');
  const m = quotaFor(provider, 'monthly');
  return (d !== null && s.dailyUsed >= d) || (m !== null && s.monthlyUsed >= m);
}

/** API base URL; the env override exists for the local test stack (tools/live/fake_mail.py) and must be HTTPS in production. */
function apiBase(envName: string, fallback: string): string {
  const base = (process.env[envName] || fallback).replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production' && !base.startsWith('https://')) throw new Error(`${envName} must be https in production`);
  return base;
}

/** Riyadh calendar windows for an instant: start of the day and month (as UTC ms), the month index and the week index. */
export function riyadhWindows(now: number): { dayStart: number; monthStart: number; monthIndex: number; week: number } {
  const local = new Date(now + RIYADH_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const dayStart = Date.UTC(y, m, local.getUTCDate()) - RIYADH_OFFSET_MS;
  const monthStart = Date.UTC(y, m, 1) - RIYADH_OFFSET_MS;
  // Weeks start on Monday 00:00 Riyadh (1970-01-01 was a Thursday, so shift by 3 days).
  const week = Math.floor((now + RIYADH_OFFSET_MS + 3 * DAY_MS) / WEEK_MS);
  return { dayStart, monthStart, monthIndex: y * 12 + m, week };
}

function parseFrom(fromRaw: string): { email: string; name?: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(fromRaw);
  return match ? { email: match[2], ...(match[1] ? { name: match[1] } : {}) } : { email: fromRaw.trim() };
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

/** A file to attach: text (CSV reports) or binary (a signed PDF). Text is sent as UTF-8; a Buffer is sent byte for byte. */
export type MailAttachment = { filename: string; content: Buffer | string; contentType?: string };
type Attachment = MailAttachment[];
const attachmentBytes = (a: MailAttachment): Buffer => (Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content, 'utf-8'));
const attachmentType = (a: MailAttachment): string => a.contentType || (/\.pdf$/i.test(a.filename) ? 'application/pdf' : 'text/csv');
interface LocalState {
  consecutiveFailures: number; cooldownUntil: number;
  dailyUsed: number; dailyWindowStart: number; monthlyUsed: number; monthlyWindowStart: number;
  lastError: string | null; lastErrorAt: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private resend: Resend | null = null;
  private readonly states = new Map<MailProvider, LocalState>();
  /** Without Mongo (unit use) the weekly keep-alive claims are kept here. */
  private readonly localKeepAlive = new Map<MailProvider, number>();
  private keepAliveRunning = false;
  /** The clock; tests move it to cross Riyadh day/month boundaries. */
  now: () => number = () => Date.now();

  constructor(private readonly events: EventEmitter2, @Optional() @InjectConnection() private conn?: Connection) {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    for (const provider of ALL_PROVIDERS) {
      this.states.set(provider, { consecutiveFailures: 0, cooldownUntil: 0, dailyUsed: 0, dailyWindowStart: 0, monthlyUsed: 0, monthlyWindowStart: 0, lastError: null, lastErrorAt: 0 });
    }
  }

  /** The configured order; MAIL_PROVIDER_ORDER overrides the default (and is the only way to add SES). */
  private order(): MailProvider[] {
    const raw = process.env.MAIL_PROVIDER_ORDER;
    if (!raw) return [...DEFAULT_ORDER];
    const listed = raw.split(',').map((s) => s.trim()).filter((p): p is MailProvider => ALL_PROVIDERS.includes(p as MailProvider));
    return [...new Set(listed)];
  }

  /** The providers that have their keys, in configured order. */
  activeProviders(): MailProvider[] {
    return this.order().filter((p) => this.isConfigured(p));
  }

  /** This Riyadh month's primary provider, or null when none is configured. */
  primaryProvider(now: number = this.now()): MailProvider | null {
    const active = this.activeProviders();
    if (!active.length) return null;
    return active[riyadhWindows(now).monthIndex % active.length];
  }

  /** The chain for one send: the month's primary first, then the others in configured order after it. */
  chain(now: number = this.now()): MailProvider[] {
    const active = this.activeProviders();
    if (!active.length) return [];
    const start = riyadhWindows(now).monthIndex % active.length;
    return [...active.slice(start), ...active.slice(0, start)];
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
    if (provider === 'brevo') return Boolean(process.env.BREVO_API_KEY);
    return Boolean(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);
  }

  private quotaKeys(provider: MailProvider, s: { dailyWindowStart: number; monthlyWindowStart: number }) {
    return { daily: `${provider}:d:${s.dailyWindowStart}`, monthly: `${provider}:m:${s.monthlyWindowStart}`, status: `${provider}:status` };
  }

  private quotaCollection() {
    return this.conn?.db?.collection<QuotaDoc>('mail_quota') ?? null;
  }

  /** Read the shared counters for the current windows (other instances, earlier runs) and the last error. */
  private async loadUsage(provider: MailProvider, now: number) {
    const s = this.rollWindows(provider, now);
    const col = this.quotaCollection();
    if (!col) return s;
    try {
      const keys = this.quotaKeys(provider, s);
      const docs = await col.find({ _id: { $in: [keys.daily, keys.monthly, keys.status] } }).toArray();
      s.dailyUsed = 0; s.monthlyUsed = 0;
      for (const d of docs) {
        if (d._id === keys.daily) s.dailyUsed = d.count ?? 0;
        if (d._id === keys.monthly) s.monthlyUsed = d.count ?? 0;
        if (d._id === keys.status && d.last_error_at) {
          const at = new Date(d.last_error_at).getTime();
          if (at >= s.lastErrorAt) { s.lastError = d.last_error ?? null; s.lastErrorAt = at; }
        }
      }
    } catch (e) {
      this.logger.warn(`mail_quota read failed for ${provider}: ${e instanceof Error ? e.message : String(e)}`);
    }
    return s;
  }

  /** Count one send in the shared store (atomic $inc, upserted per window, window start stored). */
  private async recordUsage(provider: MailProvider, s: LocalState) {
    const col = this.quotaCollection();
    if (!col) { s.dailyUsed += 1; s.monthlyUsed += 1; return; }
    try {
      const keys = this.quotaKeys(provider, s);
      const [d, m] = await Promise.all([
        col.findOneAndUpdate({ _id: keys.daily }, { $inc: { count: 1 }, $setOnInsert: { provider, window: 'daily', window_start: new Date(s.dailyWindowStart) } }, { upsert: true, returnDocument: 'after' }),
        col.findOneAndUpdate({ _id: keys.monthly }, { $inc: { count: 1 }, $setOnInsert: { provider, window: 'monthly', window_start: new Date(s.monthlyWindowStart) } }, { upsert: true, returnDocument: 'after' }),
      ]);
      s.dailyUsed = d?.count ?? s.dailyUsed + 1;
      s.monthlyUsed = m?.count ?? s.monthlyUsed + 1;
    } catch (e) {
      s.dailyUsed += 1; s.monthlyUsed += 1;
      this.logger.warn(`mail_quota write failed for ${provider}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Remember the provider's last error, locally and in the shared store (best-effort). */
  private async recordError(provider: MailProvider, s: LocalState, message: string, now: number) {
    s.lastError = message.slice(0, 300);
    s.lastErrorAt = now;
    try {
      await this.quotaCollection()?.updateOne(
        { _id: `${provider}:status` },
        { $set: { provider, last_error: s.lastError, last_error_at: new Date(now) } },
        { upsert: true },
      );
    } catch { /* observability never breaks delivery */ }
  }

  /** Refresh the cached counters from the shared store, then report state. */
  async sharedProviderState(): Promise<ProviderState[]> {
    const now = this.now();
    for (const provider of this.order()) await this.loadUsage(provider, now);
    return this.providerState();
  }

  /** Live provider state for the admin page (21.4). */
  providerState(): ProviderState[] {
    const now = this.now();
    const primary = this.primaryProvider(now);
    return this.order().map((provider) => {
      const s = this.rollWindows(provider, now);
      const dailyQuota = quotaFor(provider, 'daily');
      const monthlyQuota = quotaFor(provider, 'monthly');
      return {
        provider,
        configured: this.isConfigured(provider),
        primary: provider === primary,
        healthy: s.consecutiveFailures < 3 && s.cooldownUntil <= now,
        consecutive_failures: s.consecutiveFailures,
        cooldown_until: s.cooldownUntil ? new Date(s.cooldownUntil).toISOString() : null,
        daily_used: s.dailyUsed,
        monthly_used: s.monthlyUsed,
        daily_quota: dailyQuota,
        monthly_quota: monthlyQuota,
        daily_left: dailyQuota === null ? null : Math.max(0, dailyQuota - s.dailyUsed),
        monthly_left: monthlyQuota === null ? null : Math.max(0, monthlyQuota - s.monthlyUsed),
        last_error: s.lastError,
        last_error_at: s.lastErrorAt ? new Date(s.lastErrorAt).toISOString() : null,
      };
    });
  }

  /** Reset a provider's cached counters when its Riyadh day or month rolls over. */
  private rollWindows(provider: MailProvider, now: number) {
    const s = this.states.get(provider)!;
    const w = riyadhWindows(now);
    if (s.dailyWindowStart !== w.dayStart) { s.dailyWindowStart = w.dayStart; s.dailyUsed = 0; }
    if (s.monthlyWindowStart !== w.monthStart) { s.monthlyWindowStart = w.monthStart; s.monthlyUsed = 0; }
    return s;
  }

  private async sendViaResend(to: string, subject: string, html: string, text?: string, attachment?: Attachment): Promise<void> {
    if (!this.resend) throw new ServiceUnavailableException('resend_not_configured');
    // RESEND_BASE_URL (read by the SDK) points it at the local fake on the test stack; production stays on HTTPS.
    apiBase('RESEND_BASE_URL', 'https://api.resend.com');
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(attachment?.length ? { attachments: attachment.map((a) => ({ filename: a.filename, content: attachmentBytes(a).toString('base64') })) } : {}),
    });
    if (error) throw new BadGatewayException(error.message || 'resend_error');
  }

  private async sendViaSes(to: string, subject: string, html: string, text?: string, attachment?: Attachment): Promise<void> {
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
      ...(attachment?.length ? { attachments: attachment.map((a) => ({ filename: a.filename, content: attachmentBytes(a), contentType: attachmentType(a) })) } : {}),
    });
  }

  /** Brevo transactional email REST API (POST /v3/smtp/email, header api-key). */
  private async sendViaBrevo(to: string, subject: string, html: string, text?: string, attachment?: Attachment): Promise<void> {
    if (!this.isConfigured('brevo')) throw new ServiceUnavailableException('brevo_not_configured');
    const res = await timedFetch(`${apiBase('BREVO_API_BASE', 'https://api.brevo.com/v3')}/smtp/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': String(process.env.BREVO_API_KEY) },
      body: JSON.stringify({
        sender: parseFrom(process.env.BREVO_FROM || this.fromAddress),
        to: [{ email: to }],
        subject,
        htmlContent: html,
        ...(text ? { textContent: text } : {}),
        ...(attachment?.length ? { attachment: attachment.map((a) => ({ name: a.filename, content: attachmentBytes(a).toString('base64') })) } : {}),
      }),
    }, MAIL_FETCH);
    if (!res.ok) throw new BadGatewayException(`brevo_http_${res.status}`);
  }

  /** Mailjet Send API v3.1 over HTTPS with basic auth; no SDK needed. */
  private async sendViaMailjet(to: string, subject: string, html: string, text?: string, attachment?: Attachment): Promise<void> {
    if (!this.isConfigured('mailjet')) throw new ServiceUnavailableException('mailjet_not_configured');
    const f = parseFrom(process.env.MAILJET_FROM || this.fromAddress);
    const from = f.name ? { Email: f.email, Name: f.name } : { Email: f.email };
    const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');
    const res = await timedFetch(`${apiBase('MAILJET_API_BASE', 'https://api.mailjet.com/v3.1')}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        Messages: [{
          From: from,
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
          ...(text ? { TextPart: text } : {}),
          ...(attachment?.length ? { Attachments: attachment.map((a) => ({ ContentType: attachmentType(a), Filename: a.filename, Base64Content: attachmentBytes(a).toString('base64') })) } : {}),
        }],
      }),
    }, MAIL_FETCH);
    if (!res.ok) throw new BadGatewayException(`mailjet_http_${res.status}`);
    const body = (await res.json().catch(() => null)) as { Messages?: Array<{ Status?: string }> } | null;
    if (body?.Messages?.[0]?.Status !== 'success') throw new BadGatewayException('mailjet_error');
  }

  /** The month's primary first, then the others. Never throws; the caller reads `ok`. */
  async send(to: string, subject: string, html: string, text?: string): Promise<MailResult> {
    return this.sendWithAttachment({ to, subject, html, text });
  }

  /**
   * Send with an optional CSV attachment (scheduled reports, A7).
   * Attachment is base64 for the REST providers, Buffer for nodemailer (SES).
   */
  async sendWithAttachment(opts: { to: string; subject: string; html: string; text?: string; filename?: string; content?: Buffer | string; attachments?: MailAttachment[] }): Promise<MailResult> {
    // One file (filename + content) or several (attachments). A Buffer travels as the bytes it holds: a PDF is no longer turned into UTF-8 text.
    const attachment: Attachment = [
      ...(opts.filename && opts.content ? [{ filename: opts.filename, content: opts.content }] : []),
      ...(opts.attachments ?? []).filter((a) => a?.filename && a.content && (typeof a.content === 'string' ? a.content.length : a.content.length)),
    ];
    const now = this.now();
    let attempted = 0;
    let lastError = 'no_provider_configured';

    const chain = this.chain(now);
    for (const provider of chain) {
      const state = await this.loadUsage(provider, now);
      if (state.cooldownUntil > now) {
        this.logger.warn(`mail provider ${provider} is in cooldown until ${new Date(state.cooldownUntil).toISOString()}`);
        continue;
      }
      if (quotaUsedUp(provider, state)) {
        this.logger.warn(`mail provider ${provider} quota used up; moving to the next provider`);
        continue;
      }
      attempted += 1;
      const sent = await this.trySend(provider, state, now, opts.to, opts.subject, opts.html, opts.text, attachment);
      if (sent === true) {
        // A fall-over is any send that did not go through the month's primary (failed, cooling down or out of quota).
        const fallback = provider !== chain[0];
        this.events.emit('mail.sent', { to: opts.to, subject: opts.subject, provider, fallback_used: fallback });
        await this.logMail(opts.to, opts.subject, true, provider, fallback);
        return { ok: true, provider, fallback_used: fallback };
      }
      lastError = sent;
      this.logger.warn(`${provider} failed for ${opts.to}: ${lastError} — trying the next provider`);
    }

    this.logger.error(`No mail provider delivered to ${opts.to}: ${lastError}`);
    this.events.emit('mail.failed', { to: opts.to, subject: opts.subject, error: lastError });
    await this.logMail(opts.to, opts.subject, false, 'none', attempted > 0);
    return { ok: false, provider: 'none', fallback_used: attempted > 0, error: lastError };
  }

  /** One attempt through one provider: counts it on success, records the error and the cooldown on failure. */
  private async trySend(provider: MailProvider, state: LocalState, now: number, to: string, subject: string, html: string, text: string | undefined, attachment: Attachment): Promise<true | string> {
    try {
      await this.withTimeout(this.dispatch(provider, to, subject, html, text, attachment), SEND_TIMEOUT_MS, provider);
      await this.recordUsage(provider, state);
      state.consecutiveFailures = 0;
      state.cooldownUntil = 0;
      return true;
    } catch (e) {
      const message = (e instanceof Error && e.message) || 'mail_send_failed';
      state.consecutiveFailures += 1;
      if (state.consecutiveFailures >= 3) {
        state.cooldownUntil = now + COOLDOWN_MS;
        this.logger.error(`mail provider ${provider} failed ${state.consecutiveFailures} times; cooling down`);
      }
      await this.recordError(provider, state, message, now);
      return message;
    }
  }

  // ── Weekly keep-alive ─────────────────────────────────────────

  /** Hourly where background work runs (common/process-role.ts); each provider is claimed once per Riyadh week. */
  @Cron(process.env.MAIL_KEEPALIVE_CRON || '23 * * * *')
  async scheduledKeepAlive() {
    if (this.keepAliveRunning) return;
    this.keepAliveRunning = true;
    try {
      await this.runKeepAlive();
    } catch (e) {
      this.logger.error(`keepalive_failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.keepAliveRunning = false;
    }
  }

  /** Atomically claims this week for a provider; false when another run (any process) already has it. */
  private async claimWeek(provider: MailProvider, week: number, now: number): Promise<boolean> {
    const col = this.conn?.db?.collection<KeepAliveDoc>('mail_keepalive');
    if (!col) {
      if (this.localKeepAlive.get(provider) === week) return false;
      this.localKeepAlive.set(provider, week);
      return true;
    }
    try {
      const r = await col.updateOne({ _id: provider, week: { $ne: week } }, { $set: { week, claimed_at: new Date(now) } }, { upsert: true });
      return r.modifiedCount + r.upsertedCount === 1;
    } catch (e) {
      // E11000: the document exists with this week already, so the upsert collided — someone else claimed it.
      if ((e as { code?: number }).code === 11000) return false;
      throw e;
    }
  }

  /** Gives a failed week back so the next hourly run tries again. */
  private async releaseWeek(provider: MailProvider, week: number) {
    const col = this.conn?.db?.collection<KeepAliveDoc>('mail_keepalive');
    if (!col) { this.localKeepAlive.delete(provider); return; }
    await col.updateOne({ _id: provider, week }, { $set: { week: week - 1 } }).catch(() => undefined);
  }

  /** Sends one ops summary through each non-primary provider that has not had one this Riyadh week. */
  async runKeepAlive(): Promise<Array<{ provider: MailProvider; ok: boolean; error?: string }>> {
    const to = process.env.OPS_ALERT_EMAIL;
    if (!to) return [];
    const now = this.now();
    const primary = this.primaryProvider(now);
    const week = riyadhWindows(now).week;
    const summary = await this.sharedProviderState();
    const rows = summary.filter((s) => s.configured).map((s) =>
      `<tr><td>${escapeHtml(s.provider)}${s.primary ? ' (primary)' : ''}</td><td>${s.daily_used}/${s.daily_quota ?? '∞'}</td><td>${s.monthly_used}/${s.monthly_quota ?? '∞'}</td><td>${escapeHtml(s.last_error ?? '')}</td></tr>`).join('');
    const out: Array<{ provider: MailProvider; ok: boolean; error?: string }> = [];
    for (const provider of this.activeProviders()) {
      if (provider === primary) continue;
      if (!(await this.claimWeek(provider, week, now))) continue;
      const state = await this.loadUsage(provider, now);
      const subject = `Nabd+ mail keep-alive — ${provider}`;
      const html = `<div dir="ltr" style="font-family: system-ui, sans-serif;"><p>Weekly mail summary, sent through ${escapeHtml(provider)} to keep the account active.</p>`
        + `<table border="1" cellpadding="4" style="border-collapse: collapse;"><tr><th>Provider</th><th>Today</th><th>Month</th><th>Last error</th></tr>${rows}</table></div>`;
      const sent = await this.trySend(provider, state, now, to, subject, html, `Weekly mail summary via ${provider}.`, null);
      if (sent === true) {
        await this.conn?.db?.collection<KeepAliveDoc>('mail_keepalive').updateOne({ _id: provider }, { $set: { sent_at: new Date(now) } }).catch(() => undefined);
        await this.logMail(to, subject, true, provider, false);
        out.push({ provider, ok: true });
      } else {
        await this.releaseWeek(provider, week);
        out.push({ provider, ok: false, error: sent });
      }
    }
    return out;
  }

  private dispatch(
    provider: MailProvider,
    to: string,
    subject: string,
    html: string,
    text?: string,
    attachment?: Attachment,
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