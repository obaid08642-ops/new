import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { timedFetch } from '../../common/external-call';
import { moyasarBase } from '../../common/moyasar-base';
import { Finding, OrderContext, checkOrder } from './ledger-invariants';
import { GatewayPayment, LocalPayment, reconcileDay } from './moyasar-reconcile';

export const RUNS = 'finance_integrity_runs';
export const FINDINGS = 'finance_integrity_findings';
const DAY_MS = 86_400_000;

type PageFetcher = (page: number, from: Date, to: Date) => Promise<{ payments: GatewayPayment[]; next_page: number | null }>;

/**
 * R11: daily money checks. (1) ledger invariants for every order touched in the last 48 h (local, always on); (2) Moyasar day reconciliation
 * (off until FINANCE_RECONCILE_MOYASAR=1, after one dry run: it needs the live list API). Findings are stored once per (code, entity) in
 * `finance_integrity_findings` and surface as the admin alert kind `finance_integrity`. One run per (kind, day) across any number of workers:
 * the claim is a unique Mongo insert, not a Redis lease.
 */
@Injectable()
export class FinanceIntegrityService {
  private readonly logger = new Logger('FinanceIntegrity');
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get runs() { return this.conn.collection(RUNS); }
  private get findings() { return this.conn.collection(FINDINGS); }

  @Cron('40 1 * * *')   // 04:40 Riyadh, after the nightly dump window
  async daily() {
    const day = new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);
    try { await this.runLedgerCheck(new Date(Date.now() - 2 * DAY_MS), day); } catch (e: any) { this.logger.error(`ledger check failed: ${e?.message}`); }
    if (process.env.FINANCE_RECONCILE_MOYASAR === '1') {
      try { await this.runMoyasarReconcile(new Date(day.getTime() - DAY_MS), day); } catch (e: any) { this.logger.error(`moyasar reconcile failed: ${e?.message}`); }
    }
  }

  private async claim(kind: string, day: Date): Promise<boolean> {
    try { await this.runs.insertOne({ kind, day, started_at: new Date(), finished_at: null } as any); return true; }
    catch (e: any) { if (e?.code === 11000) return false; throw e; }
  }

  async ensureIndexes() {
    await this.runs.createIndex({ kind: 1, day: 1 }, { unique: true });
    await this.findings.createIndex({ dedupe_key: 1 }, { unique: true });
    await this.findings.createIndex({ status: 1, kind: 1 });
  }

  private async record(kind: string, found: Finding[]) {
    for (const f of found) {
      const dedupe_key = `${kind}:${f.code}:${f.entity_id}`;
      await this.findings.updateOne({ dedupe_key } as any, { $setOnInsert: { dedupe_key, kind, code: f.code, entity_id: f.entity_id, status: 'open', first_seen: new Date() }, $set: { detail: f.detail, last_seen: new Date() } }, { upsert: true });
    }
  }

  /** Orders with ledger activity since `since`; returns the number of orders checked and findings stored. Idempotent per (kind, day). */
  async runLedgerCheck(since: Date, day: Date, force = false): Promise<{ checked: number; findings: number } | null> {
    await this.ensureIndexes();
    if (!force && !(await this.claim('ledger', day))) return null;
    const ledger = this.conn.collection('platformledgerentries');
    const orderIds: string[] = (await ledger.distinct('order_id', { createdAt: { $gte: since }, order_id: { $type: 'string' } } as any)).slice(0, 5000);
    const found: Finding[] = [];
    for (let i = 0; i < orderIds.length; i += 200) {
      const chunk = orderIds.slice(i, i + 200);
      const rows: any[] = await ledger.find({ $or: [{ order_id: { $in: chunk } }, { ref_id: { $in: chunk }, type: 'provider_earning' }] } as any, { projection: { _id: 0 } }).toArray();
      const tx: any[] = await this.conn.collection('transactions').find({ booking_id: { $in: chunk } } as any, { projection: { _id: 0, id: 1, booking_id: 1, amount: 1, refunded_amount: 1, amount_halalas: 1, refunded_amount_halalas: 1, status: 1, method: 1 } }).toArray();
      const mp: any[] = await this.conn.collection('moyasar_payments').find({ booking_id: { $in: chunk } } as any, { projection: { _id: 0, moyasar_id: 1, booking_id: 1, amount: 1, refunded_amount: 1, amount_halalas: 1, refunded_amount_halalas: 1, status: 1 } }).toArray();
      for (const id of chunk) {
        const mine = rows.filter((r) => r.order_id === id || (r.type === 'provider_earning' && r.ref_id === id));
        const ctx: OrderContext = {
          order_id: id,
          ledger: mine,
          earnings: mine.filter((r) => r.type === 'provider_earning'),
          payments: [
            ...tx.filter((t) => t.booking_id === id).map((t) => ({ kind: 'transaction' as const, id: t.id, amount: t.amount, refunded_amount: t.refunded_amount, amount_halalas: t.amount_halalas, refunded_amount_halalas: t.refunded_amount_halalas, status: t.status, method: t.method })),
            ...mp.filter((m) => m.booking_id === id).map((m) => ({ kind: 'moyasar_payment' as const, id: m.moyasar_id, amount: m.amount, refunded_amount: m.refunded_amount, amount_halalas: m.amount_halalas, refunded_amount_halalas: m.refunded_amount_halalas, status: m.status })),
          ],
        };
        found.push(...checkOrder(ctx));
      }
    }
    await this.record('ledger', found);
    await this.runs.updateOne({ kind: 'ledger', day } as any, { $set: { finished_at: new Date(), checked: orderIds.length, findings: found.length } });
    if (found.length) this.logger.error(`ledger invariants: ${found.length} finding(s) in ${orderIds.length} order(s): ${[...new Set(found.map((f) => f.code))].join(',')}`);
    return { checked: orderIds.length, findings: found.length };
  }

  private defaultFetcher(): PageFetcher {
    const key = process.env.MOYASAR_SECRET_KEY || process.env.MOYASAR_SECRET || process.env.MOYASAR_API_KEY || '';
    if (!key) throw new Error('payment_gateway_not_configured');
    return async (page, from, to) => {
      const url = `${moyasarBase()}/payments?page=${page}&created[gte]=${encodeURIComponent(from.toISOString())}&created[lt]=${encodeURIComponent(to.toISOString())}`;
      const resp = await timedFetch(url, { headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` } }, { label: 'finance.reconcile', retries: 2, timeoutCode: 'payment_gateway_timeout' });
      if (!resp.ok) throw new Error(`moyasar_list_${resp.status}`);
      const j: any = await resp.json();
      return { payments: Array.isArray(j?.payments) ? j.payments : [], next_page: j?.meta?.next_page ?? null };
    };
  }

  async loadLocal(from: Date, to: Date): Promise<LocalPayment[]> {
    const win = { $gte: from, $lt: to };
    const tx: any[] = await this.conn.collection('transactions').find({ gateway: 'moyasar', $or: [{ paid_at: win }, { createdAt: win }] } as any).toArray();
    const mp: any[] = await this.conn.collection('moyasar_payments').find({ createdAt: win } as any).toArray();
    const real = (s?: string) => !!s && !String(s).startsWith('sandbox_');
    return [
      ...tx.map((t) => ({ source: 'transactions' as const, id: String(t.id), gateway_ids: [t.gateway_charge_id, t.gateway_intent_id].filter(real) as string[], status: t.status, amount: t.amount, refunded_amount: t.refunded_amount, amount_halalas: t.amount_halalas, refunded_amount_halalas: t.refunded_amount_halalas })),
      ...mp.map((m) => ({ source: 'moyasar_payments' as const, id: String(m.moyasar_id), gateway_ids: [m.raw_response?.id, m.moyasar_id].filter(real) as string[], status: m.status, amount: m.amount, refunded_amount: m.refunded_amount, amount_halalas: m.amount_halalas, refunded_amount_halalas: m.refunded_amount_halalas })),
    ].filter((l) => l.gateway_ids.length > 0);
  }

  async runMoyasarReconcile(from: Date, to: Date, fetchPage: PageFetcher = this.defaultFetcher(), force = false) {
    await this.ensureIndexes();
    if (!force && !(await this.claim('moyasar', from))) return null;
    const gateway: GatewayPayment[] = [];
    let page: number | null = 1;
    for (let n = 0; page && n < 200; n++) {
      const r = await fetchPage(page, from, to);
      gateway.push(...r.payments);
      page = r.next_page;
    }
    const found = reconcileDay(gateway, await this.loadLocal(from, to));
    await this.record('moyasar', found);
    await this.runs.updateOne({ kind: 'moyasar', day: from } as any, { $set: { finished_at: new Date(), checked: gateway.length, findings: found.length } });
    if (found.length) this.logger.error(`moyasar reconciliation: ${found.length} finding(s) in ${gateway.length} gateway payment(s)`);
    return { checked: gateway.length, findings: found.length };
  }

  /** Open findings, newest first (admin read). */
  async openFindings(limit = 200): Promise<Array<Record<string, unknown>>> {
    return (await this.findings.find({ status: "open" } as any, { projection: { _id: 0 } }).sort({ first_seen: -1 }).limit(Math.min(Math.max(limit, 1), 500)).toArray()) as Array<Record<string, unknown>>;
  }
}
