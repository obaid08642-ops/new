/**
 * #1235 urgent admin alerts: the evaluator applies the admin's rules to the today screen's queries, stores each
 * finding once per entity+kind+window, e-mails each new alert once to admins allowed to see it, and the inbox
 * routes are permission-guarded.
 */
import 'reflect-metadata';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException, NotFoundException, RequestMethod, ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY, Permission, ROLE_PERMISSIONS } from '../../../common/permissions';
import { ROLES_KEY } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { AdminUrgentAlertsService, ALERTS_COLLECTION } from './admin-urgent-alerts.service';
import { AdminUrgentAlertsController } from './admin-urgent-alerts.controller';
import { UpdateAdminAlertRulesDto } from './admin-urgent-alerts.dto';

jest.setTimeout(120_000);

const ADMIN = { id: 'adm-1', role: 'admin', email: 'ops@nabd.test' };
const FINANCE_ONLY = { id: 'adm-2', role: 'admin', email: 'fin@nabd.test', custom_role_keys: [] as string[] };

describe('AdminUrgentAlertsService', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: AdminUrgentAlertsService;
  const mail = { send: jest.fn(async () => ({ ok: true, provider: 'test', fallback_used: false })) };
  const audit = { write: jest.fn(async () => undefined) };
  const col = (n: string) => conn.collection(n);

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = mongoose.createConnection(mongo.getUri());
    await conn.asPromise();
  });
  afterAll(async () => {
    await conn.close();
    await mongo.stop();
  });
  beforeEach(async () => {
    await conn.dropDatabase();
    mail.send.mockClear();
    audit.write.mockClear();
    svc = new AdminUrgentAlertsService(conn, mail as never, audit as never);
    await svc.onModuleInit();
    await col('users').insertMany([
      { id: ADMIN.id, role: 'admin', email: ADMIN.email, active: true },
      // Not an admin-panel role (never e-mailed); holds command.center.view + order.read, not finance.read.
      { id: 'sup-1', role: 'support_agent', email: 'support@nabd.test', active: true },
      { id: 'adm-off', role: 'admin', email: 'off@nabd.test', active: false },
    ] as never);
  });

  const setRules = (over: Array<{ kind: string; threshold: number; enabled?: boolean; notify_email?: boolean }>) =>
    svc.updateRules(over.map((r) => ({ enabled: true, notify_email: true, ...r })) as never, ADMIN as never);

  it('defaults come from the existing business rules (ops_stuck_minutes, fraud detector limits)', async () => {
    await col('system_config').insertOne({ key: 'system_config', value: { ops_stuck_minutes: 45 } } as never);
    const { rules } = await svc.getRules();
    expect(rules.find((r) => r.kind === 'order_stuck')?.threshold).toBe(45);
    expect(rules.find((r) => r.kind === 'payment_failures')?.threshold).toBe(5);
    expect(rules.find((r) => r.kind === 'fraud_high')?.threshold).toBe(80);
    expect(rules.find((r) => r.kind === 'sla_breach')?.threshold).toBe(0);
  });

  it('rule changes are stored, range-checked per kind and audited', async () => {
    await setRules([{ kind: 'payment_failures', threshold: 2 }]);
    expect((await svc.getRules()).rules.find((r) => r.kind === 'payment_failures')?.threshold).toBe(2);
    expect(audit.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin_alert_rules_update', target_id: 'admin_alert_rules' }));
    await expect(setRules([{ kind: 'fraud_high', threshold: 150 }])).rejects.toBeInstanceOf(BadRequestException);
    await expect(setRules([{ kind: 'order_stuck', threshold: 5 }, { kind: 'order_stuck', threshold: 6 }])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('payment failures: alert only at the threshold, once per hour window, e-mailed once', async () => {
    await setRules([{ kind: 'payment_failures', threshold: 2 }, { kind: 'sla_breach', threshold: 0, enabled: false }, { kind: 'order_stuck', threshold: 30, enabled: false }]);
    const now = new Date();
    await col('transactions').insertOne({ id: 't1', status: 'failed', updatedAt: now, createdAt: now } as never);
    let out = await svc.evaluate(now);
    expect(out.created).toBe(0);
    await col('transactions').insertOne({ id: 't2', status: 'failed', updatedAt: now, createdAt: now } as never);
    // An old failure outside the hour does not count.
    await col('transactions').insertOne({ id: 't0', status: 'failed', updatedAt: new Date(now.getTime() - 2 * 3600000) } as never);
    out = await svc.evaluate(now);
    expect(out.created).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledWith(ADMIN.email, expect.stringContaining('تنبيه عاجل'), expect.any(String), expect.stringContaining('مدفوعات فاشلة'));
    // Second evaluation in the same window: no duplicate, no second mail.
    await col('transactions').insertOne({ id: 't3', status: 'failed', updatedAt: now } as never);
    out = await svc.evaluate(now);
    expect(out.created).toBe(0);
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(await col(ALERTS_COLLECTION).countDocuments({ kind: 'payment_failures' })).toBe(1);
    const row: any = await col(ALERTS_COLLECTION).findOne({ kind: 'payment_failures' });
    expect(row).toMatchObject({ entity_type: 'transactions', severity: 'critical', message_key: 'admin_alerts.payment_failures', params: { count: 2, threshold: 2 } });
    expect(row.emailed_at).toBeInstanceOf(Date);
  });

  it('stuck orders: per order, threshold in minutes, no duplicate on re-run, no mail when e-mail is off', async () => {
    await setRules([{ kind: 'order_stuck', threshold: 10, notify_email: false }]);
    const now = new Date();
    await col('labbookings').insertMany([
      { id: 'lab-old', state: 'CONFIRMED', createdAt: new Date(now.getTime() - 20 * 60000) },
      { id: 'lab-new', state: 'CONFIRMED', createdAt: new Date(now.getTime() - 5 * 60000) },
      { id: 'lab-done', state: 'REPORTED', createdAt: new Date(now.getTime() - 60 * 60000) },
    ] as never);
    const first = await svc.evaluate(now);
    expect(first.created_by_kind).toEqual({ order_stuck: 1 });
    const second = await svc.evaluate(now);
    expect(second.created).toBe(0);
    const rows = await col(ALERTS_COLLECTION).find({ kind: 'order_stuck' }).toArray();
    expect(rows.map((r: any) => r.entity_id)).toEqual(['lab-old']);
    expect(rows[0]).toMatchObject({ link: '/admin/orders/lab/lab-old' });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('SLA breaches use the today screen filter and alert again only for a new due time', async () => {
    await setRules([{ kind: 'sla_breach', threshold: 0, notify_email: false }, { kind: 'order_stuck', threshold: 30, enabled: false }]);
    const now = new Date();
    const due = new Date(now.getTime() - 60000);
    await col('radiologybookings').insertMany([
      { id: 'rad-1', state: 'CONFIRMED', sla_due_at: due },
      { id: 'rad-closed', state: 'REPORT_PUBLISHED', sla_due_at: due },
    ] as never);
    expect((await svc.evaluate(now)).created).toBe(1);
    expect((await svc.evaluate(now)).created).toBe(0);
    await col('radiologybookings').updateOne({ id: 'rad-1' }, { $set: { sla_due_at: new Date(now.getTime() - 1000) } });
    expect((await svc.evaluate(now)).created).toBe(1);
  });

  it('fraud: only open alerts at or above the confidence threshold', async () => {
    await setRules([{ kind: 'fraud_high', threshold: 80 }, { kind: 'order_stuck', threshold: 30, enabled: false }, { kind: 'sla_breach', threshold: 0, enabled: false }]);
    await col('fraud_alerts').insertMany([
      { id: 'fa-hi', flagType: 'payment_velocity_abuse', confidenceScore: 0.85, status: 'pending', createdAt: new Date() },
      { id: 'fa-lo', flagType: 'coupon_abuse', confidenceScore: 0.5, status: 'pending', createdAt: new Date() },
      { id: 'fa-done', flagType: 'refund_abuse', confidenceScore: 0.99, status: 'dismissed', createdAt: new Date() },
    ] as never);
    const out = await svc.evaluate();
    expect(out.created_by_kind).toEqual({ fraud_high: 1 });
    expect(await col(ALERTS_COLLECTION).findOne({ kind: 'fraud_high' })).toMatchObject({ entity_id: 'fa-hi', params: { confidence: 85 } });
  });

  it('inbox: unread first, per-admin read state, unread count, kinds limited by permission', async () => {
    await setRules([{ kind: 'payment_failures', threshold: 1, notify_email: false }, { kind: 'order_stuck', threshold: 10, notify_email: false }]);
    const now = new Date();
    await col('transactions').insertOne({ id: 't1', status: 'failed', updatedAt: now } as never);
    await col('labbookings').insertOne({ id: 'lab-1', state: 'CONFIRMED', createdAt: new Date(now.getTime() - 3600000) } as never);
    await svc.evaluate(now);
    expect(await svc.unreadCount(ADMIN as never)).toBe(2);
    const list = await svc.list(ADMIN as never, 1, 20);
    expect(list.total).toBe(2);
    const stuck = list.data.find((a: any) => a.kind === 'order_stuck') as any;
    const read = await svc.markRead(ADMIN as never, stuck.id);
    expect(read.unread).toBe(1);
    const after = await svc.list(ADMIN as never, 1, 20);
    expect(after.data.map((a: any) => [a.kind, a.read])).toEqual([['payment_failures', false], ['order_stuck', true]]);
    expect((await svc.list(ADMIN as never, 1, 20, true)).total).toBe(1);
    // Another admin's read state is their own.
    await col('users').insertOne({ id: 'adm-3', role: 'admin', email: 'x@nabd.test' } as never);
    expect(await svc.unreadCount({ id: 'adm-3', role: 'admin' } as never)).toBe(2);
    // support_agent holds command.center.view + order.read but not finance.read: sees only the order alert.
    const sup = await svc.list({ id: 'sup-1', role: 'support_agent' } as never, 1, 20);
    expect(sup.data.map((a: any) => a.kind)).toEqual(['order_stuck']);
    await expect(svc.markRead({ id: 'sup-1', role: 'support_agent' } as never, list.data.find((a: any) => a.kind === 'payment_failures')!.id as string))
      .rejects.toBeInstanceOf(NotFoundException);
    expect((await svc.markAllRead(ADMIN as never)).marked).toBe(1);
    expect(await svc.unreadCount(ADMIN as never)).toBe(0);
  });

  it('e-mail goes only to active admins whose permissions cover the kind', async () => {
    await col('admin_custom_roles').insertOne({ key: 'fin_only', permissions: [Permission.COMMAND_CENTER_VIEW, Permission.FINANCE_READ] } as never);
    await col('users').insertOne({ ...FINANCE_ONLY, role: 'admin', custom_role_keys: ['fin_only'] } as never);
    await setRules([{ kind: 'payment_failures', threshold: 1 }, { kind: 'order_stuck', threshold: 30, enabled: false }, { kind: 'sla_breach', threshold: 0, enabled: false }]);
    await col('transactions').insertOne({ id: 't1', status: 'failed', updatedAt: new Date() } as never);
    await svc.evaluate();
    const to = mail.send.mock.calls.map((c: unknown[]) => c[0]).sort();
    // support@ (no finance.read) and off@ (inactive) are not mailed.
    expect(to).toEqual([FINANCE_ONLY.email, ADMIN.email].sort());
  });
});

describe('AdminUrgentAlertsController guards', () => {
  type Ctor = { prototype: object };
  const VERB: Record<string, RequestMethod> = { GET: RequestMethod.GET, POST: RequestMethod.POST, PUT: RequestMethod.PUT };
  function handler(cls: Ctor, verb: string, path: string): Function {
    const proto = cls.prototype as Record<string, unknown>;
    for (const name of Object.getOwnPropertyNames(proto)) {
      const fn = proto[name];
      if (typeof fn !== 'function' || name === 'constructor') continue;
      if (Reflect.getMetadata(PATH_METADATA, fn) === path && Reflect.getMetadata(METHOD_METADATA, fn) === VERB[verb]) return fn;
    }
    throw new Error(`no ${verb} ${path}`);
  }
  const perms = (verb: string, path: string) => Reflect.getMetadata(PERMISSIONS_KEY, handler(AdminUrgentAlertsController, verb, path));

  it('is admin-only and every route names its permission', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminUrgentAlertsController)).toBe('admin/urgent-alerts');
    expect(Reflect.getMetadata(ROLES_KEY, AdminUrgentAlertsController)).toEqual([UserRole.ADMIN]);
    expect(perms('GET', '/')).toEqual([Permission.COMMAND_CENTER_VIEW]);
    expect(perms('GET', 'unread-count')).toEqual([Permission.COMMAND_CENTER_VIEW]);
    expect(perms('POST', ':id/read')).toEqual([Permission.COMMAND_CENTER_VIEW]);
    expect(perms('POST', 'read-all')).toEqual([Permission.COMMAND_CENTER_VIEW]);
    expect(perms('GET', 'rules')).toEqual([Permission.COMMAND_CENTER_VIEW]);
    expect(perms('PUT', 'rules')).toEqual([Permission.OPS_CRONS_RUN]);
    expect(perms('POST', 'evaluate')).toEqual([Permission.OPS_CRONS_RUN]);
  });

  it('the built-in admin role holds every permission these routes need', () => {
    for (const p of [Permission.COMMAND_CENTER_VIEW, Permission.OPS_CRONS_RUN, Permission.ORDER_READ, Permission.FINANCE_READ]) {
      expect(ROLE_PERMISSIONS[UserRole.ADMIN]).toContain(p);
    }
  });

  it('the rules DTO rejects unknown kinds, non-integer thresholds and extra fields', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const meta = { type: 'body' as const, metatype: UpdateAdminAlertRulesDto };
    await expect(pipe.transform({ rules: [{ kind: 'payment_failures', threshold: 3, enabled: true, notify_email: true }] }, meta)).resolves.toBeDefined();
    await expect(pipe.transform({ rules: [{ kind: 'nope', threshold: 3, enabled: true, notify_email: true }] }, meta)).rejects.toBeDefined();
    await expect(pipe.transform({ rules: [{ kind: 'order_stuck', threshold: 2.5, enabled: true, notify_email: true }] }, meta)).rejects.toBeDefined();
    await expect(pipe.transform({ rules: [{ kind: 'order_stuck', threshold: 5, enabled: true, notify_email: true, extra: 1 }] }, meta)).rejects.toBeDefined();
  });
});
