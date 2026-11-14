/**
 * M7 — Appointment state machine + cancellation/refund rules.
 */
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from '../appointments.service';
import { APPT_STATES, APPT_TRANSITIONS } from '../../../schemas/appointment.schema';

const makeDoc = (obj: any) => {
  const doc: any = { state_history: [], ...obj };
  doc.save = jest.fn().mockResolvedValue(doc);
  doc.toObject = () => ({ ...doc });
  return doc;
};

describe('AppointmentsService state machine', () => {
  let service: AppointmentsService;
  let apptModel: any;
  let providerModel: any;
  let events: any;
  let engine: any;

  beforeEach(() => {
    apptModel = { findOne: jest.fn(), create: jest.fn(), updateOne: jest.fn().mockResolvedValue({ acknowledged: true }), deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    providerModel = { findOne: jest.fn().mockResolvedValue({ id: 'doc-1', user_id: 'doc-user-1', account_id: 'doc-account-1', type: 'doctor' }) };
    events = { emit: jest.fn() };
    engine = { apply: jest.fn(async (opts: any) => opts.mutate()) };
    // Constructor: (apptModel, providerModel, connection, events, engine, insurance, locks?) —
    // connection was added for family on-behalf booking checks; insurance mock
    // covers cancel paths that never invoke it; locks stay undefined (no lock
    // paths in these tests). These tests exercise the state machine only.
    const insurance = { createRequest: jest.fn() };
    service = new AppointmentsService(apptModel, providerModel, { db: { collection: jest.fn() } } as any, events, engine, insurance as any);
    jest.clearAllMocks();
  });

  const apptIn = (status: string, extra: any = {}) =>
    makeDoc({
      id: 'appt-1',
      status,
      patient_id: 'pat-1',
      doctor_user_id: 'doc-user-1',
      doctor_id: 'doc-1',
      slot_start: new Date(Date.now() + 48 * 3600000),
      duration_minutes: 30,
      ...extra,
    });

  it('defines a closed lifecycle: PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED', () => {
    expect(APPT_TRANSITIONS[APPT_STATES.PENDING]).toContain(APPT_STATES.CONFIRMED);
    expect(APPT_TRANSITIONS[APPT_STATES.CONFIRMED]).toContain(APPT_STATES.CHECKED_IN);
    expect(APPT_TRANSITIONS[APPT_STATES.CHECKED_IN]).toContain(APPT_STATES.IN_PROGRESS);
    expect(APPT_TRANSITIONS[APPT_STATES.IN_PROGRESS]).toContain(APPT_STATES.COMPLETED);
    expect(APPT_TRANSITIONS[APPT_STATES.COMPLETED]).toEqual([]);
    expect(APPT_TRANSITIONS[APPT_STATES.CANCELLED]).toEqual([]);
  });

  it('rejects invalid transitions (PENDING → COMPLETED)', async () => {
    apptModel.findOne.mockResolvedValue(apptIn(APPT_STATES.PENDING));
    await expect(service.transition('appt-1', APPT_STATES.COMPLETED, { id: 'doc-user-1', role: 'doctor' })).rejects.toThrow(BadRequestException);
    expect(engine.apply).not.toHaveBeenCalled();
  });

  it('rejects transitions from terminal states', async () => {
    apptModel.findOne.mockResolvedValue(apptIn(APPT_STATES.COMPLETED));
    await expect(service.transition('appt-1', APPT_STATES.CANCELLED, { id: 'x', role: 'admin' })).rejects.toThrow(BadRequestException);
  });

  it('valid transition stamps state + history + confirmed_at and emits event', async () => {
    const appt = apptIn(APPT_STATES.PENDING);
    apptModel.findOne.mockResolvedValue(appt);
    const res = await service.confirm('appt-1', { id: 'doc-user-1', role: 'doctor' });
    expect(res.status).toBe(APPT_STATES.CONFIRMED);
    expect(res.confirmed_at).toBeDefined();
    expect(res.state_history.length).toBe(1);
    expect(events.emit).toHaveBeenCalledWith('appointment.confirmed', { id: 'appt-1', actor: 'doc-user-1' });
    expect(engine.apply).toHaveBeenCalledWith(expect.objectContaining({ from_domain: 'PENDING', to_domain: 'CONFIRMED' }));
  });

  it('allows the internal system actor to auto-confirm a cash or insurance appointment without bypassing external ownership', async () => {
    const appt = apptIn(APPT_STATES.PENDING);
    apptModel.findOne.mockResolvedValue(appt);

    const res = await service.transition('appt-1', APPT_STATES.CONFIRMED, { id: 'system', role: 'system' }, 'auto-confirmed (cash)');

    expect(res.status).toBe(APPT_STATES.CONFIRMED);
    expect(res.confirmed_at).toBeDefined();
    expect(events.emit).toHaveBeenCalledWith('appointment.confirmed', { id: 'appt-1', actor: 'system' });
  });

  it('allows the provider account identity to transition its doctor profile appointment', async () => {
    const appt = apptIn(APPT_STATES.CHECKED_IN);
    apptModel.findOne.mockResolvedValue(appt);
    const res = await service.start('appt-1', { id: 'doc-account-1', role: 'provider', provider_type: 'doctor' });
    expect(res.status).toBe(APPT_STATES.IN_PROGRESS);
  });

  it('throws NotFound for unknown appointment', async () => {
    apptModel.findOne.mockResolvedValue(null);
    await expect(service.transition('nope', APPT_STATES.CONFIRMED, { id: 'x' })).rejects.toThrow(NotFoundException);
  });

  describe('cancel — refund rules', () => {
    it('patient cancels >24h before → 100% refund to source', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED, { slot_start: new Date(Date.now() + 48 * 3600000) });
      apptModel.findOne.mockResolvedValue(appt);
      const res = await service.cancel('appt-1', { id: 'pat-1', role: 'patient' }, 'plans changed');
      expect(res.refund_percentage).toBe(100);
      expect(res.refund_destination).toBe('source');
      expect(res.doctor_penalty).toBe(0);
      expect(events.emit).toHaveBeenCalledWith('appointment.refund.calculated', expect.objectContaining({ refund_percentage: 100 }));
    });

    // D-26 (owner): the full-refund window is 2 h (was 24 h), so "late" is now inside 2 h.
    it('patient cancels <2h before → 50% refund, back to the original payment', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED, { slot_start: new Date(Date.now() + 1 * 3600000) });
      apptModel.findOne.mockResolvedValue(appt);
      const res = await service.cancel('appt-1', { id: 'pat-1', role: 'patient' });
      expect(res.refund_percentage).toBe(50);
      expect(res.refund_destination).toBe('source');
    });

    it('an illegal cancel (already completed) throws before any refund is stored or emitted', async () => {
      const appt = apptIn(APPT_STATES.COMPLETED);
      apptModel.findOne.mockResolvedValue(appt);
      await expect(service.cancel('appt-1', { id: 'pat-1', role: 'patient' }, 'too late')).rejects.toThrow(BadRequestException);
      expect(events.emit).not.toHaveBeenCalledWith('appointment.refund.calculated', expect.anything());
      expect(apptModel.updateOne).not.toHaveBeenCalled();
      expect(appt.save).not.toHaveBeenCalled();
    });

    it('a legal cancel stores the refund and emits it only after the state change', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED, { slot_start: new Date(Date.now() + 48 * 3600000) });
      apptModel.findOne.mockResolvedValue(appt);
      const order: string[] = [];
      engine.apply.mockImplementation(async (opts: any) => { const r = await opts.mutate(); order.push('transition'); return r; });
      events.emit.mockImplementation((name: string) => { if (name === 'appointment.refund.calculated') order.push('refund'); });
      await service.cancel('appt-1', { id: 'pat-1', role: 'patient' });
      expect(order).toEqual(['transition', 'refund']);
      expect(apptModel.updateOne).toHaveBeenCalledWith({ id: 'appt-1' }, { $set: expect.objectContaining({ refund_percentage: 100, refund_destination: 'source' }) });
    });

    it('patient no-show → 0% refund', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED);
      apptModel.findOne.mockResolvedValue(appt);
      const res = await service.cancel('appt-1', { id: 'doc-user-1', role: 'doctor' }, 'no_show', true);
      expect(res.refund_percentage).toBe(0);
    });

    it('doctor cancels → 100% refund + 50 SAR doctor penalty', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED);
      apptModel.findOne.mockResolvedValue(appt);
      const res = await service.cancel('appt-1', { id: 'doc-user-1', role: 'doctor' }, 'emergency');
      expect(res.refund_percentage).toBe(100);
      expect(res.refund_destination).toBe('source');
      expect(res.doctor_penalty).toBe(50);
    });

    it('forbids cancellation by a stranger', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED);
      apptModel.findOne.mockResolvedValue(appt);
      await expect(service.cancel('appt-1', { id: 'stranger', role: 'patient' })).rejects.toThrow(ForbiddenException);
    });

    it('admin can cancel any appointment', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED);
      apptModel.findOne.mockResolvedValue(appt);
      const res = await service.cancel('appt-1', { id: 'admin-1', role: 'admin' }, 'ops decision');
      expect(res.status).toBe(APPT_STATES.CANCELLED);
    });
  });

  describe('reschedule', () => {
    const futureQuarterHour = () => {
      const d = new Date(Date.now() + 72 * 3600000);
      d.setUTCMinutes(Math.ceil(d.getUTCMinutes() / 15) * 15, 0, 0);
      return d.toISOString();
    };

    it('creates the replacement before marking the old appointment RESCHEDULED', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED, { price: 200, total_price: 215 });
      apptModel.findOne.mockResolvedValueOnce(appt).mockResolvedValueOnce(null);
      apptModel.create.mockImplementation(async (doc: any) => makeDoc({ id: 'appt-2', ...doc }));
      const res = await service.reschedule('appt-1', { id: 'pat-1', role: 'patient' }, { slot_start: futureQuarterHour() });
      expect(appt.status).toBe(APPT_STATES.RESCHEDULED);
      expect(res.status).toBe(APPT_STATES.CONFIRMED);
      expect(res.rescheduled_from_id).toBe('appt-1');
      expect(new Date(res.slot_end).getTime() - new Date(res.slot_start).getTime()).toBe(30 * 60_000);
      expect(apptModel.create.mock.invocationCallOrder[0]).toBeLessThan(appt.save.mock.invocationCallOrder[0]);
    });

    it('rejects a conflicting slot while keeping the original appointment unchanged', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED);
      apptModel.findOne.mockResolvedValueOnce(appt).mockResolvedValueOnce({ id: 'occupied-slot' });

      await expect(service.reschedule('appt-1', { id: 'pat-1', role: 'patient' }, { slot_start: futureQuarterHour() }))
        .rejects.toThrow(ConflictException);

      expect(appt.status).toBe(APPT_STATES.CONFIRMED);
      expect(apptModel.create).not.toHaveBeenCalled();
      expect(appt.save).not.toHaveBeenCalled();
    });

    it('compensates by deleting the replacement if saving the old transition fails', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED);
      appt.save.mockRejectedValueOnce(new Error('old-appointment-save-failed'));
      apptModel.findOne.mockResolvedValueOnce(appt).mockResolvedValueOnce(null);
      apptModel.create.mockImplementation(async (doc: any) => makeDoc({ id: 'appt-2', ...doc }));

      await expect(service.reschedule('appt-1', { id: 'pat-1', role: 'patient' }, { slot_start: futureQuarterHour() }))
        .rejects.toThrow('old-appointment-save-failed');

      expect(apptModel.deleteOne).toHaveBeenCalledWith({ id: 'appt-2' });
    });

    describe('late free reschedule (owner decision 2026-11-10: instead of the 50 % late cancel, ONE free reschedule within 14 days)', () => {
      const quarterIn = (hours: number) => { const d = new Date(Date.now() + hours * 3600000); d.setUTCMinutes(Math.ceil(d.getUTCMinutes() / 15) * 15, 0, 0); return d.toISOString(); };
      const patient = { id: 'pat-1', role: 'patient' };
      const lateAppt = (extra: any = {}) => apptIn(APPT_STATES.CONFIRMED, { slot_start: new Date(Date.now() + 60 * 60000), ...extra });
      const answer = (appt: any) => { apptModel.findOne.mockResolvedValueOnce(appt).mockResolvedValueOnce(null); apptModel.create.mockImplementation(async (doc: any) => makeDoc({ id: 'appt-2', ...doc })); };

      it('the patient moves the booking inside the last 2 hours to a slot within 14 days: the replacement carries the mark, the old one is RESCHEDULED, nothing is cancelled or refunded', async () => {
        const appt = lateAppt(); answer(appt);
        const res = await service.reschedule('appt-1', patient, { slot_start: quarterIn(24 * 10) });
        expect(res).toMatchObject({ status: APPT_STATES.CONFIRMED, rescheduled_from_id: 'appt-1', late_free_reschedule: true });
        expect(appt.status).toBe(APPT_STATES.RESCHEDULED);
        expect(appt.state_history.at(-1).note).toBe('rescheduled-late-free');
      });
      it('a slot further than 14 days is refused (nothing is created)', async () => {
        const appt = lateAppt(); answer(appt);
        await expect(service.reschedule('appt-1', patient, { slot_start: quarterIn(24 * 15) })).rejects.toThrow('late_reschedule_within_14_days');
        expect(apptModel.create).not.toHaveBeenCalled();
      });
      it('the ordinary (not late) reschedule keeps its own rules: no 14-day limit, no mark', async () => {
        const appt = apptIn(APPT_STATES.CONFIRMED, { slot_start: new Date(Date.now() + 10 * 3600000) }); answer(appt);
        const res = await service.reschedule('appt-1', patient, { slot_start: quarterIn(24 * 20) });
        expect(res.late_free_reschedule).toBeUndefined();
      });
      it('only the patient side: the doctor or an admin rescheduling inside the last 2 hours is still refused', async () => {
        for (const user of [{ id: 'doc-user-1', role: 'doctor' }, { id: 'admin-1', role: 'admin' }]) {
          apptModel.findOne.mockResolvedValueOnce(lateAppt());
          await expect(service.reschedule('appt-1', user, { slot_start: quarterIn(48) })).rejects.toThrow('reschedule_too_late_for_free_reschedule');
        }
      });
      it('after the start it is a no-show, not a reschedule', async () => {
        apptModel.findOne.mockResolvedValueOnce(lateAppt({ slot_start: new Date(Date.now() - 10 * 60000) }));
        await expect(service.reschedule('appt-1', patient, { slot_start: quarterIn(48) })).rejects.toThrow('reschedule_too_late_for_free_reschedule');
      });
      it('the one free reschedule already used: refused', async () => {
        const appt = lateAppt({ rescheduled_from_id: 'appt-0' });
        apptModel.findOne.mockResolvedValueOnce(appt).mockResolvedValueOnce({ id: 'appt-0' });
        await expect(service.reschedule('appt-1', patient, { slot_start: quarterIn(48) })).rejects.toThrow('no_free_reschedules_left');
      });
    });

    it('rejects past/near slot_start', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED);
      apptModel.findOne.mockResolvedValue(appt);
      await expect(
        service.reschedule('appt-1', { id: 'pat-1', role: 'patient' }, { slot_start: new Date(Date.now() - 3600000).toISOString() }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
