import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { APPT_STATES } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { UserRole } from '../../common/enums';

// Two days ahead on a half hour, so the slot is always in the future.
const FUTURE = new Date(Math.ceil((Date.now() + 2 * 86_400_000) / 1_800_000) * 1_800_000).toISOString();

describe('AppointmentsService follow_up_of validation', () => {
  const apptModel: any = { 
    findOne: jest.fn(), 
    create: jest.fn(),
    find: jest.fn(),
  };
  const providerModel: any = { findOne: jest.fn() };
  const connection: any = { 
    collection: jest.fn(() => ({ 
      findOne: jest.fn(),
      updateOne: jest.fn(),
    })) 
  };
  const events: any = { emit: jest.fn() };
  const engine: any = { 
    apply: jest.fn(async (opts: any) => opts.mutate()),
    announceCreated: jest.fn(),
  };
  const insurance: any = { createRequest: jest.fn() };
  const service = new AppointmentsService(apptModel, providerModel, connection, events, engine, insurance);

  beforeEach(() => jest.clearAllMocks());

  const mockDoctor = {
    id: 'doc-1',
    user_id: 'user-doc-1',
    price_clinic: 200,
    price_online: 150,
    price_home: 300,
    consultation_modes: ['clinic'],
  };

  const mockOriginalAppt = {
    id: 'appt-original',
    patient_id: 'pat-1',
    doctor_id: 'doc-1',
    status: APPT_STATES.COMPLETED,
  };

  it('rejects follow_up_of when original appointment not found', async () => {
    providerModel.findOne.mockResolvedValue(mockDoctor);
    apptModel.findOne.mockResolvedValue(null); // original not found
    apptModel.findOne.mockImplementation((query: any) => {
      if (query.id === 'appt-original') return Promise.resolve(null);
      if (query.id === 'doc-1') return Promise.resolve(mockDoctor);
      return Promise.resolve(null);
    });

    await expect(service.create(
      { id: 'pat-1', role: UserRole.PATIENT, full_name: 'Patient' },
      { doctor_id: 'doc-1', service_type: 'clinic', slot_start: FUTURE, follow_up_of: 'appt-original' }
    )).rejects.toThrow(NotFoundException);
  });

  it('rejects follow_up_of when patient mismatch', async () => {
    providerModel.findOne.mockResolvedValue(mockDoctor);
    apptModel.findOne.mockImplementation((query: any) => {
      if (query.id === 'appt-original') return Promise.resolve({ ...mockOriginalAppt, patient_id: 'pat-2' });
      if (query.id === 'doc-1') return Promise.resolve(mockDoctor);
      return Promise.resolve(null);
    });

    await expect(service.create(
      { id: 'pat-1', role: UserRole.PATIENT, full_name: 'Patient' },
      { doctor_id: 'doc-1', service_type: 'clinic', slot_start: FUTURE, follow_up_of: 'appt-original' }
    )).rejects.toThrow(ForbiddenException);
  });

  it('rejects follow_up_of when doctor mismatch', async () => {
    providerModel.findOne.mockResolvedValue(mockDoctor);
    apptModel.findOne.mockImplementation((query: any) => {
      if (query.id === 'appt-original') return Promise.resolve({ ...mockOriginalAppt, doctor_id: 'doc-2' });
      if (query.id === 'doc-1') return Promise.resolve(mockDoctor);
      return Promise.resolve(null);
    });

    await expect(service.create(
      { id: 'pat-1', role: UserRole.PATIENT, full_name: 'Patient' },
      { doctor_id: 'doc-1', service_type: 'clinic', slot_start: FUTURE, follow_up_of: 'appt-original' }
    )).rejects.toThrow(ForbiddenException);
  });

  it('rejects follow_up_of when original appointment not completed', async () => {
    providerModel.findOne.mockResolvedValue(mockDoctor);
    apptModel.findOne.mockImplementation((query: any) => {
      if (query.id === 'appt-original') return Promise.resolve({ ...mockOriginalAppt, status: APPT_STATES.CONFIRMED });
      if (query.id === 'doc-1') return Promise.resolve(mockDoctor);
      return Promise.resolve(null);
    });

    await expect(service.create(
      { id: 'pat-1', role: UserRole.PATIENT, full_name: 'Patient' },
      { doctor_id: 'doc-1', service_type: 'clinic', slot_start: FUTURE, follow_up_of: 'appt-original' }
    )).rejects.toThrow(BadRequestException);
  });

  it('accepts valid follow_up_of', async () => {
    const createdAppt = { id: 'appt-new', follow_up_of: 'appt-original' };
    providerModel.findOne.mockResolvedValue(mockDoctor);
    apptModel.findOne.mockImplementation((query: any) => {
      if (query.id === 'appt-original') return Promise.resolve(mockOriginalAppt);
      if (query.id === 'doc-1') return Promise.resolve(mockDoctor);
      return Promise.resolve(null);
    });
    apptModel.create.mockResolvedValue(createdAppt);
    engine.announceCreated.mockResolvedValue(undefined);
    // The state step after create is covered elsewhere; here only the stored link matters.
    jest.spyOn(service as any, 'transition').mockResolvedValue(createdAppt);

    await service.create(
      { id: 'pat-1', role: UserRole.PATIENT, full_name: 'Patient' },
      { doctor_id: 'doc-1', service_type: 'clinic', slot_start: FUTURE, follow_up_of: 'appt-original' }
    );

    expect(apptModel.create).toHaveBeenCalledWith(expect.objectContaining({ follow_up_of: 'appt-original' }));
  });
});
