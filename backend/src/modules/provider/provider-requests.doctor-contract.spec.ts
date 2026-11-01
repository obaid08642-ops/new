import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProviderRequestsController } from './provider.controllers';

describe('ProviderRequestsController doctor record contracts', () => {
  const user = { id: 'provider-1', role: 'doctor' };
  const make = (request: any = { id: 'request-1', provider_account_id: 'provider-1', patient: { id: 'patient-1', name: 'Patient' }, payload: {}, status: 'in_progress', amount_total: 100 }) => {
    const svc: any = { detail: jest.fn().mockResolvedValue(request), complete: jest.fn().mockResolvedValue({ status: 'completed' }) };
    const repo: any = { updateOne: jest.fn().mockResolvedValue(request) };
    const events: any = { emit: jest.fn() };
    const patientProfiles: any = { findOne: jest.fn().mockResolvedValue(null) };
    const conn: any = { collection: jest.fn((name: string) => {
      if (name === 'patient_profiles') return patientProfiles;
      return { findOne: jest.fn().mockResolvedValue({ display_name: 'Provider' }), insertOne: jest.fn().mockResolvedValue({}) };
    }) };
    return { controller: new ProviderRequestsController(svc, repo, events, conn), svc, repo, events, patientProfiles };
  };

  it('uses the owned-detail guard before returning prescriptions and lab orders', async () => {
    const { controller, svc } = make({ id: 'request-1', payload: { prescriptions: [{ id: 'rx-1' }], labs: [{ id: 'lab-1' }] } });
    await expect(controller.getOrders(user, 'request-1')).resolves.toEqual({ prescriptions: [{ id: 'rx-1' }], labs: [{ id: 'lab-1' }] });
    expect(svc.detail).toHaveBeenCalledWith(user, 'request-1');
  });

  it('rejects an attempt to end a consultation that is not in progress', async () => {
    const { controller, repo, svc } = make({ id: 'request-1', status: 'accepted', patient: { id: 'patient-1' }, payload: {} });
    await expect(controller.endConsultation(user, 'request-1', {})).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.updateOne).not.toHaveBeenCalled();
    expect(svc.complete).not.toHaveBeenCalled();
  });

  it('records clinical orders only through the owned request and canonical completion transition', async () => {
    const { controller, repo, svc, events } = make();
    const result = await controller.endConsultation(user, 'request-1', { prescriptions: [{ medicine_id: 'm-1' }], labs: [{ code: 'CBC' }] });
    expect(repo.updateOne).toHaveBeenCalledWith(
      { id: 'request-1', provider_account_id: 'provider-1' },
      expect.objectContaining({ $set: expect.objectContaining({ payload: expect.objectContaining({ prescriptions: [{ medicine_id: 'm-1' }], labs: [{ code: 'CBC' }] }) }) }),
    );
    expect(svc.complete).toHaveBeenCalledWith(user, 'request-1', expect.any(Object));
    expect(events.emit).toHaveBeenCalledWith('medical_orders.emitted', expect.objectContaining({ threadId: 'request-1' }));
    expect(result.state).toBe('completed');
  });

  it('rejects a report whose supplied patient differs from the server-owned request patient', async () => {
    const { controller } = make();
    await expect(controller.issueMedicalReport(user, 'request-1', { patient_id: 'patient-foreign', findings: 'verified findings' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a verified patient insurance policy before accepting an insurance decision', async () => {
    const { controller } = make();
    await expect(controller.requestInsuranceCopay(user, 'request-1', { approvalStatus: 'approved', patientCopay: 0, approvalCode: 'approval-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('a medical report on a normal appointment (no provider request exists)', () => {
    const { NotFoundException } = require('@nestjs/common');
    const build = (appointment: any) => {
      const inserted: any[] = [];
      const svc: any = { detail: jest.fn().mockRejectedValue(new NotFoundException('request not found')) };
      const events: any = { emit: jest.fn() };
      const conn: any = { collection: jest.fn((name: string) => {
        if (name === 'appointments') return { findOne: jest.fn().mockResolvedValue(appointment), find: () => ({ toArray: async () => (appointment ? [{ id: appointment.id }] : []) }) };
        if (name === 'medicalreports') return { insertOne: jest.fn(async (d: any) => { inserted.push(d); }) };
        return { findOne: jest.fn().mockResolvedValue({ display_name: 'Provider' }), insertOne: jest.fn() };
      }) };
      return { controller: new ProviderRequestsController(svc, {} as any, events, conn), inserted, svc, events };
    };
    it('is issued for the patient of the doctor\'s own appointment', async () => {
      const { controller, inserted, events } = build({ id: 'appt-1', patient_id: 'patient-9', patient_name: 'Huda' });
      await expect(controller.issueMedicalReport(user, 'appt-1', { findings: 'clear' } as any)).resolves.toMatchObject({ ok: true });
      expect(inserted[0]).toMatchObject({ patient_id: 'patient-9', patient_name: 'Huda' });
      expect(events.emit).toHaveBeenCalledWith('medical_report.created', expect.objectContaining({ patient_id: 'patient-9' }));
    });
    it('is a 404 when the id is neither the doctor\'s request nor the doctor\'s appointment', async () => {
      const { controller, inserted } = build(null);
      await expect(controller.issueMedicalReport(user, 'appt-x', { findings: 'clear' } as any)).rejects.toBeInstanceOf(NotFoundException);
      expect(inserted).toHaveLength(0);
    });
    it('a patient id that is not the appointment\'s patient is refused', async () => {
      const { controller } = build({ id: 'appt-1', patient_id: 'patient-9' });
      await expect(controller.issueMedicalReport(user, 'appt-1', { findings: 'clear', patient_id: 'someone-else' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
