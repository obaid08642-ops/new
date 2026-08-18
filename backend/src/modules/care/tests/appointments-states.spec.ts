/**
 * M7 — Appointment state machine + cancellation/refund rules.
 */
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
    apptModel = { findOne: jest.fn(), create: jest.fn() };
    providerModel = { findOne: jest.fn().mockResolvedValue({ id: 'doc-1', user_id: 'doc-user-1', account_id: 'doc-account-1', type: 'doctor' }) };
    events = { emit: jest.fn() };
    engine = { apply: jest.fn(async (opts: any) => opts.mutate()) };
    // Constructor: (apptModel, providerModel, connection, events, engine) —
    // connection was added for family on-behalf booking checks; these tests
    // exercise the state machine only, so a stub connection suffices.
    service = new AppointmentsService(apptModel, providerModel, { db: { collection: jest.fn() } } as any, events, engine);
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

    it('patient cancels <24h before → 50% refund to wallet', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED, { slot_start: new Date(Date.now() + 5 * 3600000) });
      apptModel.findOne.mockResolvedValue(appt);
      const res = await service.cancel('appt-1', { id: 'pat-1', role: 'patient' });
      expect(res.refund_percentage).toBe(50);
      expect(res.refund_destination).toBe('wallet');
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
    it('marks old appointment RESCHEDULED and creates a new CONFIRMED one', async () => {
      const appt = apptIn(APPT_STATES.CONFIRMED, { price: 200, total_price: 215 });
      apptModel.findOne.mockResolvedValue(appt);
      apptModel.create.mockImplementation(async (doc: any) => makeDoc({ id: 'appt-2', ...doc }));
      const future = new Date(Date.now() + 72 * 3600000).toISOString();
      const res = await service.reschedule('appt-1', { id: 'pat-1', role: 'patient' }, { slot_start: future });
      expect(appt.status).toBe(APPT_STATES.RESCHEDULED);
      expect(res.status).toBe(APPT_STATES.CONFIRMED);
      expect(res.rescheduled_from_id).toBe('appt-1');
      expect(new Date(res.slot_end).getTime() - new Date(res.slot_start).getTime()).toBe(30 * 60_000);
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
