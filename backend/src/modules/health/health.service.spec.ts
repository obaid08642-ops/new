import { BadRequestException, ConflictException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService medication reminder contract', () => {
  const user = { id: 'patient-1' };
  const makeService = (reminderOverrides: Record<string, any> = {}) => {
    const reminders: any = {
      create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })),
      findOne: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      ...reminderOverrides,
    };
    const service = new HealthService(
      { create: jest.fn(), find: jest.fn() } as any,
      reminders,
      { create: jest.fn(), find: jest.fn() } as any,
      {} as any,
      {} as any,
      undefined,
    );
    return { service, reminders };
  };

  it('creates a patient-owned reminder only with a valid IANA timezone and HH:mm schedule', async () => {
    const { service, reminders } = makeService();
    await service.createReminder(user, {
      medicine_name_ar: 'باراسيتامول',
      dose: 'قرص واحد',
      dosage_count: 1,
      times: ['20:00', '08:00', '08:00'],
      time_zone: 'Asia/Riyadh',
      frequency: 'daily',
      duration_days: 7,
    });

    expect(reminders.create).toHaveBeenCalledWith(expect.objectContaining({
      patient_id: 'patient-1',
      medicine_name_ar: 'باراسيتامول',
      times: ['08:00', '20:00'],
      time_zone: 'Asia/Riyadh',
      frequency: 'daily',
    }));
  });

  it('rejects an invalid timezone or a non-24-hour reminder time', async () => {
    const { service } = makeService();
    await expect(service.createReminder(user, {
      medicine_name_ar: 'دواء', dose: 'قرص', times: ['8 مساءً'], time_zone: 'Asia/Riyadh',
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createReminder(user, {
      medicine_name_ar: 'دواء', dose: 'قرص', times: ['08:00'], time_zone: 'invalid/timezone',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records one outcome per configured dose time and patient-local day', async () => {
    const reminder: any = {
      id: 'reminder-1', patient_id: 'patient-1', time_zone: 'Asia/Riyadh', times: ['08:00'], log: [],
      save: jest.fn(async () => undefined),
      toObject: () => ({ id: 'reminder-1', log: reminder.log }),
    };
    const { service } = makeService({ findOne: jest.fn(async () => reminder) });

    await service.logReminder(user, 'reminder-1', 'taken', '08:00');
    await expect(service.logReminder(user, 'reminder-1', 'skipped', '08:00')).rejects.toBeInstanceOf(ConflictException);
    expect(reminder.log).toHaveLength(1);
    expect(reminder.log[0]).toEqual(expect.objectContaining({ status: 'taken', time_key: '08:00' }));
  });

  it('preserves a valid local notification event time and identifies its source', async () => {
    const reminder: any = {
      id: 'reminder-1', patient_id: 'patient-1', time_zone: 'Asia/Riyadh', times: ['08:00'], log: [],
      start_date: new Date(Date.now() - 24 * 60 * 60 * 1000), save: jest.fn(async () => undefined), toObject: () => ({ log: reminder.log }),
    };
    const { service } = makeService({ findOne: jest.fn(async () => reminder) });
    const occurredAt = new Date(Date.now() - 60 * 1000).toISOString();

    await service.logReminder(user, 'reminder-1', 'taken', '08:00', occurredAt);

    expect(reminder.log[0]).toEqual(expect.objectContaining({ at: new Date(occurredAt), source: 'local_notification', status: 'taken' }));
    await expect(service.logReminder(user, 'reminder-1', 'taken', '08:00', new Date(Date.now() + 10 * 60 * 1000).toISOString())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not log a dose time that is not configured on the patient reminder', async () => {
    const reminder: any = { id: 'reminder-1', patient_id: 'patient-1', time_zone: 'Asia/Riyadh', times: ['08:00'], log: [] };
    const { service } = makeService({ findOne: jest.fn(async () => reminder) });
    await expect(service.logReminder(user, 'reminder-1', 'taken', '22:00')).rejects.toBeInstanceOf(BadRequestException);
  });
});
