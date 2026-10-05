/**
 * C6.4: AI referral tracking.
 *
 * Records visits that arrive from an AI assistant (chat.openai.com,
 * chatgpt.com, perplexity.ai, gemini, copilot, claude.ai) so the admin report
 * can show which assistants send traffic. The website proxy sends one beacon
 * per such page request (POST /analytics/ai-referral).
 */

import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export const AI_REFERRER_HOSTS = [
  'chat.openai.com',
  'chatgpt.com',
  'perplexity.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
  'claude.ai',
] as const;

export interface AiReferralInput {
  referrer?: string;
  path?: string;
  utm_source?: string;
  user_agent?: string;
}

/** The AI host a referrer URL belongs to (exact host or a subdomain of it), else null. */
export function aiReferrerHost(referrer: string | undefined): string | null {
  if (!referrer) return null;
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  return AI_REFERRER_HOSTS.find((ai) => host === ai || host.endsWith(`.${ai}`)) ?? null;
}

/** The AI host named by a utm_source value (e.g. "chatgpt.com"), else null. */
export function aiUtmSource(utmSource: string | undefined): string | null {
  const v = String(utmSource || '').trim().toLowerCase();
  if (!v) return null;
  return AI_REFERRER_HOSTS.find((ai) => v === ai || v.endsWith(`.${ai}`)) ?? null;
}

@Injectable()
export class AiReferralService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get referrals() {
    return this.conn.collection('ai_referrals');
  }

  /** Record a visit when the referrer host or the utm_source is an AI assistant. */
  async record(input: AiReferralInput): Promise<{ ok: true; host: string } | { ok: false; reason: 'not_ai_referrer' }> {
    const host = aiReferrerHost(input.referrer) ?? aiUtmSource(input.utm_source);
    if (!host) return { ok: false, reason: 'not_ai_referrer' };
    await this.referrals.insertOne({
      referrer_host: host,
      referrer: input.referrer ? String(input.referrer).slice(0, 512) : null,
      utm_source: input.utm_source ? String(input.utm_source).slice(0, 128) : null,
      path: String(input.path || '/').slice(0, 512),
      user_agent: input.user_agent ? String(input.user_agent).slice(0, 512) : null,
      created_at: new Date(),
    });
    return { ok: true, host };
  }

  /** Visits per AI assistant host for the admin report. */
  async stats() {
    return this.referrals.aggregate([
      { $group: { _id: '$referrer_host', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
  }
}
