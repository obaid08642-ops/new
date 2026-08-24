import { BadRequestException } from '@nestjs/common';
import { MaternityService } from './maternity.service';

describe('MaternityService truthful reproductive tracking contract', () => {
  const document = (payload: any) => ({ ...payload, kicks_log: payload.kicks_log || [], contractions_log: payload.contractions_log || [], infant_growth: payload.infant_growth || [], checkups: payload.checkups || [], save: jest.fn(), toObject() { const { save, toObject, ...data } = this; return data; } });
  const makeService = () => {
    let stored: any = null;
    const model = {
      findOne: jest.fn(async () => stored),
      create: jest.fn(async (payload) => { stored = document(payload); return stored; }),
    };
    return { service: new MaternityService(model as any), model, getStored: () => stored };
  };

  it('does not invent pregnancy, due date, cycle length, or checkups before setup', async () => {
    const { service, model } = makeService();
    await expect(service.getProfile('patient-1')).resolves.toEqual({ patient_id: 'patient-1', profile_ready: false, tracking_mode: null });
    expect(model.create).not.toHaveBeenCalled();
  });

  it('requires a user-entered date for pregnancy tracking and computes only an estimate', async () => {
    const { service, model } = makeService();
    await expect(service.updateProfile('patient-1', { is_pregnant: true })).rejects.toBeInstanceOf(BadRequestException);
    const lmp = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();
    const profile = await service.updateProfile('patient-1', { is_pregnant: true, lmp_date: lmp });
    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 'patient-1', is_pregnant: true }));
    expect(profile).toEqual(expect.objectContaining({ profile_ready: true, tracking_mode: 'pregnancy' }));
    expect(profile.current_week).toBeGreaterThanOrEqual(1);
  });

  it('requires last period and explicit cycle length before enabling cycle tracking', async () => {
    const { service } = makeService();
    await expect(service.updateProfile('patient-1', { is_pregnant: false, cycle_length: 28 })).rejects.toBeInstanceOf(BadRequestException);
    const profile = await service.updateProfile('patient-1', { is_pregnant: false, last_period_date: '2026-08-01', cycle_length: 30, is_regular: true });
    expect(profile).toEqual(expect.objectContaining({ profile_ready: true, tracking_mode: 'cycle', cycle_length: 30 }));
  });

  it('rejects pregnancy-only logs for cycle tracking and impossible kick values', async () => {
    const { service } = makeService();
    await service.updateProfile('patient-1', { is_pregnant: false, last_period_date: '2026-08-01', cycle_length: 30 });
    await expect(service.logKick('patient-1', 5, 600)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logContraction('patient-1', 5, 60)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists both required contraction interval and duration for pregnancy tracking', async () => {
    const { service, getStored } = makeService();
    const lmp = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString();
    await service.updateProfile('patient-1', { is_pregnant: true, lmp_date: lmp });

    const profile = await service.logContraction('patient-1', 240, 55);

    expect(getStored().contractions_log).toEqual(expect.arrayContaining([
      expect.objectContaining({ interval_seconds: 240, duration_seconds: 55 }),
    ]));
    expect(profile.contractions_log).toEqual(expect.arrayContaining([
      expect.objectContaining({ interval_seconds: 240, duration_seconds: 55 }),
    ]));
  });
});
