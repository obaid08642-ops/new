import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';

describe('PrescriptionsService authorization and verified creation', () => {
  const prescription = {
    id: 'rx-sandbox-1',
    patient_id: 'patient-owner',
    doctor_id: 'doctor-owner',
    pharmacy_id: 'pharmacy-owner',
    state: 'CREATED_BY_DOCTOR',
    diagnosis: 'must not be returned',
    notes: 'must not be returned',
    createdAt: new Date('2030-01-01T00:00:00.000Z'),
    items: [{ medicine_name_ar: 'دواء', dose: 'قرص', frequency_hours: 8, duration_days: 5 }],
  };

  const createService = (overrides: {
    appointment?: any;
    medicine?: any;
    created?: any;
    prescription?: any;
  } = {}) => {
    const repository = {
      findOne: jest.fn().mockResolvedValue(overrides.prescription || prescription),
      create: jest.fn().mockResolvedValue(overrides.created || {
        id: 'rx-created',
        toObject: () => ({ id: 'rx-created', patient_id: 'patient-owner' }),
      }),
    };
    const medicines = {
      getById: jest.fn().mockResolvedValue(overrides.medicine || {
        id: 'medicine-approved',
        name_ar: 'دواء معتمد',
        name_en: 'Approved medicine',
        active_ingredient: 'ingredient',
        verified: true,
      }),
    };
    const events = { emit: jest.fn() };
    const appointments = {
      findOne: jest.fn().mockResolvedValue(overrides.appointment === undefined ? {
        id: 'appointment-owner',
        patient_id: 'patient-owner',
        doctor_user_id: 'doctor-owner',
        doctor_id: 'doctor-profile-owner',
        status: 'IN_PROGRESS',
      } : overrides.appointment),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };
    const providers = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ display_name_ar: 'د. طبيب', specialty: 'باطنة' }) }) };
    const service = new PrescriptionsService(repository as any, medicines as any, events as any, appointments as any, providers as any);
    return { service, repository, medicines, events, appointments, providers };
  };

  it.each([
    [{ id: 'patient-owner', role: 'patient' }],
    [{ id: 'doctor-owner', role: 'provider', provider_type: 'doctor' }],
    [{ id: 'pharmacy-owner', role: 'provider', provider_type: 'pharmacy' }],
    [{ id: 'admin-owner', role: 'admin' }],
  ])('returns the prescription to an authorized participant or administrator', async (actor) => {
    const { service, repository } = createService();

    await expect(service.getByIdForUser('rx-sandbox-1', actor)).resolves.toEqual({
      id: 'rx-sandbox-1',
      status: 'CREATED_BY_DOCTOR',
      items: [{ name: 'دواء', dose: 'قرص', frequency: { every_hours: 8 }, duration: 5 }],
      issued_at: '2030-01-01T00:00:00.000Z',
      doctor: { display_name: 'د. طبيب', specialty: 'باطنة' },
    });
    expect(repository.findOne).toHaveBeenCalledWith({ id: 'rx-sandbox-1' }, { _id: 0, __v: 0 });
  });

  it('hides a prescription from a foreign patient', async () => {
    const { service } = createService();

    await expect(service.getByIdForUser('rx-sandbox-1', { id: 'patient-foreign', role: 'patient' }))
      .rejects.toThrow(NotFoundException);
  });

  it('hides a prescription from an unrelated provider', async () => {
    const { service } = createService();

    await expect(service.getByIdForUser('rx-sandbox-1', { id: 'lab-foreign', role: 'provider', provider_type: 'lab' }))
      .rejects.toThrow(NotFoundException);
  });

  it('rejects creation before an appointment and patient are both supplied', async () => {
    const { service, repository, appointments } = createService();

    await expect(service.create(
      { id: 'doctor-owner', role: 'doctor' },
      { patient_id: 'patient-owner', items: [{ medicine_id: 'medicine-approved', dose: '1 tablet', duration_days: 3 }] },
    )).rejects.toThrow(BadRequestException);
    expect(appointments.findOne).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('hides a foreign or stale appointment rather than creating a prescription', async () => {
    const { service, repository, appointments } = createService({ appointment: null });

    await expect(service.create(
      { id: 'doctor-owner', role: 'doctor' },
      { appointment_id: 'appointment-foreign', patient_id: 'patient-owner', items: [{ medicine_id: 'medicine-approved', dose: '1 tablet', duration_days: 3 }] },
    )).rejects.toThrow(NotFoundException);
    expect(appointments.findOne).toHaveBeenCalledWith({
      id: 'appointment-foreign',
      patient_id: 'patient-owner',
      status: 'IN_PROGRESS',
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('accepts an active provider account when it matches the appointment doctor profile identity, while hiding a foreign doctor', async () => {
    const appointment = {
      id: 'appointment-owner',
      patient_id: 'patient-owner',
      doctor_user_id: 'doctor-user-owner',
      doctor_id: 'doctor-profile-owner',
      status: 'IN_PROGRESS',
    };
    const { service, repository, appointments } = createService({ appointment });
    const actor = { id: 'doctor-account-owner', role: 'provider', provider_type: 'doctor', provider_id: 'doctor-profile-owner' };

    await expect(service.create(actor, {
      appointment_id: 'appointment-owner',
      patient_id: 'patient-owner',
      items: [{ manual_name_en: 'Sandbox manual item', dose: '1 unit', duration_days: 1 }],
    })).resolves.toEqual({ id: 'rx-created', patient_id: 'patient-owner' });
    expect(appointments.findOne).toHaveBeenCalledWith({ id: 'appointment-owner', patient_id: 'patient-owner', status: 'IN_PROGRESS' });
    expect(repository.create).toHaveBeenCalled();

    const foreign = createService({ appointment });
    await expect(foreign.service.create(
      { id: 'doctor-account-foreign', role: 'provider', provider_type: 'doctor', provider_id: 'doctor-profile-foreign' },
      { appointment_id: 'appointment-owner', patient_id: 'patient-owner', items: [{ manual_name_en: 'Sandbox manual item', dose: '1 unit', duration_days: 1 }] },
    )).rejects.toThrow(NotFoundException);
    expect(foreign.repository.create).not.toHaveBeenCalled();
  });

  it('rejects custom or unverified medicines before persistence', async () => {
    const { service, repository, medicines } = createService({ medicine: { id: 'medicine-unverified', verified: false } });

    await expect(service.create(
      { id: 'doctor-owner', role: 'doctor' },
      { appointment_id: 'appointment-owner', patient_id: 'patient-owner', items: [{ medicine_id: 'medicine-unverified', dose: '1 tablet', duration_days: 3 }] },
    )).rejects.toThrow(BadRequestException);
    expect(medicines.getById).toHaveBeenCalledWith('medicine-unverified');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a prescription-scoped manual medicine under the verified appointment without catalog lookup', async () => {
    const { service, repository, medicines } = createService();

    await expect(service.create(
      { id: 'doctor-owner', role: 'doctor' },
      {
        appointment_id: 'appointment-owner',
        patient_id: 'patient-owner',
        items: [{ manual_name_ar: 'دواء نادر', manual_name_en: 'Rare medicine', dose: '1 tablet', duration_days: 5, instructions: 'after food' }],
      },
    )).resolves.toEqual({ id: 'rx-created', patient_id: 'patient-owner' });

    expect(medicines.getById).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      has_manual_entries: true,
      items: [expect.objectContaining({
        medicine_id: undefined,
        medicine_name_ar: 'دواء نادر',
        is_manual_entry: true,
        verified: false,
        manual_review_status: 'PENDING_REVIEW',
      })],
    }));
  });

  it('rejects a manual prescription item without an explicit medicine name', async () => {
    const { service, repository } = createService();

    await expect(service.create(
      { id: 'doctor-owner', role: 'doctor' },
      { appointment_id: 'appointment-owner', patient_id: 'patient-owner', items: [{ dose: '1 tablet', duration_days: 5 }] },
    )).rejects.toThrow(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('blocks dispensing while a manual item still requires review or an approved substitute', async () => {
    const manualRx: any = {
      id: 'rx-manual', state: 'APPROVED', items: [{ is_manual_entry: true, manual_review_status: 'PENDING_REVIEW' }],
      save: jest.fn(), toObject: () => ({ id: 'rx-manual' }),
    };
    const { service } = createService({ prescription: manualRx });

    await expect(service.transition('rx-manual', 'DISPENSED' as any, { id: 'admin-owner', role: 'admin' }))
      .rejects.toThrow(BadRequestException);
    expect(manualRx.save).not.toHaveBeenCalled();
  });

  it('accepts only an approved substitute for a manual item and records the review outcome', async () => {
    const manualRx: any = {
      id: 'rx-manual', pharmacy_id: 'pharmacy-owner', state: 'APPROVED', items: [{ is_manual_entry: true, manual_review_status: 'PENDING_REVIEW' }],
      save: jest.fn().mockResolvedValue(undefined), toObject: () => ({ id: 'rx-manual' }),
    };
    const { service, medicines } = createService({ prescription: manualRx });

    await expect(service.substitute('rx-manual', 0, 'medicine-approved', { id: 'pharmacy-owner', role: 'pharmacy' }))
      .resolves.toEqual({ id: 'rx-manual' });
    expect(medicines.getById).toHaveBeenCalledWith('medicine-approved');
    expect(manualRx.items[0]).toEqual(expect.objectContaining({
      substituted: true,
      substituted_to_medicine_id: 'medicine-approved',
      manual_review_status: 'SUBSTITUTED_APPROVED',
      manual_reviewed_by: 'pharmacy-owner',
    }));
  });

  it('rejects prescription creation by a non-doctor even if an appointment identifier is supplied', async () => {
    const { service, repository, appointments } = createService();

    await expect(service.create(
      { id: 'pharmacy-owner', role: 'provider', provider_type: 'pharmacy' },
      { appointment_id: 'appointment-owner', patient_id: 'patient-owner', items: [{ medicine_id: 'medicine-approved', dose: '1 tablet', duration_days: 3 }] },
    )).rejects.toThrow(BadRequestException);
    expect(appointments.findOne).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('hides a prescription mutation from a foreign doctor and pharmacy', async () => {
    const mutableRx: any = {
      ...prescription,
      state: 'CREATED_BY_DOCTOR',
      items: [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({ id: 'rx-sandbox-1' }),
    };
    const { service, medicines } = createService({ prescription: mutableRx });

    await expect(service.sendToPharmacy('rx-sandbox-1', 'pharmacy-owner', { id: 'doctor-foreign', role: 'provider', provider_type: 'doctor' }))
      .rejects.toThrow(NotFoundException);
    await expect(service.transition('rx-sandbox-1', 'SENT_TO_PHARMACY' as any, { id: 'pharmacy-foreign', role: 'provider', provider_type: 'pharmacy' }))
      .rejects.toThrow(NotFoundException);

    mutableRx.state = 'APPROVED';
    mutableRx.items = [{ is_manual_entry: true, manual_review_status: 'PENDING_REVIEW' }];
    await expect(service.substitute('rx-sandbox-1', 0, 'medicine-approved', { id: 'pharmacy-foreign', role: 'provider', provider_type: 'pharmacy' }))
      .rejects.toThrow(NotFoundException);
    expect(medicines.getById).not.toHaveBeenCalled();
    expect(mutableRx.save).not.toHaveBeenCalled();
  });

  it('permits only the owning doctor to send a newly created prescription to a pharmacy', async () => {
    const mutableRx: any = {
      ...prescription,
      state: 'CREATED_BY_DOCTOR',
      items: [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject() { return { id: 'rx-sandbox-1', pharmacy_id: this.pharmacy_id }; },
    };
    const { service, events } = createService({ prescription: mutableRx });

    await expect(service.sendToPharmacy('rx-sandbox-1', 'pharmacy-owner', { id: 'doctor-owner', role: 'provider', provider_type: 'doctor' }))
      .resolves.toEqual(expect.objectContaining({ id: 'rx-sandbox-1' }));
    expect(mutableRx.state).toBe('SENT_TO_PHARMACY');
    expect(mutableRx.pharmacy_id).toBe('pharmacy-owner');
    expect(events.emit).toHaveBeenCalledWith('prescription.sent_to_pharmacy', expect.objectContaining({ prescription_id: 'rx-sandbox-1', pharmacy_id: 'pharmacy-owner' }));
  });

  it('persists only approved catalogue medicines against the verified owned appointment', async () => {
    const { service, repository, appointments, events } = createService();

    await expect(service.create(
      { id: 'doctor-owner', role: 'doctor' },
      {
        appointment_id: 'appointment-owner',
        patient_id: 'patient-owner',
        diagnosis: 'verified diagnosis',
        items: [{ medicine_id: 'medicine-approved', dose: '1 tablet', duration_days: 3, instructions: 'after food' }],
      },
    )).resolves.toEqual({ id: 'rx-created', patient_id: 'patient-owner' });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      doctor_id: 'doctor-owner',
      patient_id: 'patient-owner',
      appointment_id: 'appointment-owner',
      has_manual_entries: false,
      items: [expect.objectContaining({
        medicine_id: 'medicine-approved',
        medicine_name_ar: 'دواء معتمد',
        is_manual_entry: false,
      })],
    }));
    expect(appointments.updateOne).toHaveBeenCalledWith(
      { id: 'appointment-owner', patient_id: 'patient-owner', doctor_id: 'doctor-profile-owner' },
      { $addToSet: { prescriptions: 'rx-created' } },
    );
    expect(events.emit).toHaveBeenCalledWith('prescription.created', expect.objectContaining({
      prescription_id: 'rx-created',
      appointment_id: 'appointment-owner',
    }));
  });
});
