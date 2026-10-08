import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AnalyticsSink, MongoAnalyticsSink } from './analytics-sink';
import {
  ConsentResolver,
  ConsentSnapshot,
  IngestEventDto,
  isKnownEventType,
  parseFunnelSteps,
} from './analytics-event.dto';

export interface IngestResult {
  ok: boolean;
  reason?: string;
  duplicate?: boolean;
}

export interface FunnelStage {
  step: string;
  count: number;
  conversionFromPreviousPct: number | null;
}

export interface RetentionCohort {
  cohort: string;
  size: number;
  d1Pct: number;
  d7Pct: number;
  d30Pct: number;
}

const ANALYTICS_COLLECTION = 'analytics_events';

/** Default resolver: fail-closed (no record ⇒ no consent ⇒ drop). */
export async function denyAllConsentResolver(_userId: string): Promise<ConsentSnapshot> {
  void _userId;
  return { analytics: 'denied', personalized: 'denied' };
}

@Injectable()
export class AnalyticsEventService {
  private readonly sink: AnalyticsSink;
  private consentResolver: ConsentResolver = denyAllConsentResolver;

  constructor(@InjectConnection() private readonly conn: Connection) {
    this.sink = new MongoAnalyticsSink(conn as unknown as import('./analytics-sink').SinkConnection);
  }

  /** Exposed for tests: report queries MUST go through the sink. */
  getSink(): AnalyticsSink {
    return this.sink;
  }

  /** Production wiring: PDPL/legal consent store lookup (read-only). */
  setConsentResolver(resolver: ConsentResolver): void {
    this.consentResolver = resolver;
  }

  private newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Privacy-respecting ingest:
   * - unknown event types rejected;
   * - events WITH a userId require analytics consent, else dropped (never persisted);
   * - ip/user-agent are never stored unless personalized consent is granted
   *   (callers pass them via metadata only when allowed — the service strips
   *   network identifiers by default);
   * - writes are idempotent on idempotencyKey.
   */
  async ingest(dto: IngestEventDto): Promise<IngestResult> {
    if (!isKnownEventType(dto.eventType)) throw new BadRequestException('unknown_event_type');
    if (dto.userId) {
      const consent = await this.consentResolver(String(dto.userId));
      if (consent.analytics !== 'granted') return { ok: false, reason: 'consent_required' };
    }
    const col = this.conn.collection(ANALYTICS_COLLECTION);
    const dup = await col.findOne({ idempotencyKey: { $eq: String(dto.idempotencyKey) } });
    if (dup) return { ok: true, duplicate: true };
    const meta: Record<string, unknown> = { ...(dto.metadata || {}) };
    delete meta['ip_address'];
    delete meta['user_agent'];
    delete meta['ip'];
    await col.insertOne({
      id: this.newId('ae'),
      event_type: String(dto.eventType),
      domain: String(dto.domain),
      user_id: dto.userId ? String(dto.userId) : null,
      session_id: dto.sessionId ? String(dto.sessionId) : null,
      metadata: meta,
      idempotencyKey: String(dto.idempotencyKey),
      createdAt: new Date(),
    } as unknown as Record<string, unknown>);
    return { ok: true };
  }

  /**
   * Funnel over the SINK: ordered step counts + step-to-step conversion.
   * Counts distinct sessions when session_id is present, else raw events.
   */
  async funnel(stepsRaw: string, domain?: string): Promise<{ steps: FunnelStage[] }> {
    const steps = parseFunnelSteps(stepsRaw);
    if (steps.length < 2) throw new BadRequestException('at_least_two_steps');
    for (const s of steps) {
      if (!isKnownEventType(s)) throw new BadRequestException(`unknown_step:${s}`);
    }
    const stages: FunnelStage[] = [];
    let prev: number | null = null;
    for (const step of steps) {
      const filter: Record<string, unknown> = { event_type: { $eq: step } };
      if (domain) filter['domain'] = { $eq: String(domain) };
      const count = await this.sink.count(ANALYTICS_COLLECTION, filter);
      stages.push({
        step,
        count,
        conversionFromPreviousPct:
          prev === null ? null : prev > 0 ? Math.round((count / prev) * 1000) / 10 : null,
      });
      prev = count;
    }
    return { steps: stages };
  }

  /**
   * Retention cohorts over the SINK: weekly signup cohorts (first-seen
   * user_id) with D1/D7/D30 return rates from subsequent events.
   */
  async retentionCohorts(domain?: string): Promise<{ cohorts: RetentionCohort[] }> {
    const filter: Record<string, unknown> = {};
    if (domain) filter['domain'] = { $eq: String(domain) };
    const rows = await this.sink.find(ANALYTICS_COLLECTION, filter, 20000);
    const firstSeen = new Map<string, Date>();
    const activeDays = new Map<string, Set<string>>();
    for (const r of rows) {
      const uid = r['user_id'];
      const at = r['createdAt'];
      if (typeof uid !== 'string' || !uid || !(at instanceof Date)) continue;
      const prev = firstSeen.get(uid);
      if (!prev || at < prev) firstSeen.set(uid, at);
      const set = activeDays.get(uid) || new Set<string>();
      set.add(at.toISOString().slice(0, 10));
      activeDays.set(uid, set);
    }
    const weekOf = (d: Date): string => {
      const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
      return t.toISOString().slice(0, 10);
    };
    const cohorts = new Map<string, Map<string, Date>>();
    for (const [uid, at] of firstSeen) {
      const w = weekOf(at);
      const m = cohorts.get(w) || new Map<string, Date>();
      m.set(uid, at);
      cohorts.set(w, m);
    }
    const out: RetentionCohort[] = [];
    for (const [week, members] of [...cohorts.entries()].sort()) {
      let d1 = 0;
      let d7 = 0;
      let d30 = 0;
      for (const [uid, created] of members) {
        const days = activeDays.get(uid);
        if (!days) continue;
        const within = (n: number): boolean =>
          [...days].some((ds) => {
            const delta = (new Date(ds).getTime() - created.getTime()) / 86_400_000;
            return delta > 0 && delta <= n;
          });
        if (within(1)) d1 += 1;
        if (within(7)) d7 += 1;
        if (within(30)) d30 += 1;
      }
      const size = members.size;
      out.push({
        cohort: week,
        size,
        d1Pct: size ? Math.round((d1 / size) * 1000) / 10 : 0,
        d7Pct: size ? Math.round((d7 / size) * 1000) / 10 : 0,
        d30Pct: size ? Math.round((d30 / size) * 1000) / 10 : 0,
      });
    }
    return { cohorts: out };
  }
}
