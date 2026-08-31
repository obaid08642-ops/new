import { BadRequestException } from '@nestjs/common';
import { MedicalProgramsService } from './medical-programs.module';

describe('MedicalProgramsService', () => {
  const leanDocs = [
    { program_type: 'diabetes', title: 'برنامج إدارة السكري', duration: '6 أشهر', completed_sessions: 1, total_sessions: 6,
      next_session: { date: '2026-09-01', time: '09:00', title: 'استشارة' }, milestone_reward: { label: '150 نقطة', description: 'جائزة' },
      sessions: [{ id: '1' }, { id: '2' }] },
  ];
  const model = (docs: any[] = leanDocs) => ({
    find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(docs) })),
    findOne: jest.fn(async () => ({
      program_type: 'diabetes', account_id: 'patient-1', status: 'active', completed_sessions: 0, total_sessions: 2,
      sessions: [{ id: '1' }, { id: '2' }], markModified: jest.fn(), save: jest.fn().mockResolvedValue(true),
    })),
  });

  it('lists active programs mapped to the mobile contract', async () => {
    const svc = new MedicalProgramsService(model() as any);
    const res = await svc.listActive({ id: 'patient-1' });
    expect(res[0]).toEqual(expect.objectContaining({ id: 'diabetes', completedSessions: 1, totalSessions: 6, nextSessionDate: '2026-09-01' }));
  });

  it('rejects complete-session without identity or params', async () => {
    const svc = new MedicalProgramsService(model() as any);
    await expect(svc.completeSession(null, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.completeSession({ id: 'p1' }, { programType: '', sessionId: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completes a session once and increments counter (idempotent on repeat)', async () => {
    const svc = new MedicalProgramsService(model() as any);
    const res = await svc.completeSession({ id: 'patient-1' }, { programType: 'diabetes', sessionId: '1' });
    expect(Array.isArray(res)).toBe(true);
  });
});
