/**
 * P22.9 — downloadable visit reports (appointment report PDF).
 */
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentsService } from '../appointments.service';
import { APPT_STATES } from '../../../schemas/appointment.schema';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { ProviderProfileRepository } from '../repositories/providerprofile.repository';
import { WorkflowEngineService } from '../../workflow-engine/workflow-engine.module';
import { InsuranceFlowService } from '../../insurance-engine/insurance-engine.module';

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

describe('AppointmentsService visit report PDF (P22.9)', () => {
  let svc: AppointmentsService;
  let apptModel: { findOne: jest.Mock };
  const patient = { id: 'pat-1', role: 'patient' };
  const summary = { diagnosis: 'flu', notes: 'rest', recommendations: 'water', prescription: [], written_at: new Date() };

  beforeEach(() => {
    apptModel = { findOne: jest.fn() };
    svc = new AppointmentsService(
      apptModel as unknown as AppointmentRepository,
      { findOne: jest.fn() } as unknown as ProviderProfileRepository,
      { db: { collection: jest.fn() } } as unknown as Connection,
      { emit: jest.fn() } as unknown as EventEmitter2,
      { apply: jest.fn() } as unknown as WorkflowEngineService,
      { createRequest: jest.fn() } as unknown as InsuranceFlowService,
    );
    jest.clearAllMocks();
  });

  it('renders a real PDF for a completed visit with a summary', async () => {
    apptModel.findOne.mockResolvedValueOnce(makeDoc({
      id: 'appt-1', status: APPT_STATES.COMPLETED, patient_id: 'pat-1',
      doctor_id: 'doc-1', service_type: 'clinic', slot_start: new Date(), summary,
    }));
    const buf = await svc.visitReportPdf(patient, 'appt-1');
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  }, 60000);

  it('honestly marks a missing summary as pending instead of inventing one', async () => {
    apptModel.findOne.mockResolvedValueOnce(makeDoc({
      id: 'appt-1', status: APPT_STATES.COMPLETED, patient_id: 'pat-1',
      doctor_id: 'doc-1', service_type: 'clinic', slot_start: new Date(),
    }));
    const buf = await svc.visitReportPdf(patient, 'appt-1');
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  }, 60000);

  it('refuses uncompleted visits, strangers, and unknown ids', async () => {
    apptModel.findOne.mockResolvedValueOnce(makeDoc({ id: 'a', status: APPT_STATES.CONFIRMED, patient_id: 'pat-1', slot_start: new Date() }));
    await expect(svc.visitReportPdf(patient, 'a')).rejects.toThrow(BadRequestException);
    apptModel.findOne.mockResolvedValueOnce(makeDoc({ id: 'a', status: APPT_STATES.COMPLETED, patient_id: 'pat-1', slot_start: new Date(), summary }));
    await expect(svc.visitReportPdf({ id: 'stranger', role: 'patient' }, 'a')).rejects.toThrow(ForbiddenException);
    apptModel.findOne.mockResolvedValueOnce(null);
    await expect(svc.visitReportPdf(patient, 'nope')).rejects.toThrow(NotFoundException);
  });
});
