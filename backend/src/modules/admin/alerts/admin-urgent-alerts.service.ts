import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { Permission } from '../../../common/permissions';
import { resolveEffectivePermissions } from '../../../common/effective-permissions';
import { MailService, escapeHtml } from '../../mail/mail.module';
import { FINANCE_DEFAULTS } from '../../finance-engine/finance-engine.module';
import { countFailedPaymentsSince, findSlaBreaches, findStuckOrders, opsStuckMinutes } from '../../ops/ops-alert-queries';
import { AdminAuditService } from '../enterprise/audit.service';
import { ADMIN_ALERT_KINDS, AdminAlertKind, AdminAlertRuleDto } from './admin-urgent-alerts.dto';

/**
 * Urgent admin alerts (issue #1235). The today screen (admin/src/pages/admin/today.tsx) shows SLA breaches, stuck
 * orders and failed payments only while it is open. This service applies admin-edited rules to the same queries
 * (modules/ops/ops-alert-queries.ts) on a schedule, stores each finding once in `admin_alerts` and e-mails it once
 * to the admins allowed to see it, so an admin with the screen closed still learns about it.
 */

export type AlertRule = { kind: AdminAlertKind; threshold: number; enabled: boolean; notify_email: boolean };
export type AdminActor = { id: string; role?: string; full_name?: string; email?: string; permissions?: unknown; custom_role_keys?: unknown };

export type AdminAlertDoc = {
  id: string;
  kind: AdminAlertKind;
  entity_type: string;
  entity_id: string;
  window: string;
  dedupe_key: string;
  severity: 'high' | 'critical';
  message_key: string;
  params: Record<string, string | number>;
  link: string;
  created_at: Date;
  read_by: string[];
  notify_email: boolean;
  emailed_at?: Date | null;
  email_recipients?: number;
};

export const RULES_CONFIG_KEY = 'admin_alert_rules';
export const ALERTS_COLLECTION = 'admin_alerts';

/** Allowed threshold range per kind and what it means (the DTO only checks 0..100000). */
export const RULE_RANGES: Record<AdminAlertKind, { min: number; max: number }> = {
  sla_breach: { min: 0, max: 1440 },          // minutes past sla_due_at
  order_stuck: { min: 1, max: 10080 },        // minutes an order sits in an open state
  payment_failures: { min: 1, max: 10000 },   // failed payments in the last hour
  fraud_high: { min: 1, max: 100 },           // minimum fraud confidence, percent
};

/** Who may see (and is e-mailed) each kind, on top of command.center.view (the today screen's permission). */
export const KIND_PERMISSION: Record<AdminAlertKind, Permission> = {
  sla_breach: Permission.ORDER_READ,
  order_stuck: Permission.ORDER_READ,
  payment_failures: Permission.FINANCE_READ,
  fraud_high: Permission.FINANCE_READ,
};

/** Arabic e-mail lines; the admin inbox renders the same message_key + params (alerts.tsx). */
const EMAIL_TEXT: Record<AdminAlertKind, (p: Record<string, string | number>) => string> = {
  sla_breach: (p) => `طلب ${p.order_kind} رقم ${p.order_id} تجاوز مهلة الخدمة (SLA) منذ ${p.sla_due_at}`,
  order_stuck: (p) => `طلب ${p.order_kind} رقم ${p.order_id} عالق في الحالة ${p.state} أكثر من ${p.minutes} دقيقة`,
  payment_failures: (p) => `${p.count} مدفوعات فاشلة خلال الساعة الأخيرة (الحد ${p.threshold})`,
  fraud_high: (p) => `تنبيه احتيال عالي الخطورة: ${p.flag_type} (ثقة ${p.confidence}%)`,
};

const ADMIN_ROLES = ['admin', 'super_admin'];
const hourWindow = (d: Date) => d.toISOString().slice(0, 13);

@Injectable()
export class AdminUrgentAlertsService implements OnModuleInit {
  private readonly logger = new Logger('AdminUrgentAlerts');
  private running = false;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly mail: MailService,
    private readonly audit: AdminAuditService,
  ) {}

  private get alerts() { return this.conn.collection(ALERTS_COLLECTION); }

  async onModuleInit() {
    // The unique key is what makes the evaluator idempotent across runs and processes.
    await this.alerts.createIndex({ dedupe_key: 1 }, { unique: true }).catch((e: Error) => this.logger.warn(`index dedupe_key: ${e.message}`));
    await this.alerts.createIndex({ created_at: -1 }).catch(() => null);
  }

  // ── Rules ─────────────────────────────────────────────────────

  /** Defaults from the business rules that already exist: the today screen's stuck threshold
   * (system_config.ops_stuck_minutes), the fraud detector's failed-payments-per-hour limit and its "high" cutoff. */
  async defaultRules(): Promise<AlertRule[]> {
    return [
      { kind: 'sla_breach', threshold: 0, enabled: true, notify_email: false },
      { kind: 'order_stuck', threshold: await opsStuckMinutes(this.conn), enabled: true, notify_email: false },
      { kind: 'payment_failures', threshold: FINANCE_DEFAULTS.payment_velocity_failed_1h, enabled: true, notify_email: true },
      { kind: 'fraud_high', threshold: 80, enabled: true, notify_email: true },
    ];
  }

  async getRules(): Promise<{ rules: AlertRule[]; defaults: AlertRule[]; updated_at: Date | null; updated_by: string | null }> {
    const defaults = await this.defaultRules();
    const doc = await this.conn.collection('system_config').findOne({ key: RULES_CONFIG_KEY } as never).catch(() => null) as
      { value?: { rules?: AlertRule[] }; updatedAt?: Date; updated_by?: string } | null;
    const stored = new Map((doc?.value?.rules || []).map((r) => [r.kind, r]));
    const rules = defaults.map((d) => {
      const s = stored.get(d.kind);
      return s ? { kind: d.kind, threshold: Number(s.threshold), enabled: !!s.enabled, notify_email: !!s.notify_email } : d;
    });
    return { rules, defaults, updated_at: doc?.updatedAt || null, updated_by: doc?.updated_by || null };
  }

  async updateRules(input: AdminAlertRuleDto[], admin: AdminActor) {
    const kinds = input.map((r) => r.kind);
    if (new Set(kinds).size !== kinds.length) throw new BadRequestException('duplicate_rule_kind');
    for (const r of input) {
      const range = RULE_RANGES[r.kind];
      if (r.threshold < range.min || r.threshold > range.max) {
        throw new BadRequestException(`threshold_out_of_range:${r.kind}:${range.min}-${range.max}`);
      }
    }
    const before = await this.getRules();
    const byKind = new Map(input.map((r) => [r.kind, r]));
    const rules: AlertRule[] = before.rules.map((cur) => {
      const r = byKind.get(cur.kind);
      return r ? { kind: r.kind, threshold: r.threshold, enabled: r.enabled, notify_email: r.notify_email } : cur;
    });
    await this.conn.collection('system_config').updateOne(
      { key: RULES_CONFIG_KEY } as never,
      { $set: { value: { rules }, updatedAt: new Date(), updated_by: admin.id }, $setOnInsert: { createdAt: new Date() } } as never,
      { upsert: true },
    );
    await this.audit.write({
      action: 'admin_alert_rules_update', actor: admin, target_type: 'system_config', target_id: RULES_CONFIG_KEY,
      before: { rules: before.rules }, after: { rules },
    });
    return this.getRules();
  }

  // ── Evaluator ─────────────────────────────────────────────────

  /** Runs where background work runs (common/process-role.ts), like the other admin crons. */
  @Cron('*/5 * * * *')
  async scheduledRun() {
    if (this.running) return;
    this.running = true;
    try {
      await this.evaluate();
    } catch (e) {
      this.logger.error(`evaluate_failed: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Applies every enabled rule, stores new findings once (dedupe_key) and e-mails the new ones once. */
  async evaluate(now: Date = new Date()) {
    const { rules } = await this.getRules();
    const candidates: AdminAlertDoc[] = [];
    const base = (rule: AlertRule, entityType: string, entityId: string, window: string, severity: AdminAlertDoc['severity'],
      params: Record<string, string | number>, link: string): AdminAlertDoc => ({
      id: `aa_${uuid()}`, kind: rule.kind, entity_type: entityType, entity_id: entityId, window,
      dedupe_key: `${rule.kind}:${entityType}:${entityId}:${window}`, severity,
      message_key: `admin_alerts.${rule.kind}`, params, link, created_at: now, read_by: [],
      notify_email: rule.notify_email, emailed_at: null,
    });
    const orderLink = (kind: string, id: string) => `/admin/orders/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`;

    for (const rule of rules.filter((r) => r.enabled)) {
      if (rule.kind === 'sla_breach') {
        const rows = await findSlaBreaches(this.conn, new Date(now.getTime() - rule.threshold * 60000));
        // One alert per order and due time: an SLA that is extended and breached again alerts again.
        for (const r of rows) {
          candidates.push(base(rule, r.kind, r.id, r.sla_due_at.toISOString(), 'high',
            { order_kind: r.kind, order_id: r.id, state: r.state, sla_due_at: r.sla_due_at.toISOString(), minutes: rule.threshold },
            orderLink(r.kind, r.id)));
        }
      } else if (rule.kind === 'order_stuck') {
        const rows = await findStuckOrders(this.conn, new Date(now.getTime() - rule.threshold * 60000), 200);
        // One alert per order and state: moving on to another stuck state alerts again.
        for (const r of rows) {
          candidates.push(base(rule, r.kind, r.id, r.state, 'high',
            { order_kind: r.kind, order_id: r.id, state: r.state, minutes: rule.threshold, since: new Date(r.since).toISOString() },
            orderLink(r.kind, r.id)));
        }
      } else if (rule.kind === 'payment_failures') {
        const count = await countFailedPaymentsSince(this.conn, new Date(now.getTime() - 3600000));
        // Platform-wide count; one alert per clock hour at most.
        if (count >= rule.threshold) {
          candidates.push(base(rule, 'transactions', 'platform', hourWindow(now), 'critical',
            { count, threshold: rule.threshold }, '/admin/finance-suite'));
        }
      } else if (rule.kind === 'fraud_high') {
        const min = rule.threshold / 100;
        const rows = await this.conn.collection('fraud_alerts').find({
          status: { $in: ['pending', 'flagged'] },
          $or: [{ confidenceScore: { $gte: min } }, { confidenceScore: { $exists: false }, severity: 'high' }],
        } as never, { projection: { _id: 0, id: 1, flagType: 1, confidenceScore: 1, userId: 1, providerId: 1 } })
          .sort({ createdAt: -1 }).limit(200).toArray().catch(() => []) as Array<Record<string, unknown>>;
        for (const r of rows) {
          if (!r.id) continue;
          candidates.push(base(rule, 'fraud_alert', String(r.id), 'open', 'critical',
            { flag_type: String(r.flagType || ''), confidence: Math.round(Number(r.confidenceScore || 0) * 100), user_id: String(r.userId || r.providerId || '') },
            '/admin/fraud-monitoring'));
        }
      }
    }

    const created: AdminAlertDoc[] = [];
    for (const doc of candidates) {
      try {
        const res = await this.alerts.updateOne({ dedupe_key: doc.dedupe_key } as never, { $setOnInsert: doc } as never, { upsert: true });
        if (res.upsertedCount === 1) created.push(doc);
      } catch (e) {
        // E11000: another process stored the same finding first — it is not new here.
        if ((e as { code?: number }).code !== 11000) throw e;
      }
    }
    const emailed = await this.emailNew(created.filter((a) => a.notify_email));
    const byKind: Record<string, number> = {};
    for (const a of created) byKind[a.kind] = (byKind[a.kind] || 0) + 1;
    if (created.length) this.logger.log(`urgent alerts created=${created.length} emailed_admins=${emailed}`);
    return { evaluated_at: now, candidates: candidates.length, created: created.length, created_by_kind: byKind, emailed_admins: emailed };
  }

  /** One e-mail per admin per run listing the new alerts that admin may see; each alert is e-mailed once. */
  private async emailNew(alerts: AdminAlertDoc[]): Promise<number> {
    if (!alerts.length) return 0;
    const admins = await this.conn.collection('users').find({
      role: { $in: ADMIN_ROLES }, active: { $ne: false }, deleted_at: null, email: { $nin: [null, ''] },
    } as never, { projection: { _id: 0, id: 1, email: 1, role: 1, permissions: 1, custom_role_keys: 1 } })
      .toArray().catch(() => []) as Array<{ id: string; email: string; role: string }>;
    let sent = 0;
    const recipients = new Map<string, number>();
    for (const admin of admins) {
      const perms = new Set(await resolveEffectivePermissions(this.conn, admin));
      if (!perms.has(Permission.COMMAND_CENTER_VIEW)) continue;
      const mine = alerts.filter((a) => perms.has(KIND_PERMISSION[a.kind]));
      if (!mine.length) continue;
      const lines = mine.slice(0, 50).map((a) => EMAIL_TEXT[a.kind](a.params));
      const more = mine.length > 50 ? `و${mine.length - 50} تنبيهات أخرى` : '';
      const subject = `نبض — ${mine.length} تنبيه عاجل`;
      const text = `${lines.join('\n')}${more ? `\n${more}` : ''}\nافتح صندوق التنبيهات في لوحة الإدارة: /admin/alerts`;
      const html = `<div dir="rtl" style="font-family:sans-serif"><h2>تنبيهات عاجلة</h2><ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>${more ? `<p>${escapeHtml(more)}</p>` : ''}<p>افتح صندوق التنبيهات في لوحة الإدارة: /admin/alerts</p></div>`;
      const res = await this.mail.send(admin.email, subject, html, text);
      if (res?.ok) {
        sent += 1;
        for (const a of mine) recipients.set(a.id, (recipients.get(a.id) || 0) + 1);
      } else {
        this.logger.warn(`urgent alert mail not delivered admin=${admin.id}: ${res?.error || 'send_failed'}`);
      }
    }
    // Marked whatever the outcome so a later run never e-mails the same alert again.
    await this.alerts.updateMany(
      { id: { $in: alerts.map((a) => a.id) } } as never,
      { $set: { emailed_at: new Date() } } as never,
    ).catch(() => null);
    for (const [id, n] of recipients) await this.alerts.updateOne({ id } as never, { $set: { email_recipients: n } } as never).catch(() => null);
    return sent;
  }

  // ── Inbox ─────────────────────────────────────────────────────

  /** Kinds this admin may see (command.center.view plus the kind's own permission). */
  async visibleKinds(admin: AdminActor): Promise<AdminAlertKind[]> {
    const perms = new Set(await resolveEffectivePermissions(this.conn, admin));
    if (!perms.has(Permission.COMMAND_CENTER_VIEW)) return [];
    return ADMIN_ALERT_KINDS.filter((k) => perms.has(KIND_PERMISSION[k]));
  }

  async list(admin: AdminActor, page = 1, limit = 20, unreadOnly = false) {
    const kinds = await this.visibleKinds(admin);
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const match: Record<string, unknown> = { kind: { $in: kinds } };
    if (unreadOnly) match.read_by = { $ne: admin.id };
    const [rows, total] = await Promise.all([
      this.alerts.aggregate([
        { $match: match },
        { $addFields: { read: { $in: [admin.id, { $ifNull: ['$read_by', []] }] } } },
        { $sort: { read: 1, created_at: -1 } },
        { $skip: (p - 1) * l },
        { $limit: l },
        { $project: { _id: 0, read_by: 0, dedupe_key: 0 } },
      ]).toArray(),
      this.alerts.countDocuments(match as never),
    ]);
    return { data: rows, total, page: p, limit: l, unread: await this.unreadCount(admin, kinds) };
  }

  async unreadCount(admin: AdminActor, kinds?: AdminAlertKind[]) {
    const k = kinds ?? await this.visibleKinds(admin);
    return this.alerts.countDocuments({ kind: { $in: k }, read_by: { $ne: admin.id } } as never);
  }

  async markRead(admin: AdminActor, id: string) {
    const kinds = await this.visibleKinds(admin);
    const res = await this.alerts.updateOne({ id: { $eq: id }, kind: { $in: kinds } } as never, { $addToSet: { read_by: admin.id } } as never);
    if (!res.matchedCount) throw new NotFoundException('alert_not_found');
    return { ok: true, id, unread: await this.unreadCount(admin, kinds) };
  }

  async markAllRead(admin: AdminActor) {
    const kinds = await this.visibleKinds(admin);
    const res = await this.alerts.updateMany({ kind: { $in: kinds }, read_by: { $ne: admin.id } } as never, { $addToSet: { read_by: admin.id } } as never);
    return { ok: true, marked: res.modifiedCount, unread: 0 };
  }
}
