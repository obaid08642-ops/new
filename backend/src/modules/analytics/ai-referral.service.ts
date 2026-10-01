/**
 * C6.4: AI referral tracking.
 *
 * Tracks referrals from AI assistants (chat.openai.com, perplexity.ai, gemini,
 * copilot, claude.ai) in analytics and an admin report.
 *
 * The referrer is extracted from the request headers and stored in a
 * collection for reporting.
 */

import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const AI_REFERRERS = [
  'chat.openai.com',
  'perplexity.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
  'claude.ai',
];

@Injectable()
export class AiReferralService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get referrals() {
    return this.conn.collection('ai_referrals');
  }

  /** Extract the AI referrer from a request, or null if not an AI referral. */
  extractReferrer(referer: string | undefined): string | null {
    if (!referer) return null;
    try {
      const url = new URL(referer);
      const host = url.hostname.toLowerCase();
      return AI_REFERRERS.find((r) => host.includes(r)) || null;
    } catch {
      return null;
    }
  }

  /** Record an AI referral. */
  async recordReferral(referrer: string, path: string, userAgent?: string) {
    await this.referrals.insertOne({
      referrer,
      path,
      user_agent: userAgent || null,
      created_at: new Date(),
    });
    return { ok: true };
  }

  /** Get AI referral stats for the admin report. */
  async getStats() {
    const stats = await this.referrals.aggregate([
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
    return stats;
  }
}
