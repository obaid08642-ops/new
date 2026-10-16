/** Issues 955 / 995: admin kill switches and emergency maintenance — store, audit, enforcement at the root. */
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, Permission } from '../../common/permissions';
import { KillSwitchesService, killSwitchOff } from './kill-switches.service';
import { EmergencyMaintenanceMiddleware, isEmergencyExempt } from './emergency-maintenance.middleware';
import { KillSwitchesController } from './kill-switches.controller';
import { KILL_SWITCH_KEYS, KillSwitchKey } from './kill-switches.registry';
import { ChatService } from '../chat/chat.service';
import { ChatGateway } from '../chat/chat.gateway';
import { FamilyChatController } from '../chat/chat-compat.controller';
import { DoctorsService } from '../doctors/doctors.module';
import { AppointmentsService } from '../care/appointments.service';
import { ProviderPayoutsController } from '../payouts/provider-payouts.controller';
import { PharmacyOrderService } from '../pharmacy/services/pharmacy-order.service';
import { HomeCareSvc } from '../home-care/home-care.service';
import { AuthService } from '../auth/auth.service';
import { PatientUxService } from '../patient-ux/patient-ux.module';
import { RatingsService } from '../ratings/ratings.module';

type Doc = { key: string; value?: unknown; [k: string]: unknown };

function memoryDb(initial: Doc[] = []) {
  const docs = new Map<string, Doc>(initial.map((d) => [d.key, JSON.parse(JSON.stringify(d))]));
  const audit: Array<Record<string, unknown>> = [];
  const configs = {
    findOne: jest.fn(async (q: { key: string }) => (docs.has(q.key) ? JSON.parse(JSON.stringify(docs.get(q.key))) : null)),
    updateOne: jest.fn(async (q: { key: string }, u: { $set: Doc }) => {
      docs.set(q.key, { ...(docs.get(q.key) || { key: q.key }), ...JSON.parse(JSON.stringify(u.$set)) });
      return { acknowledged: true };
    }),
  };
  const log = { insertOne: jest.fn(async (d: Record<string, unknown>) => { audit.push(d); return { acknowledged: true }; }) };
  const conn: any = { collection: (name: string) => (name === 'admin_actions_log' ? log : configs) };
  return { conn, docs, audit, configs };
}

function service(initial: Doc[] = []) {
  const db = memoryDb(initial);
  const auditSvc: any = { write: jest.fn(async (e: Record<string, unknown>) => { db.audit.push(e); }) };
  return { svc: new KillSwitchesService(db.conn, auditSvc), ...db, auditSvc };
}

const admin = { id: 'owner-1', role: 'super_admin' };

describe('kill switches: store and audit', () => {
  it('lists every registered switch ON by default and never the removed ones', async () => {
    const { svc } = service();
    const rows = await svc.list();
    expect(rows.map((r) => r.key)).toEqual([...KILL_SWITCH_KEYS]);
    expect(rows.every((r) => r.value === true)).toBe(true);
    expect(rows.find((r) => r.key === 'emergency_system')).toBeUndefined();
    expect(rows.find((r) => r.key === 'online_payments')).toBeUndefined();
  });

  it('reads the legacy stored list (value false = off) and drops removed switches on the next write', async () => {
    const { svc, docs } = service([{ key: 'kill_switches', value: [{ id: 'KS007', key: 'emergency_system', value: false }, { id: 'KS008', key: 'reviews_enabled', value: false }] }]);
    expect(await svc.isOn('reviews_enabled')).toBe(false);
    await svc.set('chat_enabled', false, 'incident 42 spam wave', admin);
    const stored = (docs.get('kill_switches')!.value as Doc[]).map((d) => d.key).sort();
    expect(stored).toEqual(['chat_enabled', 'reviews_enabled']);
  });

  it('refuses an unknown key and a missing or short reason, and stores nothing', async () => {
    const { svc, configs } = service();
    await expect(svc.set('online_payments', false, 'payment outage', admin)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.set('chat_enabled', false, '', admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.set('chat_enabled', false, 'abc', admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(configs.updateOne).not.toHaveBeenCalled();
  });

  it('turns a switch off with an audited reason, then back on', async () => {
    const { svc, auditSvc } = service();
    const rows = await svc.set('new_registrations', false, 'bot sign-up wave', admin);
    expect(rows.find((r) => r.key === 'new_registrations')).toMatchObject({ value: false, reason: 'bot sign-up wave', updated_by: 'owner-1' });
    expect(auditSvc.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'kill_switch_update', target_id: 'new_registrations', reason: 'bot sign-up wave', before: { value: true }, after: { value: false } }));
    await expect(svc.assertOn('new_registrations')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await svc.set('new_registrations', true, 'wave is over', admin);
    await expect(svc.assertOn('new_registrations')).resolves.toBeUndefined();
  });

  it('fails open when the config store is unavailable', async () => {
    const conn: any = { collection: () => ({ findOne: async () => { throw new Error('down'); } }) };
    const svc = new KillSwitchesService(conn, { write: jest.fn() } as any);
    await expect(svc.isOn('chat_enabled')).resolves.toBe(true);
    await expect(svc.isEmergencyActive()).resolves.toBe(false);
  });

  it('the routes require modules.manage (the admin page permission)', () => {
    const reflector = new Reflector();
    expect(reflector.get(PERMISSIONS_KEY, KillSwitchesController)).toEqual([Permission.MODULES_MANAGE]);
  });
});

describe('emergency maintenance', () => {
  const apps = { key: 'app_versions', value: { apps: { patient: { min_version: '1.0.0', maintenance: false }, web: { maintenance: true, message_ar: 'صيانة' } } } };

  it('raises every app banner, keeps the previous flags, and puts them back exactly', async () => {
    const { svc, docs, auditSvc } = service([apps]);
    const on = await svc.setEmergency(true, 'database failover', admin);
    expect(on.active).toBe(true);
    const raised = (docs.get('app_versions')!.value as { apps: Record<string, { maintenance: boolean; min_version?: string }> }).apps;
    expect(Object.values(raised).every((a) => a.maintenance === true)).toBe(true);
    expect(raised.patient.min_version).toBe('1.0.0');
    expect(await svc.isEmergencyActive()).toBe(true);
    // A second "on" keeps the original flags (not the raised ones).
    await svc.setEmergency(true, 'still failing over', admin);
    const off = await svc.setEmergency(false, 'failover complete', admin);
    expect(off.active).toBe(false);
    const restored = (docs.get('app_versions')!.value as { apps: Record<string, { maintenance: boolean }> }).apps;
    expect(restored.patient.maintenance).toBe(false);
    expect(restored.web.maintenance).toBe(true);
    expect(restored.provider.maintenance).toBe(false);
    expect((await svc.emergencyState()).active).toBe(false);
    expect(auditSvc.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'emergency_maintenance_on', reason: 'database failover' }));
    expect(auditSvc.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'emergency_maintenance_off', reason: 'failover complete' }));
  });

  it('requires a reason and changes nothing without one', async () => {
    const { svc, configs } = service([apps]);
    await expect(svc.setEmergency(true, ' ', admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(configs.updateOne).not.toHaveBeenCalled();
  });

  it('the middleware refuses non-admin writes only while active', async () => {
    let active = false;
    const mw = new EmergencyMaintenanceMiddleware({ isEmergencyActive: async () => active } as any);
    const run = async (method: string, url: string) => {
      const next = jest.fn();
      try { await mw.use({ method, originalUrl: url }, {}, next); } catch (e) { return e; }
      return next.mock.calls.length ? 'next' : 'none';
    };
    expect(await run('PATCH', '/api/v1/users/me')).toBe('next');
    active = true;
    const refused = await run('PATCH', '/api/v1/users/me');
    expect(refused).toBeInstanceOf(ServiceUnavailableException);
    expect((refused as ServiceUnavailableException).getResponse()).toMatchObject({ code: 'emergency_maintenance' });
    expect(await run('POST', '/api/v1/patient/pharmacy/orders')).toBeInstanceOf(ServiceUnavailableException);
    expect(await run('GET', '/api/v1/patient/pharmacy/orders')).toBe('next');
    expect(await run('PUT', '/api/v1/admin/governance/trigger-emergency-maintenance')).toBe('next');
    expect(await run('POST', '/api/v1/auth/login')).toBe('next');
    expect(await run('POST', '/api/v1/kill-switches/chat_enabled')).toBe('next');
    expect(await run('POST', '/api/v1/payments/webhook/moyasar')).toBe('next');
    expect(isEmergencyExempt('/api/v1/authority/x')).toBe(false);
  });
});

describe('every listed switch is enforced where its action starts (nothing else is touched)', () => {
  const off = (key: KillSwitchKey) => ({
    isOn: async (k: string) => k !== key,
    assertOn: async (k: string) => { if (k === key) throw killSwitchOff(k); },
  }) as any;
  // Any access to a dependency fails the test: the switch must refuse before the action does anything.
  const untouched = (): any => new Proxy({}, { get: (_t, p) => { if (p === 'then') return undefined; throw new Error(`touched ${String(p)}`); } });
  const isOff = (key: string) => (e: unknown) => e instanceof ServiceUnavailableException && (e.getResponse() as { key?: string }).key === key;
  const expectOff = async (p: Promise<unknown>, key: string) => {
    const err = await p.then(() => null, (e) => e);
    expect(isOff(key)(err)).toBe(true);
  };

  it('chat_enabled: booking/direct chat, realtime relay, family chat, legacy doctor chat', async () => {
    const k = off('chat_enabled');
    await expectOff(new ChatService(untouched(), untouched(), untouched(), untouched(), k).sendMessage('t1', 'u1', 'patient', { body: 'hi' }), 'chat_enabled');
    const gw = new ChatGateway(untouched(), k);
    await expect(gw.handleSendMessage({ id: 's1', to: () => { throw new Error('relayed'); } } as any, { threadId: 't1', content: 'hi', state: 'OPEN' })).resolves.toEqual({ error: 'kill_switch_off:chat_enabled' });
    await expectOff(new FamilyChatController(untouched(), k).send({ id: 'u1' }, { text: 'hi' } as any), 'chat_enabled');
    await expectOff(new DoctorsService(untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), k).postMessage({ id: 'u1' }, 'a1', 'hi'), 'chat_enabled');
  });

  it('online_consultations: video bookings refused, clinic bookings not', async () => {
    const k = off('online_consultations');
    const appts = new AppointmentsService(untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), undefined, k);
    await expectOff(appts.create({ id: 'p1', role: 'patient' }, { doctor_id: 'd1', service_type: 'video', slot_start: '2030-01-01T10:00:00Z' }), 'online_consultations');
    const clinic = await appts.create({ id: 'p1', role: 'patient' }, { doctor_id: 'd1', service_type: 'clinic', slot_start: '2030-01-01T10:00:00Z' }).then(() => null, (e) => e);
    expect(isOff('online_consultations')(clinic)).toBe(false);
    const doctors = new DoctorsService(untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), k);
    await expectOff(doctors.book({ id: 'p1' }, { doctor_id: 'd1', scheduled_at: '2030-01-01T10:00:00Z', type: 'video' }), 'online_consultations');
  });

  it('provider_withdrawals: refused before any balance is read or locked', async () => {
    await expectOff(new ProviderPayoutsController(untouched(), untouched(), off('provider_withdrawals')).request({ id: 'pr1' }, { amount: 100, idempotency_key: 'k'.repeat(20) } as any), 'provider_withdrawals');
  });

  it('pharmacy_broadcast: submit refused, the order is not read or moved', async () => {
    const svc = new PharmacyOrderService(untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), off('pharmacy_broadcast'));
    await expectOff(svc.submit({ id: 'p1', role: 'patient' }, 'o1'), 'pharmacy_broadcast');
  });

  it('nursing_broadcast: home-nursing booking refused', async () => {
    const svc = new HomeCareSvc(untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), undefined, off('nursing_broadcast'));
    await expectOff(svc.book({ id: 'p1' }, { service_id: 's1', scheduled_at: '2030-01-01T10:00:00Z' }), 'nursing_broadcast');
  });

  it('new_registrations: both register contracts refused before the OTP or users are touched', async () => {
    const u = untouched;
    const auth = new AuthService(u(), u(), u(), u(), u(), undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, off('new_registrations'));
    await expectOff(auth.register({ full_name: 'x', email: 'a@b.test', password: 'Str0ng!Pass1' }), 'new_registrations');
    await expectOff(auth.registerPatientContract({ name: 'x', identifier: 'a@b.test', password: 'Str0ng!Pass1', locale: 'ar', consents: [] }), 'new_registrations');
  });

  it('reviews_enabled: both review routes refused', async () => {
    const k = off('reviews_enabled');
    const ux = new PatientUxService(untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), untouched(), k);
    await expectOff(ux.rate({ id: 'p1' }, { booking_kind: 'pharmacy', booking_id: 'o1', rating: 5 }), 'reviews_enabled');
    await expectOff(new RatingsService(untouched(), k).submit({ id: 'p1' }, { entity_type: 'order', entity_id: 'o1', provider_id: 'pr1', score: 5 }), 'reviews_enabled');
  });
});
