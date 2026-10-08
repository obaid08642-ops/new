/**
 * P22.6 — appointment quality: reschedule verification, no-show policy,
 * persistent waitlist with auto-offer, late notices, visit summary.
 * Mocked repositories (no mongo-memory).
 */
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Connection, Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentsService, normalizePolicy, NOSHOW_POLICY_DEFAULTS } from '../appointments.service';
import { APPT_STATES } from '../../../schemas/appointment.schema';
import { WaitlistEntryDocument } from '../schemas/waitlist-entry.schema';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { ProviderProfileRepository } from '../repositories/providerprofile.repository';
import { WorkflowEngineService } from '../../workflow-engine/workflow-engine.module';
import { InsuranceFlowService } from '../../insurance-engine/insurance-engine.module';

const futureQuarterHour = (hours: number) => {
  const d = new Date(Date.now() + hours * 3600000);
  d.setUTCMinutes(Math.ceil(d.getUTCMinutes() / 15) * 15, 0, 0);
  return d;
};

const makeDoc = (obj: Record<string, unknown>) => {
  const doc = { state_history: [], save: jest.fn().mockResolvedValue(true), ...obj } as unknown as Record<string, unknown> & {
    save: jest.Mock; toObject: () => Record<string, unknown>;
  };
  doc.toObject = () => {
    const { save: _s, toObject: _t, ...rest } = doc;
    return { ...rest };
  };
  return doc;
};

describe('P22.6 appointment quality', () => {
  let svc: AppointmentsService;
  let apptModel: { findOne: jest.Mock; create: jest.Mock; deleteOne: jest.Mock; find: jest.Mock };
  let providerModel: { findOne: jest.Mock };
  let connection: { db: { collection: jest.Mock }; collection: jest.Mock; model: jest.Mock };
  let events: { emit: jest.Mock };
  let engine: { apply: jest.Mock; announceCreated: jest.Mock };
  let waitlist: { findOne: jest.Mock; create: jest.Mock; findOneAndUpdate: jest.Mock; find: jest.Mock; updateOne: jest.Mock };
  let systemConfigs: { findOne: jest.Mock };

  const patient = { id: 'pat-1', role: 'patient' };
  const doctorUser = { id: 'doc-user-1', role: 'doctor' };

  const apptIn = (status: string, extra: Record<string, unknown> = {}) =>
    makeDoc({
      id: 'appt-1',
      status,
      patient_id: 'pat-1',
      doctor_user_id: 'doc-user-1',
      doctor_id: 'doc-1',
      slot_start: new Date(Date.now() + 48 * 3600000),
      duration_minutes: 30,
      price: 200,
      total_price: 215,
      ...extra,
    });

  beforeEach(() => {
    apptModel = { findOne: jest.fn(), create: jest.fn(), deleteOne: jest.fn().mockResolvedValue({}), find: jest.fn() };
    providerModel = { findOne: jest.fn().mockResolvedValue({ id: 'doc-1', user_id: 'doc-user-1', account_id: 'doc-account-1', type: 'doctor' }) };
    systemConfigs = { findOne: jest.fn().mockResolvedValue(null) };
    connection = {
      db: {
        collection: jest.fn((name: string) => {
          if (name === 'system_configs') return systemConfigs;
          if (name === 'provider_accounts') return { findOne: jest.fn().mockResolvedValue(null) };
          return { findOne: jest.fn().mockResolvedValue(null) };
        }),
      },
      // isFacilityOwner reads connection.collection directly (not .db)
      collection: jest.fn((name: string) => {
        if (name === 'provider_accounts') return { findOne: jest.fn().mockResolvedValue(null) };
        return { findOne: jest.fn().mockResolvedValue(null) };
      }),
      model: jest.fn().mockReturnValue(undefined),
    };
    events = { emit: jest.fn() };
    engine = { apply: jest.fn(async (opts: { mutate: () => unknown }) => opts.mutate()), announceCreated: jest.fn() };
    waitlist = { findOne: jest.fn(), create: jest.fn(), findOneAndUpdate: jest.fn(), find: jest.fn(), updateOne: jest.fn() };
    // Direct construction (same pattern as appointments-states.spec.ts): the
    // @Optional() waitlist model is passed explicitly so offer paths are live.
    svc = new AppointmentsService(
      apptModel as unknown as AppointmentRepository,
      providerModel as unknown as ProviderProfileRepository,
      connection as unknown as Connection,
      events as unknown as EventEmitter2,
      engine as unknown as WorkflowEngineService,
      { createRequest: jest.fn() } as unknown as InsuranceFlowService,
      undefined,
      waitlist as unknown as Model<WaitlistEntryDocument>,
    );
    jest.clearAllMocks();
  });

  describe('normalizePolicy', () => {
    it('defaults when absent and clamps hostile values', () => {
      expect(normalizePolicy(null)).toEqual({ ...NOSHOW_POLICY_DEFAULTS });
      const p = normalizePolicy({ enabled: true, fee_sar: -20, late_threshold_minutes: 5000, waitlist_offer_ttl_minutes: 0 });
      expect(p.fee_sar).toBe(0);
      expect(p.late_threshold_minutes).toBeLessThanOrEqual(240);
      expect(p.waitlist_offer_ttl_minutes).toBeGreaterThanOrEqual(5);
    });
  });

  describe('reschedule verification (exists — gaps fixed)', () => {
    it('PENDING (unpaid card) stays PENDING after the move', async () => {
      const appt = apptIn(APPT_STATES.PENDING);
      apptModel.findOne.mockResolvedValueOnce(appt).mockResolvedValueOnce(null);
      apptModel.create.mockImplementation(async (d: unknown) => makeDoc({ id: 'appt-2', ...(d as object) }));
      const res = await svc.reschedule('appt-1', patient, { slot_start: futureQuarterHour(72).toISOString() }) as { status: string };
      expect(res.status).toBe(APPT_STATES.PENDING);
    });

    it('refuses CHECKED_IN and IN_PROGRESS (visit already underway)', async () => {
      for (const s of [APPT_STATES.CHECKED_IN, APPT_STATES.IN_PROGRESS]) {
        apptModel.findOne.mockResolvedValueOnce(apptIn(s));
        await expect(svc.reschedule('appt-1', patient, { slot_start: futureQuarterHour(72).toISOString() })).rejects.toThrow(BadRequestException);
      }
      expect(apptModel.create).not.toHaveBeenCalled();
    });

    it('linked facility owner may reschedule (parity with appointment access)', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED);
      apptModel.findOne.mockResolvedValueOnce(appt).mockResolvedValueOnce(null);
      apptModel.create.mockImplementation(async (d: unknown) => makeDoc({ id: 'appt-2', ...(d as object) }));
      connection.collection = jest.fn(() => ({ findOne: jest.fn().mockResolvedValue({ _id: 'x' }) }));
      const res = await svc.reschedule('appt-1', { id: 'hosp-1', role: 'hospital' }, { slot_start: futureQuarterHour(72).toISOString() }) as { status: string };
      expect(res.status).toBe(APPT_STATES.CONFIRMED);
    });

    it('family booker on whose behalf it was booked may reschedule', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED, { booked_by_user_id: 'mom-1' });
      apptModel.findOne.mockResolvedValueOnce(appt).mockResolvedValueOnce(null);
      apptModel.create.mockImplementation(async (d: unknown) => makeDoc({ id: 'appt-2', ...(d as object) }));
      const res = await svc.reschedule('appt-1', { id: 'mom-1', role: 'patient' }, { slot_start: futureQuarterHour(72).toISOString() }) as { status: string };
      expect(res.status).toBe(APPT_STATES.CONFIRMED);
    });

    it('a foreign slot hold blocks the re-hold', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED);
      apptModel.findOne.mockResolvedValueOnce(appt);
      connection.model = jest.fn().mockReturnValue({
        findOne: () => ({ lean: jest.fn().mockResolvedValue({ id: 'hold-x' }) }),
      });
      await expect(svc.reschedule('appt-1', patient, { slot_start: futureQuarterHour(72).toISOString() })).rejects.toThrow('slot_held');
      expect(apptModel.create).not.toHaveBeenCalled();
    });
  });

  describe('markNoShow (configurable policy)', () => {
    const pastAppt = () => apptIn(APPT_STATES.CONFIRMED, { slot_start: new Date(Date.now() - 3600000) });

    it('applies the admin-set fee and emits the event', async () => {
      systemConfigs.findOne.mockResolvedValueOnce({ value: { enabled: true, fee_sar: 75 } });
      apptModel.findOne.mockResolvedValueOnce(pastAppt());
      const res = await svc.markNoShow('appt-1', doctorUser) as { status: string; noshow_fee: number };
      expect(res.status).toBe(APPT_STATES.NO_SHOW);
      expect(res.noshow_fee).toBe(75);
      expect(events.emit).toHaveBeenCalledWith('appointment.no_show', expect.objectContaining({ fee_sar: 75 }));
    });

    it('disabled policy records zero fee', async () => {
      systemConfigs.findOne.mockResolvedValueOnce({ value: { enabled: false, fee_sar: 200 } });
      apptModel.findOne.mockResolvedValueOnce(pastAppt());
      const res = await svc.markNoShow('appt-1', doctorUser) as { noshow_fee: number };
      expect(res.noshow_fee).toBe(0);
    });

    it('is idempotent on an already-NO_SHOW booking', async () => {
      apptModel.findOne.mockResolvedValueOnce(apptIn(APPT_STATES.NO_SHOW, { noshow_fee: 50 }));
      const res = await svc.markNoShow('appt-1', doctorUser) as { noshow_fee: number };
      expect(res.noshow_fee).toBe(50);
      expect(engine.apply).not.toHaveBeenCalled();
    });

    it('rejects future slots, wrong states, and strangers', async () => {
      apptModel.findOne.mockResolvedValueOnce(apptIn(APPT_STATES.CONFIRMED));
      await expect(svc.markNoShow('appt-1', doctorUser)).rejects.toThrow('slot_has_not_passed');
      const pendingPast = apptIn(APPT_STATES.PENDING, { slot_start: new Date(Date.now() - 3600000) });
      apptModel.findOne.mockResolvedValueOnce(pendingPast);
      await expect(svc.markNoShow('appt-1', doctorUser)).rejects.toThrow(BadRequestException);
      apptModel.findOne.mockResolvedValueOnce(pastAppt());
      await expect(svc.markNoShow('appt-1', { id: 'stranger', role: 'patient' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('waitlist (persistent + auto-offer)', () => {
    const entryDoc = (over: Record<string, unknown> = {}) =>
      makeDoc({ id: 'wl-1', doctor_id: 'doc-1', slot_date: '2026-11-01', patient_id: 'pat-1', status: 'WAITING', ...over });

    it('join persists, dedupes the live entry, and replays the key', async () => {
      waitlist.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      providerModel.findOne.mockResolvedValueOnce({ id: 'doc-1', type: 'doctor', status: 'active' });
      waitlist.create.mockImplementation(async (d: unknown) => entryDoc(d as Record<string, unknown>));
      const out = await svc.joinWaitlist(patient, { doctorId: 'doc-1', date: '2026-11-01', idempotency_key: 'k-1' }) as { status: string };
      expect(out.status).toBe('WAITING');
      waitlist.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(entryDoc());
      const dupe = await svc.joinWaitlist(patient, { doctorId: 'doc-1', date: '2026-11-01', idempotency_key: 'k-2' }) as { id: string };
      expect(dupe.id).toBe('wl-1');
      expect(waitlist.create).toHaveBeenCalledTimes(1);
      waitlist.findOne.mockResolvedValueOnce(entryDoc());
      const replay = await svc.joinWaitlist(patient, { doctorId: 'doc-1', date: '2026-11-01', idempotency_key: 'k-1' }) as { id: string };
      expect(replay.id).toBe('wl-1');
    });

    it('rejects missing key and reused key', async () => {
      await expect(svc.joinWaitlist(patient, { doctorId: 'doc-1', date: '2026-11-01', idempotency_key: '' })).rejects.toThrow(BadRequestException);
      waitlist.findOne.mockResolvedValueOnce(entryDoc({ patient_id: 'pat-9' }));
      await expect(svc.joinWaitlist(patient, { doctorId: 'doc-1', date: '2026-11-01', idempotency_key: 'k-1' })).rejects.toThrow(ConflictException);
    });

    it('two waiters + one freed slot → exactly one OFFERED (atomic filter)', async () => {
      const first = entryDoc({ id: 'wl-1', patient_id: 'pat-1' });
      waitlist.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(first) });
      waitlist.findOneAndUpdate
        .mockResolvedValueOnce({ toObject: () => ({ id: 'wl-1', patient_id: 'pat-1', status: 'OFFERED' }) })
        .mockResolvedValueOnce(null); // second contender loses the race
      const win = await svc.offerNextOnCancellation('doc-1', '2026-11-01', new Date(Date.now() + 86400000));
      expect((win as { patient_id: string }).patient_id).toBe('pat-1');
      const lost = await svc.offerNextOnCancellation('doc-1', '2026-11-01', new Date(Date.now() + 86400000));
      expect(lost).toBeNull();
      expect(waitlist.findOneAndUpdate).toHaveBeenCalledWith(
        { id: { $eq: 'wl-1' }, status: { $eq: 'WAITING' } },
        expect.objectContaining({ $set: expect.objectContaining({ status: 'OFFERED' }) }),
        { new: true },
      );
      const offered = events.emit.mock.calls.filter((c) => c[0] === 'appointment.waitlist.offered');
      expect(offered).toHaveLength(1);
    });

    it('cancel() auto-offers the freed slot', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED, { slot_start: new Date(Date.now() + 48 * 3600000) });
      apptModel.findOne.mockResolvedValue(appt);
      const waiting = entryDoc();
      waitlist.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(waiting) });
      waitlist.findOneAndUpdate.mockResolvedValue({ toObject: () => ({ id: 'wl-1', patient_id: 'pat-1', status: 'OFFERED' }) });
      await svc.cancel('appt-1', patient, 'plans changed');
      expect(events.emit).toHaveBeenCalledWith('appointment.waitlist.offered', expect.objectContaining({ patient_id: 'pat-1' }));
    });

    it('accept consumes; expired offers are marked EXPIRED', async () => {
      const offered = entryDoc({ status: 'OFFERED', offer_expires_at: new Date(Date.now() + 600000) });
      waitlist.findOne.mockResolvedValueOnce(offered);
      const out = await svc.acceptOffer(patient, 'wl-1') as { status: string };
      expect(out.status).toBe('CONSUMED');
      const stale = entryDoc({ status: 'OFFERED', offer_expires_at: new Date(Date.now() - 1000) });
      waitlist.findOne.mockResolvedValueOnce(stale);
      await expect(svc.acceptOffer(patient, 'wl-1')).rejects.toThrow('offer_expired');
      expect(stale.status).toBe('EXPIRED');
    });

    it('leave works for the owner, forbidden for strangers', async () => {
      waitlist.findOne.mockResolvedValueOnce(entryDoc());
      const out = await svc.leaveWaitlist(patient, 'wl-1');
      expect(out).toEqual({ id: 'wl-1', status: 'LEFT' });
      waitlist.findOne.mockResolvedValueOnce(entryDoc());
      await expect(svc.leaveWaitlist({ id: 'stranger' }, 'wl-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('doctor running late', () => {
    it('owning doctor reports; patient event carries the delay', async () => {
      apptModel.findOne.mockResolvedValueOnce(apptIn(APPT_STATES.CONFIRMED));
      const out = await svc.reportLate(doctorUser, 'appt-1', 25);
      expect(out).toEqual({ id: 'appt-1', delay_minutes: 25, auto: false });
      expect(events.emit).toHaveBeenCalledWith('appointment.doctor_running_late', expect.objectContaining({ delay_minutes: 25, auto: false }));
    });

    it('rejects out-of-range delays and non-owners', async () => {
      apptModel.findOne.mockResolvedValue(apptIn(APPT_STATES.CONFIRMED));
      await expect(svc.reportLate(doctorUser, 'appt-1', 3)).rejects.toThrow(BadRequestException);
      await expect(svc.reportLate({ id: 'stranger', role: 'patient' }, 'appt-1', 25)).rejects.toThrow(ForbiddenException);
    });

    it('auto threshold flags an overdue CONFIRMED visit exactly once', async () => {
      const doc = apptIn(APPT_STATES.CONFIRMED, { slot_start: new Date(Date.now() - 30 * 60000) });
      const chain = () => ({ limit: jest.fn().mockResolvedValue([doc]) });
      apptModel.find.mockReturnValueOnce(chain());
      const first = await svc.applyAutoLateNotices(new Date());
      expect(first.flagged).toBe(1);
      expect(events.emit).toHaveBeenCalledWith('appointment.doctor_running_late', expect.objectContaining({ auto: true }));
      apptModel.find.mockReturnValueOnce(chain());
      const second = await svc.applyAutoLateNotices(new Date());
      expect(second.flagged).toBe(0);
    });
  });

  describe('visit summary (exists — ownership fixed)', () => {
    const summary = { diagnosis: 'flu', notes: 'rest', recommendations: 'water', prescription: [], written_at: new Date() };

    it('serves the structured summary to patient and owning doctor', async () => {
      apptModel.findOne.mockResolvedValue(apptIn(APPT_STATES.COMPLETED, { summary }));
      const forPatient = await svc.getSummary('appt-1', patient);
      expect((forPatient as { diagnosis: string }).diagnosis).toBe('flu');
      const forDoctor = await svc.getSummary('appt-1', doctorUser);
      expect((forDoctor as { diagnosis: string }).diagnosis).toBe('flu');
    });

    it('404s when not ready, 403s for strangers', async () => {
      apptModel.findOne.mockResolvedValueOnce(apptIn(APPT_STATES.COMPLETED));
      await expect(svc.getSummary('appt-1', patient)).rejects.toThrow(NotFoundException);
      apptModel.findOne.mockResolvedValueOnce(apptIn(APPT_STATES.COMPLETED, { summary }));
      await expect(svc.getSummary('appt-1', { id: 'stranger', role: 'patient' })).rejects.toThrow(ForbiddenException);
    });

    it('finish() persists the SOAP summary then completes', async () => {
      const appt = apptIn(APPT_STATES.IN_PROGRESS);
      apptModel.findOne.mockResolvedValue(appt);
      const out = await svc.finish('appt-1', { diagnosis: 'flu', notes: 'rest' }, doctorUser) as { success: boolean; appointment: { status: string } };
      expect(out.success).toBe(true);
      expect(out.appointment.status).toBe(APPT_STATES.COMPLETED);
      expect((appt.summary as { diagnosis: string }).diagnosis).toBe('flu');
    });
  });

  describe('getSummary for unknown id', () => {
    it('404s', async () => {
      apptModel.findOne.mockResolvedValueOnce(null);
      await expect(svc.getSummary('nope', patient)).rejects.toThrow(NotFoundException);
    });
  });
});
