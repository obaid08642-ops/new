import { BadRequestException, ConflictException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService medication reminder contract', () => {
  const user = { id: 'patient-1' };
  const makeService = (reminderOverrides: Record<string, any> = {}, orderOverrides: Record<string, any> = {}) => {
    const userFindOne = jest.fn(() => ({ lean: jest.fn().mockResolvedValue({ addresses: [{ is_default: true, lat: 24.7, lng: 46.7, label: 'Home' }] }) }));
    const reminders: any = {
      create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })),
      findOne: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      db: { model: jest.fn(() => ({ findOne: userFindOne })), collection: jest.fn(() => ({ updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }) })) },
      ...reminderOverrides,
    };
    const orders = { create: jest.fn().mockResolvedValue({ id: 'refill-order-1', state: 'CREATED' }), ...orderOverrides };
    const service = new HealthService(
      { create: jest.fn(), find: jest.fn() } as any,
      reminders,
      { create: jest.fn(), find: jest.fn() } as any,
      orders as any,
      {} as any,
      undefined,
    );
    return { service, reminders, orders };
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

  it('rejects unsupported monthly recurrence and preserves a precise configured dose quantity', async () => {
    const { service, reminders } = makeService();
    await expect(service.createReminder(user, {
      medicine_name_ar: 'دواء', dose: '0.5 مل', dosage_count: 0.5, times: ['08:00'], time_zone: 'Asia/Riyadh', frequency: 'monthly',
    })).rejects.toBeInstanceOf(BadRequestException);

    await service.createReminder(user, {
      medicine_name_ar: 'دواء', dose: '0.5 مل', dosage_count: 0.5, times: ['08:00'], time_zone: 'Asia/Riyadh', frequency: 'weekly',
    });
    expect(reminders.create).toHaveBeenCalledWith(expect.objectContaining({ dose: '0.5 مل', dosage_count: 0.5, frequency: 'weekly' }));
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

  it('creates one server order identity without claiming a fixed refill stock or date', async () => {
    const reminder = { id: 'reminder-1', patient_id: 'patient-1', chronic: true, medicine_id: 'medicine-1', medicine_name_ar: 'دواء', toObject: () => reminder };
    const reservationUpdate = jest.fn().mockResolvedValue(reminder);
    const { service, reminders, orders } = makeService({ findOne: jest.fn().mockResolvedValue(reminder), findOneAndUpdate: reservationUpdate });

    await expect(service.refillNow(user, 'reminder-1')).resolves.toEqual(expect.objectContaining({
      ok: true, order_id: 'refill-order-1', fulfillment_pending: true,
    }));
    expect(orders.create).toHaveBeenCalledWith(user, expect.objectContaining({ items: [expect.objectContaining({ medicine_id: 'medicine-1' })] }));
    expect(reservationUpdate).toHaveBeenNthCalledWith(1,
      expect.objectContaining({ id: 'reminder-1', patient_id: 'patient-1', refill_pending_order_id: { $exists: false } }),
      expect.objectContaining({ $set: expect.objectContaining({ refill_creation_lock: expect.any(String) }) }),
      { new: true },
    );
    expect(reservationUpdate).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ id: 'reminder-1', patient_id: 'patient-1', refill_creation_lock: expect.any(String) }),
      { $set: { refill_pending_order_id: 'refill-order-1' }, $unset: { refill_creation_lock: 1 } },
    );
    expect(JSON.stringify(reminders.findOneAndUpdate.mock.calls)).not.toContain('pills_remaining');
    expect(JSON.stringify(reminders.findOneAndUpdate.mock.calls)).not.toContain('refill_date');
  });

  it('reuses an existing pending refill order instead of creating a duplicate', async () => {
    const reminder = { id: 'reminder-1', patient_id: 'patient-1', chronic: true, medicine_id: 'medicine-1', refill_pending_order_id: 'existing-order', toObject: () => reminder };
    const { service, orders } = makeService({ findOne: jest.fn().mockResolvedValue(reminder) });

    await expect(service.refillNow(user, 'reminder-1')).resolves.toEqual({ ok: true, existing: true, order_id: 'existing-order', state: 'REFILL_PENDING_FULFILLMENT' });
    expect(orders.create).not.toHaveBeenCalled();
  });
});

describe('HealthService vital contract', () => {
  const makeVitalService = (vitalOverrides: Record<string, any> = {}) => {
    const vitals: any = {
      create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })),
      find: jest.fn(() => ({ sort: jest.fn(() => ({ limit: jest.fn().mockResolvedValue([]) })) })),
      ...vitalOverrides,
    };
    const service = new HealthService(
      vitals,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
    );
    return { service, vitals };
  };

  it('normalizes legacy sugar and heart input to canonical glucose and heart_rate records', async () => {
    const { service, vitals } = makeVitalService();
    await service.addVital({ id: 'patient-1' }, { type: 'sugar', value: 102, source: 'manual' });
    await service.addVital({ id: 'patient-1' }, { type: 'heart', value: 72, source: 'manual' });

    expect(vitals.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ patient_id: 'patient-1', type: 'glucose', value: '102', unit: 'mg/dL' }));
    expect(vitals.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ patient_id: 'patient-1', type: 'heart_rate', value: '72', unit: 'bpm' }));
  });

  it('uses canonical vital type for a legacy list query and rejects an unknown type', async () => {
    const { service, vitals } = makeVitalService();
    await service.listVitals({ id: 'patient-1' }, 'sugar', 30);
    expect(vitals.find).toHaveBeenCalledWith({ patient_id: 'patient-1', type: 'glucose' }, { _id: 0, __v: 0 });
    await expect(service.listVitals({ id: 'patient-1' }, 'made-up-vital', 30)).rejects.toBeInstanceOf(BadRequestException);
  });
});
