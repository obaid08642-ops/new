import { BadRequestException } from '@nestjs/common';
import { MentalHealthService } from './mental-health.service';

const query = (value: any) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

describe('MentalHealthService patient-owned safe wellbeing contract', () => {
  const makeService = (overrides: Record<string, any> = {}) => {
    const moodModel = {
      create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })),
      find: jest.fn(() => query([])),
      ...overrides.moodModel,
    };
    const meditationModel = {
      create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })),
      find: jest.fn(() => query([])),
      ...overrides.meditationModel,
    };
    const breathingModel = {
      create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })),
      find: jest.fn(() => query([])),
      ...overrides.breathingModel,
    };
    const crisisModel = {
      create: jest.fn(async (payload) => ({ ...payload, toObject: () => payload })),
      find: jest.fn(() => query([])),
      findOneAndDelete: jest.fn(),
      ...overrides.crisisModel,
    };
    return {
      service: new MentalHealthService(moodModel as any, meditationModel as any, breathingModel as any, crisisModel as any),
      moodModel,
      crisisModel,
    };
  };

  it('stores only an explicit patient-owned mood record without inventing energy, stress, sleep, or a clinical interpretation', async () => {
    const { service, moodModel } = makeService();
    const result = await service.logMood('patient-1', { mood: 'okay', notes: 'احتجت إلى استراحة قصيرة' } as any);

    expect(moodModel.create).toHaveBeenCalledWith(expect.objectContaining({
      patient_id: 'patient-1', mood: 'okay', notes: 'احتجت إلى استراحة قصيرة',
    }));
    expect(moodModel.create.mock.calls[0][0]).not.toHaveProperty('energy_level');
    expect(moodModel.create.mock.calls[0][0]).not.toHaveProperty('stress_level');
    expect(result).not.toHaveProperty('severity');
  });

  it('rejects an invalid mood, non-finite scales, excessive notes, invalid tags, and an invalid event time', async () => {
    const { service } = makeService();
    await expect(service.logMood('patient-1', { mood: 'elated' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logMood('patient-1', { mood: 'good', energy_level: 6 } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logMood('patient-1', { mood: 'good', notes: 'x'.repeat(501) } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logMood('patient-1', { mood: 'good', tags: Array(9).fill('tag') } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logMood('patient-1', { mood: 'good', logged_at: 'not-a-date' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('queries mood history only for the authenticated patient and rejects an unsafe history window', async () => {
    const moodModel = { find: jest.fn(() => query([])) };
    const { service } = makeService({ moodModel });
    await service.getMoodHistory('patient-1', 7);
    expect(moodModel.find).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 'patient-1' }));
    await expect(service.getMoodHistory('patient-1', 0)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getMoodHistory('patient-1', 366)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns truthful empty mood statistics without a reassuring or diagnostic interpretation', async () => {
    const { service } = makeService();
    await expect(service.getMoodStats('patient-1')).resolves.toEqual({
      total_entries: 0,
      avg_mood: null,
      avg_energy: null,
      avg_stress: null,
      avg_sleep: null,
    });
  });

  it('rejects malformed personal crisis contact input without a persistence attempt', async () => {
    const { service, crisisModel } = makeService();
    await expect(service.addCrisisContact('patient-1', { contact_name: 'صديق', phone: 12345 as any } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(crisisModel.create).not.toHaveBeenCalled();
  });

  it('returns only patient-owned crisis contacts and never appends hard-coded regional hotline data', async () => {
    const { service, crisisModel } = makeService({
      crisisModel: { find: jest.fn(() => query([{ patient_id: 'patient-1', phone: '0500000000' }])) },
    });
    await expect(service.getCrisisContacts('patient-1')).resolves.toEqual({
      user_contacts: [{ patient_id: 'patient-1', phone: '0500000000' }],
    });
    expect(crisisModel.find).toHaveBeenCalledWith({ patient_id: 'patient-1' });
  });
});
