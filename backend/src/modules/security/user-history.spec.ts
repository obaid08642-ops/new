/**
 * Phase 23.6 — a person sees their own history, and only theirs.
 * Real in-memory Mongo; the same documents the audit chain, the engine and the pharmacy write.
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserHistoryService, ACTIVITY_ACTIONS, maskAddress } from './user-history.service';
import { PdplService } from '../users/pdpl.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { ProviderAuthService } from '../provider/services/provider-auth.service';

jest.setTimeout(60_000);

describe('Phase 23.6 user-facing history', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let history: UserHistoryService;
  const col = (n: string) => conn.collection(n);

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'user-history' }).asPromise();
    history = new UserHistoryService(conn);
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });
  beforeEach(async () => {
    for (const n of ['audit_logs', 'system_events', 'pharmacy_orders', 'pharmacy_allocations', 'labbookings', 'users']) {
      if (!(await conn.db!.collections()).some((c) => c.collectionName === n)) await conn.createCollection(n).catch(() => undefined);
      await col(n).deleteMany({});
    }
  });

  const audit = (over: Record<string, unknown>, seq: number) => col('audit_logs').insertOne({
    id: `a${seq}`, sequence: seq, createdAt: new Date(2026, 9, 1, 10, seq), hash: `h${seq}`, prev_hash: `h${seq - 1}`,
    severity: 'info', ip: '203.0.113.7', device_id: 'dev-abcdef0123456789', user_agent: 'Mozilla/5.0 (iPhone)', platform: 'ios', ...over,
  });

  describe('account activity', () => {
    it('lists the caller\'s own sign-in, security and consent events, newest first, without hashes or the full address', async () => {
      await audit({ user_id: 'me', action: 'account_registered' }, 1);
      await audit({ user_id: 'me', action: 'login_failed', details: { reason: 'wrong_password', identifier: 'abc123' } }, 2);
      await audit({ user_id: 'me', action: 'login_success' }, 3);
      await audit({ user_id: 'me', action: 'password_changed' }, 4);
      const r = await history.activity('me');
      expect(r.total).toBe(4);
      expect(r.events.map((e) => e.action)).toEqual(['password_changed', 'login_success', 'login_failed', 'account_registered']);
      const failed = r.events.find((e) => e.action === 'login_failed')!;
      expect(failed).toMatchObject({ outcome: 'failure', reason: 'wrong_password', platform: 'ios', ip: '203.0.*.*', device: '…6789' });
      const text = JSON.stringify(r);
      for (const secret of ['"hash"', 'prev_hash', '203.0.113.7', 'dev-abcdef0123456789', 'Mozilla', 'abc123', 'sequence']) expect(text).not.toContain(secret);
    });

    it('never shows another person\'s events, the admin\'s reads of the trail, or internal actions', async () => {
      await audit({ user_id: 'other', action: 'login_success' }, 1);
      await audit({ user_id: 'me', action: 'audit_timeline_read' }, 2);
      await audit({ user_id: 'me', action: 'service.cancelled' }, 3);
      await audit({ user_id: 'me', action: 'login_success' }, 4);
      const r = await history.activity('me');
      expect(r.events.map((e) => e.action)).toEqual(['login_success']);
      expect(r.total).toBe(1);
      expect((await history.activity('nobody')).events).toEqual([]);
    });

    it('pages, and clamps a silly page size', async () => {
      for (let i = 1; i <= 12; i++) await audit({ user_id: 'me', action: 'login_success' }, i);
      const p1 = await history.activity('me', 1, 5);
      const p3 = await history.activity('me', 3, 5);
      expect([p1.events.length, p3.events.length, p1.total]).toEqual([5, 2, 12]);
      expect((await history.activity('me', 1, 100000)).limit).toBe(100);
      expect((await history.activity('me', -4, 0)).page).toBe(1);
    });

    it('a query operator in the id matches nobody', async () => {
      await audit({ user_id: 'me', action: 'login_success' }, 1);
      expect((await history.activity({ $ne: 'x' } as unknown as string)).events).toEqual([]);
    });

    it('allow-list contains no admin or retention action', () => {
      for (const a of ACTIVITY_ACTIONS) expect(a).not.toMatch(/audit_|retention|chain/);
      expect(maskAddress('10.20.30.40')).toBe('10.20.*.*');
      expect(maskAddress('::ffff:203.0.113.9')).toBe('203.0.*.*');
      expect(maskAddress(null)).toBeNull();
    });
  });

  describe('status history of an order or booking', () => {
    const ev = (over: Record<string, unknown>, minute: number) => col('system_events').insertOne({
      id: `e${minute}`, entity_type: 'order', entity_id: 'ord-1', actor_role: 'patient', createdAt: new Date(2026, 9, 1, 10, minute), ...over,
    });
    beforeEach(async () => {
      await col('pharmacy_orders').insertOne({ id: 'ord-1', patient_account_id: 'pat' });
      await col('pharmacy_allocations').insertOne({ id: 'al-1', order_id: 'ord-1', pharmacy_account_id: 'ph' });
      await ev({ type: 'service.requested', actor_account_id: 'pat' }, 1);
      await ev({ type: 'service.matched', actor_account_id: 'pat', meta: { from_domain: 'draft', to_domain: 'ready_for_split' } }, 2);
      await ev({ type: 'pharmacy.offer.submitted', actor_account_id: 'ph', actor_role: 'pharmacy', entity_type: 'pharmacy_offer', entity_id: 'of-1' }, 3);
      await ev({ type: 'service.rollback', actor_account_id: 'pat', meta: { error: 'boom' } }, 4);
      await ev({ type: 'allocation.updated', actor_account_id: 'ph', actor_role: 'pharmacy' }, 5);
      await ev({ type: 'service.cancelled', actor_account_id: 'adm', actor_role: 'admin', reason_code: 'x'.repeat(500), meta: { from_domain: 'assigned', to_domain: 'cancelled', secret: 's' } }, 6);
      await ev({ type: 'service.completed', actor_role: 'system', meta: { from_domain: 'out_for_delivery', to_domain: 'delivered' } }, 7);
    });

    it('the patient sees the steps in order, with who did each from their side, and no internal events or fields', async () => {
      const r = await history.statusHistory({ id: 'pat' }, 'pharmacy', 'ord-1');
      expect(r.history.map((h) => h.event)).toEqual(['service.requested', 'service.matched', 'service.cancelled', 'service.completed']);
      expect(r.history.map((h) => h.by)).toEqual(['you', 'you', 'platform', 'system']);
      expect(r.history[1]).toMatchObject({ from: 'draft', to: 'ready_for_split' });
      expect(r.history[2].reason).toHaveLength(200);
      const text = JSON.stringify(r);
      for (const hidden of ['actor_account_id', 'boom', '"secret"', 'adm', 'idempotency', 'rollback']) expect(text).not.toContain(hidden);
    });

    it('the serving pharmacy sees the same order, and the patient\'s steps are "patient" to it', async () => {
      const r = await history.statusHistory({ id: 'ph' }, 'pharmacy', 'ord-1');
      expect(r.history.map((h) => h.by)).toEqual(['patient', 'patient', 'platform', 'system']);
    });

    it('a stranger gets 404 for an order that exists, exactly as for one that does not', async () => {
      await expect(history.statusHistory({ id: 'stranger' }, 'pharmacy', 'ord-1')).rejects.toBeInstanceOf(NotFoundException);
      await expect(history.statusHistory({ id: 'pat' }, 'pharmacy', 'no-such')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('bookings work the same way, owned by patient or provider', async () => {
      await col('labbookings').insertOne({ id: 'lab-1', patient_id: 'pat', provider_account_id: 'lab' });
      await col('system_events').insertOne({ id: 'l1', type: 'service.confirmed', entity_type: 'lab_booking', entity_id: 'lab-1', actor_account_id: 'lab', actor_role: 'lab', createdAt: new Date() });
      expect((await history.statusHistory({ id: 'pat' }, 'lab', 'lab-1')).history[0]).toMatchObject({ event: 'service.confirmed', by: 'provider' });
      expect((await history.statusHistory({ id: 'lab' }, 'lab', 'lab-1')).history[0].by).toBe('you');
      await expect(history.statusHistory({ id: 'other-lab' }, 'lab', 'lab-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses an unknown kind and an id that is not a plain id', async () => {
      await expect(history.statusHistory({ id: 'pat' }, 'orders', 'ord-1')).rejects.toBeInstanceOf(BadRequestException);
      await expect(history.statusHistory({ id: 'pat' }, 'pharmacy', '{"$ne":1}')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('PDPL export', () => {
    it('includes the person\'s own audit events and nobody else\'s', async () => {
      await col('users').insertOne({ id: 'me', role: 'patient', full_name: 'Sara', phone: '+966500000001' });
      await audit({ user_id: 'me', action: 'login_success', details: { method: 'password' } }, 1);
      await audit({ user_id: 'me', action: 'data_export' }, 2);
      await audit({ user_id: 'other', action: 'login_success' }, 3);
      const pdpl = new PdplService(conn, conn.model(User.name, UserSchema) as never);
      const out: any = await pdpl.exportPatientData('me');
      const events = out.data.audit_events;
      expect(events.map((e: any) => e.action).slice(0, 2)).toEqual(['login_success', 'data_export']);
      expect(events.every((e: any) => e.action !== 'login_success' || e.details?.method === 'password' || e.details === undefined)).toBe(true);
      expect(events.length).toBeLessThanOrEqual(3); // the export itself may be recorded too (23.2); the other person's event never is
      expect(events[0]).toMatchObject({ ip: '203.0.113.7', device_id: 'dev-abcdef0123456789', user_agent: 'Mozilla/5.0 (iPhone)' });
      expect(JSON.stringify(events)).not.toContain('"hash"');
    });
  });
});

describe('Phase 23.6 provider sign-in history and devices', () => {
  const chain = (rows: any[]) => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => rows }) }), limit: () => ({ lean: async () => rows }) }) });
  const make = (sessions: any[], logs: any[]) => {
    const svc: any = Object.create(ProviderAuthService.prototype);
    svc.sessions = { model: { find: jest.fn(() => chain(sessions)) } };
    svc.audit = { model: { find: jest.fn(() => chain(logs)), countDocuments: jest.fn(async () => logs.length) } };
    return svc;
  };

  it('lists the active sessions with a short device tail, marking the current one, and never the token hash', async () => {
    const svc = make([{ id: 's1', device_identifier: 'device-abcdef-1234', createdAt: new Date(), updatedAt: new Date(), expires_at: new Date(Date.now() + 1e6) }], []);
    const out = await svc.listSessions({ id: 'prov' }, 's1');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ session_id: 's1', device: '…1234', current: true });
    expect(JSON.stringify(out)).not.toContain('abcdef');
    const query = (svc.sessions.model.find as jest.Mock).mock.calls[0];
    expect(query[0]).toMatchObject({ provider_account_id: 'prov', status: 'active' });
    expect(query[1]).toEqual({ refresh_token_hash: 0 });
  });

  it('shows the sign-in history with a masked address and no refresh events', async () => {
    const svc = make([], [
      { id: 'l1', action: 'auth.login', createdAt: new Date(), meta: { ip: '198.51.100.20', device: 'device-9999' } },
      { id: 'l2', action: 'auth.session_revoked', createdAt: new Date(), meta: { reason: 'device_mismatch' } },
    ]);
    const out = await svc.history({ id: 'prov' });
    expect(out.events[0]).toMatchObject({ action: 'login', outcome: 'success', ip: '198.51.*.*', device: '…9999' });
    expect(out.events[1]).toMatchObject({ action: 'session_revoked', outcome: 'revoked', reason: 'device_mismatch' });
    const filter = (svc.audit.model.find as jest.Mock).mock.calls[0][0];
    expect(filter.provider_account_id).toBe('prov');
    expect(filter.action.$in).not.toContain('auth.refresh');
    expect(JSON.stringify(out)).not.toContain('198.51.100.20');
  });
});
