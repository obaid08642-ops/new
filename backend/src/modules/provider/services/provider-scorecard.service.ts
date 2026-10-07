import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { computeScorecard, Scorecard } from './provider-scorecard.math';
import { RecordComplaintDto } from './provider-scorecard.dto';

/**
 * P22.12 — provider scorecards from real data.
 *
 * Sources (read-only): provider_requests (acceptance/cancellations),
 * provider_assignment_attempts (time-to-accept), ratings (avg),
 * provider_complaints (this module's intake).
 * Ranking feed: blended reliability is written back into the
 * provider_scores snapshot — the exact field ProviderMatchingService
 * already weights (reliability 150/1000). Admin alerts land in
 * provider_quality_alerts on threshold breach.
 */
@Injectable()
export class ProviderScorecardService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  async recordComplaint(dto: RecordComplaintDto): Promise<Record<string, unknown>> {
    const dup = await this.conn
      .collection('provider_complaints')
      .findOne({ idempotencyKey: { $eq: String(dto.idempotencyKey) } });
    if (dup) {
      const { _id, ...rest } = dup as unknown as Record<string, unknown>;
      void _id;
      return rest;
    }
    const doc = {
      id: this.newId('pc'),
      provider_account_id: String(dto.providerAccountId),
      reporter_user_id: String(dto.reporterUserId),
      category: String(dto.category),
      details: String(dto.details),
      order_id: dto.orderId ? String(dto.orderId) : null,
      status: 'open',
      idempotencyKey: String(dto.idempotencyKey),
      createdAt: new Date(),
    };
    await this.conn.collection('provider_complaints').insertOne(doc as unknown as Record<string, unknown>);
    return doc;
  }

  async resolveComplaint(id: string, outcome: 'resolved' | 'rejected', reason: string, idempotencyKey: string) {
    const dup = await this.conn.collection('complaint_resolutions').findOne({ idempotencyKey: { $eq: idempotencyKey } });
    if (dup) {
      const { _id, ...rest } = dup as unknown as Record<string, unknown>;
      void _id;
      return rest;
    }
    await this.conn
      .collection('provider_complaints')
      .updateOne({ id: { $eq: String(id) } }, { $set: { status: outcome, resolution_reason: String(reason) } });
    const record = {
      id: this.newId('pcr'),
      complaintId: String(id),
      outcome,
      reason: String(reason),
      idempotencyKey: String(idempotencyKey),
      createdAt: new Date(),
    };
    await this.conn.collection('complaint_resolutions').insertOne(record as unknown as Record<string, unknown>);
    return record;
  }

  async compute(providerAccountId: string): Promise<Scorecard & { provider_account_id: string }> {
    const pid = String(providerAccountId);
    const reqCol = this.conn.collection('provider_requests');
    const [total, accepted, rejected, cancelled, completed] = await Promise.all([
      reqCol.countDocuments({ provider_account_id: { $eq: pid } }),
      reqCol.countDocuments({ provider_account_id: { $eq: pid }, status: { $eq: 'accepted' } }),
      reqCol.countDocuments({ provider_account_id: { $eq: pid }, status: { $eq: 'rejected' } }),
      reqCol.countDocuments({ provider_account_id: { $eq: pid }, status: { $eq: 'cancelled' } }),
      reqCol.countDocuments({ provider_account_id: { $eq: pid }, status: { $eq: 'completed' } }),
    ]);
    const attempts = (await this.conn
      .collection('provider_assignment_attempts')
      .find({ provider_account_id: { $eq: pid }, status: { $eq: 'accepted' } })
      .limit(500)
      .toArray()) as unknown as Array<Record<string, unknown>>;
    const responseSeconds: number[] = [];
    for (const a of attempts) {
      const sent = a['sent_at'];
      const resp = a['responded_at'];
      if (sent instanceof Date && resp instanceof Date) {
        responseSeconds.push(Math.max(0, Math.round((resp.getTime() - sent.getTime()) / 1000)));
      }
    }
    const ratings = (await this.conn
      .collection('ratings')
      .find({ provider_id: { $eq: pid } })
      .limit(1000)
      .toArray()) as unknown as Array<Record<string, unknown>>;
    const published = ratings.filter((r) => String(r['status'] || 'published') === 'published');
    const scores = published
      .map((r) => Number(r['score'] ?? r['rating']))
      .filter((n) => Number.isFinite(n));
    const avgRating = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

    const complaints = (await this.conn
      .collection('provider_complaints')
      .find({ provider_account_id: { $eq: pid } })
      .limit(1000)
      .toArray()) as unknown as Array<Record<string, unknown>>;
    const complaintsOpen = complaints.filter((c) => String(c['status'] || 'open') === 'open').length;

    // P22.12/Phase 1.1 — mystery-shopper component: average of submitted
    // findings for this provider. Same collection the analytics
    // MysteryShopperService writes; no cross-module import.
    const findings = (await this.conn
      .collection('mystery_shop_findings')
      .find({ provider_account_id: { $eq: pid } })
      .limit(1000)
      .toArray()
      .catch(() => [])) as unknown as Array<Record<string, unknown>>;
    const findingScores = findings
      .map((f) => Number(f['score']))
      .filter((n) => Number.isFinite(n));
    const mysteryShopper = {
      avgScore:
        findingScores.length > 0
          ? Math.round((findingScores.reduce((a, b) => a + b, 0) / findingScores.length) * 10) / 10
          : null,
      visits: findingScores.length,
    };

    const decided = accepted + rejected;
    const acceptanceRate = decided > 0 ? accepted / decided : 0;
    const completionRate = accepted > 0 ? completed / accepted : 0;
    const avgResp = responseSeconds.length > 0 ? responseSeconds.reduce((a, b) => a + b, 0) / responseSeconds.length : 0;
    const responseBonus = avgResp === 0 ? 0 : Math.max(0, 1 - Math.min(avgResp, 600) / 600);
    const base = Math.round(acceptanceRate * 50 + completionRate * 30 + responseBonus * 20);

    const card = computeScorecard(
      {
        totalRequests: total,
        accepted,
        rejected,
        cancelled,
        completed,
        acceptResponseSeconds: responseSeconds,
        avgRating,
        ratingsCount: scores.length,
        complaintsOpen,
        complaintsTotal: complaints.length,
        mysteryShopper,
      },
      base,
    );
    return { provider_account_id: pid, ...card };
  }

  /**
   * Recompute + persist: scorecard row, blended reliability back into the
   * provider_scores snapshot (ranking feed), quality alert on breach.
   * Idempotent per (provider, day): same-day recompute updates in place.
   */
  async recompute(providerAccountId: string): Promise<Record<string, unknown>> {
    const card = await this.compute(providerAccountId);
    const day = new Date().toISOString().slice(0, 10);
    await this.conn.collection('provider_scorecards').updateOne(
      { provider_account_id: { $eq: card.provider_account_id }, day: { $eq: day } },
      {
        $set: {
          provider_account_id: card.provider_account_id,
          day,
          acceptance_rate: card.acceptanceRate,
          time_to_accept_median_seconds: card.timeToAcceptMedianSeconds,
          cancellation_rate: card.cancellationRate,
          avg_rating: card.avgRating,
          ratings_count: card.ratingsCount,
          complaints_open: card.complaintsOpen,
          complaints_total: card.complaintsTotal,
          reliability_blended: card.reliabilityBlended,
          mystery_shopper_avg: card.mysteryShopper.avgScore,
          mystery_shopper_visits: card.mysteryShopper.visits,
          tier: card.tier,
          breached: card.breached,
          breach_reasons: card.breachReasons,
          calculated_at: new Date(),
        },
      },
      { upsert: true },
    );
    // Ranking feed: the matching engine reads reliability_score/acceptance_rate.
    await this.conn.collection('provider_scores').updateOne(
      { provider_account_id: { $eq: card.provider_account_id } },
      {
        $set: {
          provider_account_id: card.provider_account_id,
          reliability_score: card.reliabilityBlended,
          acceptance_rate: card.acceptanceRate,
          avg_rating: card.avgRating,
          complaints_open: card.complaintsOpen,
          mystery_shopper_avg: card.mysteryShopper.avgScore,
          mystery_shopper_visits: card.mysteryShopper.visits,
          quality_tier: card.tier,
          last_calculated_at: new Date(),
        },
      },
      { upsert: true },
    );
    let alert: Record<string, unknown> | null = null;
    if (card.breached) {
      alert = {
        id: this.newId('pqa'),
        provider_account_id: card.provider_account_id,
        reasons: card.breachReasons,
        reliability: card.reliabilityBlended,
        status: 'open',
        day,
        createdAt: new Date(),
      };
      const dup = await this.conn
        .collection('provider_quality_alerts')
        .findOne({ provider_account_id: { $eq: card.provider_account_id }, day: { $eq: day } });
      if (!dup) {
        await this.conn.collection('provider_quality_alerts').insertOne(alert as unknown as Record<string, unknown>);
      } else {
        const { _id, ...rest } = dup as unknown as Record<string, unknown>;
        void _id;
        alert = rest;
      }
    }
    return { ...card, alert };
  }

  async getAlerts(providerAccountId?: string, limit = 50): Promise<Array<Record<string, unknown>>> {
    const filter: Record<string, unknown> = {};
    if (providerAccountId) filter['provider_account_id'] = { $eq: String(providerAccountId) };
    const rows = await this.conn
      .collection('provider_quality_alerts')
      .find(filter)
      .limit(Math.min(100, Math.max(1, limit)))
      .toArray();
    return (rows as unknown as Array<Record<string, unknown>>).map((r) => {
      const { _id, ...rest } = r;
      void _id;
      return rest;
    });
  }
}
