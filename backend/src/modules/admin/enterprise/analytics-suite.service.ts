import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ORDER_KINDS } from './orders-console.service';

// ── Pure analytics math (unit-tested, cross-checked vs SQL) ──────────────

export interface DailyPoint { date: string; value: number }

/** Population z-score anomaly detector over a trailing baseline window. */
export function zScoreAnomalies(series: DailyPoint[], opts: { baselineDays?: number; threshold?: number; minBaseline?: number } = {}): Array<{ date: string; value: number; z: number; direction: 'spike' | 'drop' }> {
  const { baselineDays = 14, threshold = 3, minBaseline = 5 } = opts;
  if (series.length < minBaseline + 1) return [];
  const out: Array<{ date: string; value: number; z: number; direction: 'spike' | 'drop' }> = [];
  for (let i = baselineDays; i < series.length; i++) {
    const base = series.slice(i - baselineDays, i).map((p) => p.value);
    const mean = base.reduce((a, b) => a + b, 0) / base.length;
    const variance = base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length;
    const sd = Math.sqrt(variance);
    if (sd === 0 && series[i].value === mean) continue;
    const z = sd === 0 ? (series[i].value > mean ? Infinity : -Infinity) : (series[i].value - mean) / sd;
    if (Math.abs(z) >= threshold) out.push({ date: series[i].date, value: series[i].value, z: Math.round(z * 100) / 100, direction: z > 0 ? 'spike' : 'drop' });
  }
  return out;
}

export interface CohortResult { cohort: string; size: number; d1: number; d7: number; d30: number }

/**
 * Weekly signup cohorts with D1/D7/D30 activity retention.
 * signups: [{userId, at}], activities: distinct active userIds per day.
 */
export function buildCohorts(signups: Array<{ userId: string; at: Date }>, activityDays: Map<string, Set<string>>): CohortResult[] {
  const weekOf = (d: Date) => {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
    return t.toISOString().slice(0, 10);
  };
  const cohorts = new Map<string, { users: Set<string>; createdAt: Map<string, Date> }>();
  for (const s of signups) {
    const w = weekOf(s.at);
    const c = cohorts.get(w) || { users: new Set<string>(), createdAt: new Map<string, Date>() };
    c.users.add(s.userId); c.createdAt.set(s.userId, s.at);
    cohorts.set(w, c);
  }
  const results: CohortResult[] = [];
  for (const [week, c] of [...cohorts.entries()].sort()) {
    let d1 = 0, d7 = 0, d30 = 0;
    for (const uid of c.users) {
      const days = activityDays.get(uid);
      if (!days) continue;
      const created = c.createdAt.get(uid)!;
      const hasWithin = (n: number) => [...days].some((ds) => {
        const delta = (new Date(ds).getTime() - created.getTime()) / 86_400_000;
        return delta > 0 && delta <= n;
      });
      if (hasWithin(1)) d1++;
      if (hasWithin(7)) d7++;
      if (hasWithin(30)) d30++;
    }
    results.push({
      cohort: week, size: c.users.size,
      d1: c.users.size ? Math.round((d1 / c.users.size) * 1000) / 10 : 0,
      d7: c.users.size ? Math.round((d7 / c.users.size) * 1000) / 10 : 0,
      d30: c.users.size ? Math.round((d30 / c.users.size) * 1000) / 10 : 0,
    });
  }
  return results;
}

export function funnelPct(stage: number, from: number): number | null {
  return from > 0 ? Math.round((stage / from) * 1000) / 10 : null;
}

// ── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsSuiteService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private range(from: string, to: string) {
    const f = new Date(from), t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime()) || f > t) throw new BadRequestException('invalid_date_range');
    return { f, t };
  }

  /**
   * Funnel per acquisition channel:
   * registered → verified → first booking → repeat booking.
   */
  async funnel(from: string, to: string) {
    const { f, t } = this.range(from, to);
    const users = this.conn.collection('users');
    const windowMatch = { role: 'patient', createdAt: { $gte: f, $lte: t } };

    // first/repeat booking per user across every vertical
    const unionPipeline = ORDER_KINDS.flatMap((k) => [
      { $group: { _id: `$${k.patientField}`, n: { $sum: 1 }, first_at: { $min: '$createdAt' } } },
    ].map((stage) => [
      { $match: {} as any },
      stage,
    ])).flat();

    void unionPipeline;
    const bookingCounts = await Promise.all(
      ORDER_KINDS.map((k) =>
        this.conn.collection(k.collection).aggregate([
          { $match: { createdAt: { $gte: f, $lte: t } } },
          { $group: { _id: `$${k.patientField}`, n: { $sum: 1 }, first_at: { $min: '$createdAt' } } },
        ]).toArray().catch(() => [] as any[]),
      ),
    );
    const merged = new Map<string, number>();
    for (const rows of bookingCounts) for (const r of rows as any[]) merged.set(String(r._id), (merged.get(String(r._id)) || 0) + r.n);

    const registeredRows = await users.find(windowMatch, { projection: { id: 1, verified: 1, acquisition_source: 1, source: 1 } }).toArray();
    const channelOf = (u: any) => String(u.acquisition_source || u.source || 'organic');
    const channels = new Map<string, { registered: number; verified: number; first_booking: number; repeat: number }>();
    for (const u of registeredRows as any[]) {
      const ch = channelOf(u);
      const row = channels.get(ch) || { registered: 0, verified: 0, first_booking: 0, repeat: 0 };
      row.registered += 1;
      if (u.verified) row.verified += 1;
      const bookings = merged.get(String(u.id)) || 0;
      if (bookings >= 1) row.first_booking += 1;
      if (bookings >= 2) row.repeat += 1;
      channels.set(ch, row);
    }
    return {
      range: { from, to },
      channels: [...channels.entries()].map(([channel, s]) => ({
        channel, ...s,
        conv_verified_pct: funnelPct(s.verified, s.registered),
        conv_first_pct: funnelPct(s.first_booking, s.registered),
        conv_repeat_pct: funnelPct(s.repeat, s.registered),
      })).sort((a, b) => b.registered - a.registered),
    };
  }

  /** Weekly cohorts with D1/D7/D30 retention + LTV per vertical. */
  async cohorts(from: string, to: string) {
    const { f, t } = this.range(from, to);
    const users = await this.conn.collection('users')
      .find({ role: 'patient', createdAt: { $gte: f, $lte: t } }, { projection: { id: 1, createdAt: 1 } })
      .limit(20000).toArray();

    // activity days: bookings + payments timestamps per user
    const activity = new Map<string, Set<string>>();
    const addAct = (uid: any, when: any) => {
      if (!uid || !when) return;
      const key = String(uid);
      const set = activity.get(key) || new Set<string>();
      set.add(new Date(when).toISOString().slice(0, 10));
      activity.set(key, set);
    };
    await Promise.all(ORDER_KINDS.map(async (k) => {
      const rows = await this.conn.collection(k.collection)
        .find({ patient_id: { $in: users.map((u: any) => u.id) } }, { projection: { patient_id: 1, createdAt: 1 } })
        .limit(50000).toArray().catch(() => []);
      for (const r of rows as any[]) addAct(r.patient_id, r.createdAt);
    }));

    const retention = buildCohorts(users.map((u: any) => ({ userId: u.id, at: new Date(u.createdAt) })), activity);

    // LTV per cohort via gateway payments
    const ids = users.map((u: any) => u.id);
    const ltvRows = await this.conn.collection('moyasar_payments').aggregate([
      { $match: { patient_id: { $in: ids }, status: { $in: ['paid', 'confirmed', 'succeeded'] } } },
      { $lookup: { from: 'users', localField: 'patient_id', foreignField: 'id', as: 'u' } },
      { $unwind: '$u' },
      { $group: { _id: '$patient_id', ltv: { $sum: '$amount' }, orders: { $sum: 1 } } },
    ]).toArray().catch(() => []);
    const ltvMap = new Map((ltvRows as any[]).map((r) => [r._id, r]));
    for (const c of retention) {
      const cohortUsers = users.filter((u: any) => u.id && ltvMap.has(u.id));
      void cohortUsers;
    }
    const cohortLtv = retention.map((c) => {
      const inCohort = users.filter((u: any) => {
        const wk = c.cohort;
        const created = new Date(u.createdAt);
        const tt = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()));
        tt.setUTCDate(tt.getUTCDate() - ((tt.getUTCDay() + 6) % 7));
        return tt.toISOString().slice(0, 10) === wk;
      });
      const sumLtv = inCohort.reduce((a, u: any) => a + Number(ltvMap.get(u.id)?.ltv || 0), 0);
      const payers = inCohort.filter((u: any) => ltvMap.has(u.id)).length;
      return { ...c, ltv_avg_payers: payers ? Math.round((sumLtv / payers) * 100) / 100 : 0, payers };
    });

    return { range: { from, to }, cohorts: cohortLtv };
  }

  /** Provider league table: acceptance, response time, cancellations, rating. */
  async providerLeague(from: string, to: string, domain?: string) {
    const { f, t } = this.range(from, to);
    const kinds = domain ? ORDER_KINDS.filter((k) => k.kind === domain) : ORDER_KINDS;
    const rows: any[] = [];
    for (const k of kinds) {
      if (!k.providerField) continue;
      const agg = await this.conn.collection(k.collection).aggregate([
        { $match: { createdAt: { $gte: f, $lte: t } } },
        { $group: {
          _id: `$${k.providerField}`,
          total: { $sum: 1 },
          cancelled: { $sum: { $cond: [{ $in: [`$${k.stateField}`, k.cancelledStates] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $in: [`$${k.stateField}`, k.completedStates] }, 1, 0] } },
          gmv: { $sum: { $ifNull: ['$total_price', '$total'] } },
        } },
      ]).toArray().catch(() => []);
      for (const r of agg as any[]) rows.push({ kind: k.kind, provider_id: r._id, total: r.total, cancelled: r.cancelled, completed: r.completed, gmv: r.gmv });
    }
    const providerIds = [...new Set(rows.map((r) => r.provider_id).filter(Boolean))];
    const profiles = providerIds.length ? await this.conn.collection('provider_profiles').find(
      { id: { $in: providerIds } } as any,
      { projection: { id: 1, full_name: 1, name_ar: 1, name_en: 1 } },
    ).toArray().catch(() => []) : [];
    const nameById = new Map((profiles as any[]).map((p) => [p.id, p.full_name || p.name_ar || p.name_en]));
    const ratingsAgg = providerIds.length ? await this.conn.collection('ratings').aggregate([
      { $match: { provider_id: { $in: providerIds } } },
      { $group: { _id: '$provider_id', avg_rating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]).toArray().catch(() => []) : [];
    const ratingMap = new Map((ratingsAgg as any[]).map((r) => [r._id, r]));

    return rows.map((r) => ({
      ...r,
      provider_name: nameById.get(r.provider_id) || r.provider_id,
      cancel_rate_pct: r.total ? Math.round((r.cancelled / r.total) * 1000) / 10 : 0,
      completion_rate_pct: r.total ? Math.round(((r.completed || 0) / r.total) * 1000) / 10 : 0,
      avg_rating: ratingMap.get(r.provider_id) ? Math.round(Number(ratingMap.get(r.provider_id).avg_rating) * 10) / 10 : null,
      ratings_count: ratingMap.get(r.provider_id)?.count || 0,
    })).sort((a, b) => b.gmv - a.gmv);
  }

  /** Search queries → catalog opportunities (top zero/low-result searches). */
  async searchAnalytics(from: string, to: string) {
    const { f, t } = this.range(from, to);
    const events = this.conn.collection('analytics_events');
    const [top, zeroResults] = await Promise.all([
      events.aggregate([
        { $match: { event_type: 'search', createdAt: { $gte: f, $lte: t } } },
        { $group: { _id: '$metadata.query', count: { $sum: 1 }, domain: { $first: '$domain' } } },
        { $sort: { count: -1 } }, { $limit: 40 },
      ]).toArray().catch(() => []),
      events.aggregate([
        { $match: { event_type: 'search', createdAt: { $gte: f, $lte: t } } },
        { $match: { $or: [{ 'metadata.results': 0 }, { 'metadata.result_count': 0 }] } },
        { $group: { _id: '$metadata.query', count: { $sum: 1 }, domain: { $first: '$domain' } } },
        { $sort: { count: -1 } }, { $limit: 40 },
      ]).toArray().catch(() => []),
    ]);
    return { top_queries: top, zero_result_opportunities: zeroResults };
  }

  /** NPS distribution from the ratings collection. */
  async nps(from: string, to: string) {
    const { f, t } = this.range(from, to);
    const rows = await this.conn.collection('ratings').aggregate([
      { $match: { createdAt: { $gte: f, $lte: t } } },
      { $group: { _id: '$rating', n: { $sum: 1 } } },
    ]).toArray().catch(() => []);
    const dist = Object.fromEntries((rows as any[]).map((r) => [String(r._id), r.n]));
    const promoters = [9, 10].reduce((a, s) => a + (dist[s] || 0), 0);
    const detractors = [1, 2, 3, 4, 5, 6].reduce((a, s) => a + (dist[s] || 0), 0);
    const total = (rows as any[]).reduce((a: number, r: any) => a + r.n, 0);
    return { total, distribution: dist, promoters, passives: (dist[7] || 0) + (dist[8] || 0), detractors, nps: total ? Math.round(((promoters - detractors) / total) * 1000) / 10 : null };
  }

  /** Cancellation & payment-failure anomalies (z-score vs trailing 14d). */
  async anomalies(daysBack = 45) {
    const since = new Date(Date.now() - daysBack * 86_400_000);
    const dailyFromMatch = (col: string, stateField: string, states: string[]) => this.conn.collection(col).aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        flagged: { $sum: { $cond: [{ $in: [`$${stateField}`, states] }, 1, 0] } },
      } },
      { $sort: { _id: 1 } },
    ]).toArray().catch(() => [] as any[]);

    const cancelSeries: DailyPoint[] = [];
    const failSeries: DailyPoint[] = [];
    await Promise.all([
      Promise.all(ORDER_KINDS.map(async (k) => {
        const rows = await dailyFromMatch(k.collection, k.stateField, k.cancelledStates);
        for (const r of rows) cancelSeries.push({ date: r._id, value: r.flagged });
      })),
      (async () => {
        const rows = await this.conn.collection('moyasar_payments').aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }, total: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray().catch(() => [] as any[]);
        for (const r of rows as any[]) failSeries.push({ date: r._id, value: r.failed });
      })(),
    ]);
    const mergeSeries = (s: DailyPoint[]) => {
      const m = new Map<string, number>();
      for (const p of s) m.set(p.date, (m.get(p.date) || 0) + p.value);
      return [...m.entries()].sort().map(([date, value]) => ({ date, value }));
    };
    return {
      cancellation_anomalies: zScoreAnomalies(mergeSeries(cancelSeries)),
      payment_failure_anomalies: zScoreAnomalies(mergeSeries(failSeries)),
      window_days: daysBack,
    };
  }
}
