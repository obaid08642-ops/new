// R11 §5 lead 13: paid AI routes were open to guests, had only per-IP limits,
// and copilot/suggest (a free LLM proxy) had no doctor role.
import { HttpException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AiController } from './ai.controller';
import { AiUserQuotaGuard } from './ai-user-quota.guard';
import { NoGuestsGuard } from '../../common/auth.guard';
import { InsuranceController } from '../insurance/insurance.module';

const PAID = ['voice', 'ocr', 'copilotSuggest', 'ocrTranslate', 'medicineImageSearch', 'barcodeLookup', 'analyzeMeal', 'generateExercisePlan', 'generateDietPlan'];

describe('AI routes: members only, per-user quota, copilot for doctors (R11 §5)', () => {
  it.each(PAID)('%s carries NoGuestsGuard and AiUserQuotaGuard', (method) => {
    const handler = (AiController.prototype as unknown as Record<string, unknown>)[method];
    expect(handler).toBeDefined();
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler as object) as unknown[];
    expect(guards).toEqual(expect.arrayContaining([NoGuestsGuard, AiUserQuotaGuard]));
  });

  it('copilot/suggest is limited to doctors (and admins)', () => {
    const roles = Reflect.getMetadata('roles', AiController.prototype.copilotSuggest) as string[];
    expect(roles).toEqual(expect.arrayContaining(['doctor']));
    expect(roles).not.toContain('patient');
  });

  it('the quota guard refuses the call after the daily limit', async () => {
    const store = new Map<string, number>();
    const redis = { incr: jest.fn(async (k: string) => { store.set(k, (store.get(k) || 0) + 1); return store.get(k)!; }), expire: jest.fn() };
    const guard = new AiUserQuotaGuard(redis as never);
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ user: { id: 'pat-1', role: 'patient' } }) }) } as never;
    process.env.AI_USER_DAILY_LIMIT = '3';
    for (let i = 0; i < 3; i += 1) await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
    delete process.env.AI_USER_DAILY_LIMIT;
  });

  it('insurance OCR (an LLM call) is members-only with the same quota (independent check)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, InsuranceController.prototype.ocrExtract) as unknown[];
    expect(guards).toEqual(expect.arrayContaining([NoGuestsGuard, AiUserQuotaGuard]));
  });
});
