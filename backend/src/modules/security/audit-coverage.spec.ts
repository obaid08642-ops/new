/**
 * Phase 23.2 — the covered events reach the tamper-evident chain with every field.
 * Real AuditService on an in-memory Mongo; the coverage service is driven the way the event bus drives it.
 */
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditService } from './security.module';
import { AuditCoverageService, isBusShaped } from './audit-coverage.service';
import { AuditLogSchema } from '../../schemas/audit-log.schema';
import { runWithLogContext, setLogUser } from '../../common/structured-logger';
import { recordAudit, registerAuditSink } from '../../common/audit-record';

jest.setTimeout(60_000);

const ORIGIN = { requestId: 'req-1', ip: '203.0.113.7', userAgent: 'Mozilla/5.0 (iPhone)', deviceId: 'dev-abcdef0123456789', platform: 'ios', appVersion: '4.2.0' };

describe('Phase 23.2 covered events', () => {
  let server: MongoMemoryServer;
  let conn: Connection;
  let Logs: Model<any>;
  let audit: AuditService;
  let coverage: AuditCoverageService;

  beforeAll(async () => {
    server = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(server.getUri()).asPromise();
    Logs = conn.model('AuditLog', AuditLogSchema) as Model<any>;
    const mod = await Test.createTestingModule({
      providers: [AuditService, AuditCoverageService, { provide: getModelToken('AuditLog'), useValue: Logs }],
    }).compile();
    audit = mod.get(AuditService);
    coverage = mod.get(AuditCoverageService);
  });
  afterAll(async () => { registerAuditSink(null); await conn?.close(); await server?.stop(); });
  beforeEach(async () => {
    await Logs.deleteMany({});
    await conn.collection('audit_sequence').deleteMany({});
  });

  const rows = () => Logs.find({}).sort({ sequence: 1 }).lean<any[]>();
  const inRequest = <T>(fn: () => Promise<T>) => runWithLogContext(ORIGIN, fn);

  it('a bus event of the order/booking families becomes one row: actor, entity, before/after, reason, origin, request id', async () => {
    await inRequest(() => coverage.onAnyEvent({
      type: 'service.cancelled', entity_type: 'order', entity_id: 'o-1', actor_account_id: 'u-patient', actor_role: 'patient',
      patient_account_id: 'u-patient', reason_code: 'changed_my_mind',
      meta: { kind: 'pharmacy', from_domain: 'cod_due_on_delivery', to_domain: 'cancelled', national_id: '1234567890' },
    }));
    const [r] = await rows();
    expect(r).toMatchObject({
      action: 'service.cancelled', user_id: 'u-patient', role: 'patient', resource_kind: 'order', resource_id: 'o-1',
      reason: 'changed_my_mind', severity: 'warn',
      changes: { before: { state: 'cod_due_on_delivery' }, after: { state: 'cancelled' } },
      ip: '203.0.113.7', device_id: 'dev-abcdef0123456789', user_agent: 'Mozilla/5.0 (iPhone)', platform: 'ios', app_version: '4.2.0',
      correlation_id: 'req-1',
    });
    expect(r.details).toMatchObject({ patient_id: 'u-patient', kind: 'pharmacy' });
    expect(JSON.stringify(r)).not.toContain('1234567890'); // sensitive meta never reaches the trail
    expect(typeof r.hash).toBe('string');
    expect(r.sequence).toBe(1);
  });

  it('a pharmacy bus event and an admin change are covered too; an unrelated or malformed event is not', async () => {
    await coverage.onAnyEvent({ type: 'pharmacy.offer.selected', entity_type: 'pharmacy_offer', entity_id: 'of-1', actor_account_id: 'p1', actor_role: 'patient', pharmacy_account_id: 'ph1', meta: { order_id: 'o-1' } });
    await coverage.onAnyEvent({ type: 'admin.price_updated', entity_type: 'product', entity_id: 'sku-9', actor_account_id: 'a1', actor_role: 'admin', reason_code: 'supplier change', before: { price: 10 }, after: { price: 12 } });
    await coverage.onAnyEvent({ type: 'presence.updated', entity_type: 'user', entity_id: 'u1' });
    await coverage.onAnyEvent({ type: 'service.completed', entity_id: 'x' }); // no entity_type
    await coverage.onAnyEvent(null);
    await coverage.onAnyEvent('service.completed');
    const r = await rows();
    expect(r.map((x) => x.action)).toEqual(['pharmacy.offer.selected', 'admin.price_updated']);
    expect(r[1]).toMatchObject({ role: 'admin', severity: 'warn', reason: 'supplier change', changes: { before: { price: 10 }, after: { price: 12 } } });
    expect(isBusShaped({ type: 'service.requested', entity_type: 'order', entity_id: 'o' })).toBe(true);
    expect(isBusShaped({ type: 'presence.updated', entity_type: 'user', entity_id: 'o' })).toBe(false);
  });

  it('an admin acting as somebody else is recorded with the impersonator', async () => {
    await runWithLogContext({ ...ORIGIN }, async () => {
      setLogUser('u-target', 'patient', 'admin-1');
      await coverage.onAnyEvent({ type: 'service.confirmed', entity_type: 'order', entity_id: 'o-2', actor_account_id: 'u-target', actor_role: 'patient' });
    });
    const [r] = await rows();
    expect(r.impersonator_id).toBe('admin-1');
  });

  it('sign-up, sign-in (success and failure), OTP, password, session, device and consent events are covered', async () => {
    await inRequest(async () => {
      await coverage.onRegistered({ user_id: 'u1', role: 'patient' });
      await coverage.onLoggedIn({ user_id: 'u1', role: 'patient' });
      await coverage.onOtpRequested({ user_id: 'u1', purpose: 'login', channel: 'email' });
      await coverage.onPasswordChanged({ user_id: 'u1', role: 'patient', how: 'change' });
      await coverage.onSessionEnded({ user_id: 'u1', scope: 'this_device', sessions: 1 });
      await coverage.onDeviceChanged({ user_id: 'u1', change: 'revoked' });
      await coverage.onLegalAccepted({ user_id: 'u1', role: 'patient', policy_key: 'patient_terms', version: '2.0' });
    });
    await inRequest(() => (audit as any).onLoginFailed({ phone: '0551234567', user_id: 'u1', reason: 'wrong_password', ip: '198.51.100.2', user_agent: 'UA' }));
    const r = await rows();
    expect(r.map((x) => x.action)).toEqual(['account_registered', 'login_success', 'otp_requested', 'password_changed', 'session_ended', 'device_revoked', 'policy_accepted', 'login_failed']);
    expect(r.every((x) => x.user_id === 'u1')).toBe(true);
    expect(r[7].ip).toBe('198.51.100.2'); // an explicit origin wins over the ambient one
    expect(r[7].details.reason).toBe('wrong_password');
    expect(JSON.stringify(r[7])).not.toContain('0551234567'); // the identifier is stored hashed only
    expect(r[0].ip).toBe('203.0.113.7');
    expect(r[6].details.version).toBe('2.0');
  });

  it('services that used to insert raw rows now write chained rows through recordAudit; the chain stays intact', async () => {
    await inRequest(() => recordAudit(conn, { action: 'sla_update', resource_kind: 'system_config', resource_id: 'system_config:sla', user_id: 'a1', role: 'admin', changes: { after: { value: { minutes: 30 } } }, reason: 'drill' }));
    await coverage.onAnyEvent({ type: 'service.requested', entity_type: 'order', entity_id: 'o-3', actor_account_id: 'u2', actor_role: 'patient' });
    const r = await rows();
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ action: 'sla_update', sequence: 1, ip: '203.0.113.7', reason: 'drill' });
    expect(r[1].prev_hash).toBe(r[0].hash);
    expect(await audit.verifyChain()).toMatchObject({ ok: true, checked: 2 });
    // editing a recorded change is detected, as for every other row
    await Logs.collection.updateOne({ action: 'sla_update' }, { $set: { 'changes.after.value.minutes': 1 } });
    expect(await audit.verifyChain()).toMatchObject({ ok: false, reason: 'hash_mismatch' });
  });

  it('an event with no actor is attributed to the caller of the request; radiology steps are covered', async () => {
    await runWithLogContext({ ...ORIGIN }, async () => {
      setLogUser('radiologist-1', 'radiology');
      await coverage.onRadiologyState({ bookingId: 'rb-1', state: 'IN_SCANNING', patientId: 'u5' });
      await coverage.onRadiologyAborted({ bookingId: 'rb-1', reason: 'patient left', patientId: 'u5' });
    });
    const r = await rows();
    expect(r.map((x) => x.action)).toEqual(['radiology.state_changed', 'radiology.scan_aborted']);
    expect(r[0]).toMatchObject({ user_id: 'radiologist-1', role: 'radiology', resource_kind: 'radiology_booking', resource_id: 'rb-1' });
    expect(r[1].reason).toBe('patient left');
    expect((await audit.timeline({ resource_id: 'rb-1' })).length).toBe(2);
  });

  it('the timeline of an order is its full ordered chain: its own events, the offers made for it and its payments', async () => {
    await coverage.onAnyEvent({ type: 'service.requested', entity_type: 'order', entity_id: 'ord-9', actor_account_id: 'u9', actor_role: 'patient' });
    await coverage.onAnyEvent({ type: 'pharmacy.offer.submitted', entity_type: 'pharmacy_offer', entity_id: 'of-9', actor_account_id: 'ph9', actor_role: 'pharmacy', meta: { order_id: 'ord-9' } });
    await coverage.onAnyEvent({ type: 'pharmacy.offer.selected', entity_type: 'pharmacy_offer', entity_id: 'of-9', actor_account_id: 'u9', actor_role: 'patient', meta: { order_id: 'ord-9' } });
    await (audit as any).onPaymentCompleted({ patient_id: 'u9', transaction_id: 'tx-9', amount: 50, booking_id: 'ord-9', booking_kind: 'pharmacy' });
    await coverage.onAnyEvent({ type: 'service.completed', entity_type: 'order', entity_id: 'ord-9', actor_account_id: 'ph9', actor_role: 'pharmacy', meta: { from_domain: 'out_for_delivery', to_domain: 'delivered' } });
    await coverage.onAnyEvent({ type: 'service.requested', entity_type: 'order', entity_id: 'other-order', actor_account_id: 'u1', actor_role: 'patient' });
    const story = await audit.timeline({ resource_id: 'ord-9' });
    expect(story.map((e: any) => e.action)).toEqual(['service.requested', 'pharmacy.offer.submitted', 'pharmacy.offer.selected', 'payment_completed', 'service.completed']);
    expect(story.map((e: any) => e.sequence)).toEqual([...story.map((e: any) => e.sequence)].sort((a, b) => a - b));
    // a query operator in the id is still refused, and an id of another order never matches
    await expect(audit.timeline({ resource_id: '{"$ne":1}' })).rejects.toThrow('audit_timeline_bad_resource_id');
    expect((await audit.timeline({ resource_id: 'ord-99' }))).toHaveLength(0);
  });

  it('without a chain writer (a unit test of a service) recordAudit falls back to a plain row instead of failing the action', async () => {
    registerAuditSink(null);
    try {
      await recordAudit(conn, { action: 'fallback_probe', user_id: 'x' });
      expect(await conn.collection('audit_logs').countDocuments({ action: 'fallback_probe' })).toBe(1);
      await expect(recordAudit(undefined, { action: 'nowhere' })).resolves.toBeUndefined();
    } finally {
      registerAuditSink((e) => audit.write(e));
    }
  });
});
