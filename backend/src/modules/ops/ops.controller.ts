import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { RedisService } from '../redis/redis.service';
import { connectionFlagSource, isKilled } from '../../common/killswitches/killswitches.helper';

/**
 * Operations Center — one admin surface answering:
 *  • كم مستخدم أونلاين الآن؟
 *  • كم طلب نجح / فشل اليوم؟ وما أكثر المسارات استخداماً؟
 *  • ما حالة كل طلب (تم / ينتظر / متأخر / به مشكلة) ومن أنشأه ومتى؟
 *  • من فعل ماذا مؤخراً (سجل النشاط)؟
 */
@Controller('admin/ops')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class OpsController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly redis: RedisService,
  ) {}

  private client() { return (this.redis as any).getClient?.(); }

  private async scanKeys(pattern: string): Promise<string[]> {
    const client = this.client();
    if (!client) return [];
    const out: string[] = [];
    let cursor = '0';
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      out.push(...keys);
    } while (cursor !== '0' && out.length < 10000);
    return out;
  }

  /** B3: actionable alerts — stuck orders past the SLA threshold and failed payments. */
  @Get('alerts')
  async alerts() {
    const cfg: any = await this.conn.collection('system_config').findOne({ key: 'system_config' } as any).catch(() => null);
    const stuckMin = Number(cfg?.value?.ops_stuck_minutes ?? 30);
    const cutoff = new Date(Date.now() - Math.max(1, stuckMin) * 60000);
    const kinds = [
      { kind: 'pharmacy', col: 'pharmacy_orders', field: 'status', states: ['NEW_REQUEST', 'QUOTED', 'ALLOCATED', 'CONFIRMED', 'ready_for_split'] },
      { kind: 'lab', col: 'labbookings', field: 'state', states: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'CONFIRMED'] },
      { kind: 'radiology', col: 'radiologybookings', field: 'state', states: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'CONFIRMED'] },
      { kind: 'nursing', col: 'homecarebookings', field: 'state', states: ['NEW_REQUEST', 'PENDING_INSURANCE', 'CONFIRMED', 'ASSIGNED'] },
      { kind: 'consultation', col: 'appointments', field: 'status', states: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
    ];
    const stuck: any[] = [];
    for (const k of kinds) {
      const rows: any[] = await this.conn.collection(k.col).find({
        [k.field]: { $in: k.states },
        createdAt: { $lt: cutoff },
      }, { projection: { _id: 0, id: 1, state: 1, status: 1, createdAt: 1, patient_id: 1, total: 1, total_price: 1 } })
        .sort({ createdAt: 1 }).limit(50).toArray().catch(() => []);
      for (const r of rows) stuck.push({ kind: k.kind, id: r.id, state: r.state || r.status, since: r.createdAt });
    }
    const failedPayments: any[] = await this.conn.collection('transactions').find(
      { status: { $in: ['failed', 'cancelled'] } }, { projection: { _id: 0, id: 1, booking_kind: 1, booking_id: 1, amount: 1, status: 1, failure_reason: 1, createdAt: 1 } })
      .sort({ createdAt: -1 }).limit(50).toArray().catch(() => []);
    return {
      stuck_minutes_threshold: Math.max(1, stuckMin),
      stuck_orders: stuck, stuck_count: stuck.length,
      failed_payments: failedPayments, failed_count: failedPayments.length,
      generated_at: new Date(),
    };
  }

  @Get('overview')
  async overview() {
    const day = new Date().toISOString().slice(0, 10);
    const client = this.client();

    // Online right now: presence hashes (30s TTL) + live admin sessions
    const [presenceKeys, adminSessionKeys] = await Promise.all([
      this.scanKeys('presence:*'),
      this.scanKeys('sessions:*'),
    ]);
    const onlineUsers = presenceKeys.filter(k => !k.startsWith('presence:devices:')).length;

    // Today's traffic + status classes
    let reqByPath: Record<string, number> = {};
    let statusByPath: Record<string, number> = {};
    if (client) {
      [reqByPath, statusByPath] = await Promise.all([
        client.hgetall(`ops:req:${day}`),
        client.hgetall(`ops:status:${day}`),
      ]);
    }
    const tot = (prefix: string) => Object.entries(statusByPath)
      .filter(([k]) => k === prefix).reduce((a, [, v]) => a + Number(v), 0);
    const ok = tot('2xx'), bad4 = tot('4xx'), bad5 = tot('5xx');
    const total = ok + bad4 + bad5;
    const topEndpoints = Object.entries(reqByPath)
      .sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 15)
      .map(([path, count]) => ({ path, count: Number(count) }));
    const topFailing = Object.entries(statusByPath)
      .filter(([k]) => k.startsWith('4xx:') || k.startsWith('5xx:'))
      .map(([k, v]) => ({ path: k.slice(4), class: k.slice(0, 3), count: Number(v) }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    // Request pipelines by status (all-time counts + today's creations + late)
    const sinceToday = new Date(`${day}T00:00:00.000Z`);
    const lateBefore = new Date(Date.now() - 24 * 3600 * 1000);
    // field: the lifecycle field of that collection (bookings and emergencies use `state`).
    // "late" = older than 24h and not in a final state (open states differ per domain and casing).
    const FINAL = ['completed', 'COMPLETED', 'cancelled', 'CANCELLED', 'delivered', 'DELIVERED', 'rejected', 'REJECTED',
      'resolved', 'RESOLVED', 'REPORTED', 'REPORT_READY', 'refunded', 'REFUNDED', 'expired', 'EXPIRED', 'false_alarm'];
    const group = async (coll: string, final: string[] = FINAL, field: 'status' | 'state' = 'status') => {
      try {
        const c = this.conn.collection(coll);
        const [byStatus, today, late] = await Promise.all([
          c.aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }]).toArray(),
          c.countDocuments({ createdAt: { $gte: sinceToday } }),
          c.countDocuments({ [field]: { $nin: final }, createdAt: { $lt: lateBefore } }),
        ]);
        const m: Record<string, number> = {};
        byStatus.forEach((r: any) => { m[String(r._id)] = r.n; });
        return { by_status: m, created_today: today, late: late };
      } catch { return { by_status: {}, created_today: 0, late: 0 }; }
    };
    // Canonical collections only: the legacy `orders` / `pharmacyorders` names are empty since the
    // pharmacy flow moved to `pharmacy_orders`, which made the live board show 0 orders.
    const [appointments, emergency, procurement, pharmacyOrders, labs, radiology, nursing] = await Promise.all([
      group('appointments'),
      group('emergency_requests', FINAL, 'state'),
      group('procurementrequests'),
      group('pharmacy_orders'),
      group('labbookings', FINAL, 'state'),
      group('radiologybookings', FINAL, 'state'),
      group('homecarebookings', FINAL, 'state'),
    ]);

    // Recent platform activity — "من فعل ماذا" (system_events audit stream)
    let activity: any[] = [];
    try {
      activity = await this.conn.collection('system_events')
        .find({}, { projection: { type: 1, actor_account_id: 1, actor_role: 1, entity_type: 1, entity_id: 1, createdAt: 1 } })
        .sort({ createdAt: -1 }).limit(30).toArray();
    } catch {}

    return {
      generated_at: new Date().toISOString(),
      online: { users: onlineUsers, admin_sessions: adminSessionKeys.length },
      today: {
        total_requests: total, success: ok, client_errors: bad4, server_errors: bad5,
        success_rate: total ? Math.round((ok / total) * 1000) / 10 : null,
      },
      top_endpoints: topEndpoints,
      top_failing: topFailing,
      pipelines: { orders: pharmacyOrders, pharmacy_orders: pharmacyOrders, appointments, emergency, procurement, labs, radiology, nursing },
      recent_activity: activity,
    };
  }

  /** Unified request feed across every pipeline, normalized + late/problem flags. */
  @Get('requests')
  async requests(@Query('kind') kind?: string, @Query('limit') limit?: string) {
    const lim = Math.min(Math.max(parseInt(limit || '30') || 30, 1), 100);
    const lateBefore = new Date(Date.now() - 24 * 3600 * 1000);
    const norm = (doc: any, k: string, label: string, pendingStates: string[], doneStates: string[], failStates: string[]) => {
      const st = String(doc.status || 'unknown');
      let normalized: 'pending' | 'done' | 'failed' | 'late' = 'pending';
      if (doneStates.includes(st)) normalized = 'done';
      else if (failStates.includes(st)) normalized = 'failed';
      else if (pendingStates.includes(st) && doc.createdAt && new Date(doc.createdAt) < lateBefore) normalized = 'late';
      return {
        kind: k, kind_label: label, id: String(doc._id),
        status: st, normalized_status: normalized,
        created_by: doc.patient_id || doc.user_id || doc.pharmacy_id || doc.created_by || null,
        created_at: doc.createdAt || null, updated_at: doc.updatedAt || null,
        summary: doc.full_name || doc.patient_name || doc.name_ar || doc.title || doc.service_name || null,
      };
    };
    const fetch = async (coll: string, k: string, label: string, p: string[], d: string[], f: string[]) => {
      try {
        const rows = await this.conn.collection(coll).find({}).sort({ createdAt: -1 }).limit(lim).toArray();
        return rows.map(r => norm(r, k, label, p, d, f));
      } catch { return []; }
    };
    const groups: Record<string, () => Promise<any[]>> = {
      orders: () => fetch('orders', 'orders', 'طلبات الصيدلية', ['pending', 'processing', 'created'], ['delivered', 'completed', 'DELIVERED'], ['cancelled', 'CANCELLED', 'failed']),
      appointments: () => fetch('appointments', 'appointments', 'المواعيد', ['PENDING', 'CONFIRMED', 'pending'], ['COMPLETED', 'completed'], ['CANCELLED', 'cancelled', 'NO_SHOW']),
      emergency: () => fetch('emergency_requests', 'emergency', 'الطوارئ SOS', ['pending', 'dispatched', 'accepted'], ['completed', 'resolved', 'arrived'], ['cancelled', 'false_alarm']),
      procurement: () => fetch('procurementrequests', 'procurement', 'طلبات المستودعات', ['PENDING_ADMIN_REVIEW', 'QUOTATION_ISSUED'], ['COMPLETED', 'APPROVED_BY_PHARMACY'], ['CANCELLED']),
    };
    const keys = kind && groups[kind] ? [kind] : Object.keys(groups);
    const parts = await Promise.all(keys.map(k => groups[k]()));
    const all = parts.flat().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, lim);
    return { data: all, counts: {
      total: all.length,
      pending: all.filter(r => r.normalized_status === 'pending').length,
      late: all.filter(r => r.normalized_status === 'late').length,
      done: all.filter(r => r.normalized_status === 'done').length,
      failed: all.filter(r => r.normalized_status === 'failed').length,
    } };
  }

  /**
   * R6-8: per-domain service metrics from live data — pharmacy fill rate +
   * avg quote time, consultation no-shows, nursing visits by state.
   */
  @Get('domain-metrics')
  async domainMetrics() {
    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    };
    // Pharmacy fill rate: delivered allocation qty vs ordered qty (30d).
    const fill = await safe(async () => {
      const since = new Date(Date.now() - 30 * 86400000);
      const allocs: any[] = await this.conn.collection('pharmacy_allocations')
        .find({ createdAt: { $gte: since } }).project({ items: 1 }).limit(2000).toArray();
      let ordered = 0, filled = 0;
      for (const a of allocs) for (const it of a.items || []) {
        ordered += Number(it.qty_ordered ?? it.qty ?? 0);
        filled += Number(it.qty_filled ?? it.qty_delivered ?? 0);
      }
      return { ordered, filled, fill_rate_pct: ordered ? Math.round((filled / ordered) * 1000) / 10 : null };
    }, { ordered: 0, filled: 0, fill_rate_pct: null });
    // Avg quote time: broadcast created → first offer submitted (30d, seconds).
    const quote = await safe(async () => {
      const since = new Date(Date.now() - 30 * 86400000);
      const bcs: any[] = await this.conn.collection('pharmacy_broadcasts')
        .find({ createdAt: { $gte: since } }).project({ id: 1, order_id: 1, createdAt: 1 }).limit(500).toArray();
      const gaps: number[] = [];
      for (const bc of bcs.slice(0, 200)) {
        const first: any = await this.conn.collection('pharmacy_offers')
          .find({ broadcast_id: bc.id }).sort({ createdAt: 1 }).limit(1).toArray().catch(() => []);
        if (first[0]?.createdAt && bc.createdAt) {
          gaps.push((new Date(first[0].createdAt).getTime() - new Date(bc.createdAt).getTime()) / 1000);
        }
      }
      gaps.sort((a, b) => a - b);
      const avg = gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : null;
      return { samples: gaps.length, avg_quote_seconds: avg == null ? null : Math.round(avg) };
    }, { samples: 0, avg_quote_seconds: null });
    // Consultation no-shows (30d) + rate.
    const noshow = await safe(async () => {
      const since = new Date(Date.now() - 30 * 86400000);
      const [no, total] = await Promise.all([
        this.conn.collection('appointments').countDocuments({ status: 'NO_SHOW', createdAt: { $gte: since } }),
        this.conn.collection('appointments').countDocuments({ createdAt: { $gte: since } }),
      ]);
      return { no_show: no, total, no_show_rate_pct: total ? Math.round((no / total) * 1000) / 10 : 0 };
    }, { no_show: 0, total: 0, no_show_rate_pct: 0 });
    // Nursing visits by state.
    const nursing = await safe(async () => {
      const rows: any[] = await this.conn.collection('homecarebookings')
        .aggregate([{ $group: { _id: '$state', n: { $sum: 1 } } }]).toArray();
      const byState: Record<string, number> = {};
      for (const r of rows) byState[String(r._id)] = r.n;
      return { by_state: byState };
    }, { by_state: {} });
    return { generated_at: new Date().toISOString(), pharmacy: { ...fill, ...quote }, consultations: noshow, nursing };
  }

  /**
   * R6-8: live orders with coordinates for the ops map (active bookings only,
   * capped for render). Coordinate-less rows still appear with city only.
   */
  @Get('live-map')
  async liveMap(@Query('limit') limit?: string) {
    // F9 (15.12) — live-map kill switch: serve the static degraded answer
    // (no realtime markers, no collection scans) instead of live positions.
    if (await isKilled('liveMap', connectionFlagSource(this.conn))) {
      return {
        generated_at: new Date().toISOString(),
        total: 0,
        with_geo: 0,
        by_city: {},
        points: [],
        live_map_killed: true,
      };
    }
    const lim = Math.min(Math.max(parseInt(limit || '200') || 200, 1), 500);
    const geoOf = (doc: any): { lat: number; lng: number } | null => {
      const g = doc.delivery_address?.geo || doc.address || doc.visit_location || doc.gps_tracking;
      const lat = Number(g?.lat ?? g?.current_lat);
      const lng = Number(g?.lng ?? g?.current_lng);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    };
    const cityOf = (doc: any): string | null =>
      doc.delivery_address?.city || doc.address?.city || doc.city || null;
    const pick = async (coll: string, kind: string, active: any, idField = 'id') => {
      try {
        const rows: any[] = await this.conn.collection(coll).find(active)
          .project({ [idField]: 1, status: 1, state: 1, delivery_address: 1, address: 1, visit_location: 1, gps_tracking: 1, city: 1, createdAt: 1 })
          .sort({ createdAt: -1 }).limit(lim).toArray();
        return rows.map((d: any) => ({
          kind, id: d[idField] || String(d._id), state: d.status || d.state,
          city: cityOf(d), geo: geoOf(d), created_at: d.createdAt || null,
        }));
      } catch { return []; }
    };
    const [pharmacy, lab, radiology, nursing, consultations] = await Promise.all([
      pick('pharmacy_orders', 'pharmacy', { status: { $nin: ['draft', 'cancelled', 'delivered', 'completed'] } }),
      pick('labbookings', 'lab', { state: { $nin: ['CANCELLED', 'REPORTED', 'SAMPLE_REJECTED'] } }),
      pick('radiologybookings', 'radiology', { state: { $nin: ['CANCELLED', 'REPORT_PUBLISHED'] } }),
      pick('homecarebookings', 'nursing', { state: { $nin: ['CANCELLED', 'COMPLETED', 'DONE', 'REJECTED'] } }),
      pick('appointments', 'consultation', { status: { $nin: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] } }),
    ]);
    const points = [...pharmacy, ...lab, ...radiology, ...nursing, ...consultations].slice(0, lim);
    const byCity: Record<string, number> = {};
    for (const p of points) byCity[p.city || 'unknown'] = (byCity[p.city || 'unknown'] || 0) + 1;
    return { generated_at: new Date().toISOString(), total: points.length, with_geo: points.filter((p) => p.geo).length, by_city: byCity, points };
  }

  /** Traffic for a specific day (up to 14 days back). */
  @Get('traffic')
  async traffic(@Query('date') date?: string) {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date! : new Date().toISOString().slice(0, 10);
    const client = this.client();
    if (!client) return { date: day, by_path: {}, by_status: {} };
    const [by_path, by_status] = await Promise.all([
      client.hgetall(`ops:req:${day}`),
      client.hgetall(`ops:status:${day}`),
    ]);
    return { date: day, by_path, by_status };
  }
}
