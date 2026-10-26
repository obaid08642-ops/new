/**
 * QA P1 (jobs-inbox): a hospital signed in through the provider app could not post a job. The provider token carries role 'provider' and the
 * facility type in `provider_type`; the `@Roles` guard reads both, but the inline check read only `role`, so it answered 403 "Only healthcare
 * facilities…". Both now use the same effective roles.
 */
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { RecruitmentController, JOB_POSTER_ROLES } from './recruitment.module';
import { ROLES_KEY, getEffectiveRoles, roleSatisfies } from '../../common/auth.guard';

const svc = { createJob: jest.fn(async (id: string) => ({ id: 'j1', facility_id: id })) };
const controller = new RecruitmentController(svc as never);
const dto = { title: 't' } as never;

describe('createJob: who may post', () => {
  beforeEach(() => svc.createJob.mockClear());

  it.each([
    ['a hospital through the provider app', { id: 'u1', role: 'provider', provider_type: 'hospital' }],
    ['a clinic through the provider app', { id: 'u1', role: 'provider', provider_type: 'clinic' }],
    ['a pharmacy through the provider app', { id: 'u1', role: 'provider', provider_type: 'pharmacy' }],
    ['a laboratory', { id: 'u1', role: 'provider', provider_type: 'laboratory' }],
    ['a hospital with the plain role', { id: 'u1', role: 'hospital' }],
    ['a hospital admin', { id: 'u1', role: 'hospital_admin' }],
    ['a doctor', { id: 'u1', role: 'doctor' }],
    ['an admin', { id: 'u1', role: 'admin' }],
  ])('%s can post', (_label, user) => {
    expect(() => controller.createJob(user, dto)).not.toThrow();
    expect(svc.createJob).toHaveBeenCalledWith('u1', dto);
  });

  it.each([
    ['a patient', { id: 'u2', role: 'patient' }],
    ['a guest', { id: 'u2', role: 'guest' }],
    ['a delivery rider', { id: 'u2', role: 'provider', provider_type: 'delivery' }],
    ['an individual nurse', { id: 'u2', role: 'nurse' }],
    ['no role at all', { id: 'u2' }],
  ])('%s is refused (403)', (_label, user) => {
    expect(() => controller.createJob(user, dto)).toThrow(ForbiddenException);
    expect(svc.createJob).not.toHaveBeenCalled();
  });
});

describe('the @Roles guard and the inline check agree', () => {
  it('create, update and application-status routes carry the same poster roles', () => {
    for (const handler of ['createJob', 'updateJob', 'updateApplicationStatus'] as const) {
      expect(Reflect.getMetadata(ROLES_KEY, RecruitmentController.prototype[handler])).toEqual(JOB_POSTER_ROLES);
    }
  });
  it('a provider token with provider_type hospital satisfies the guard', () => {
    const effective = getEffectiveRoles({ role: 'provider', provider_type: 'hospital' });
    expect(JOB_POSTER_ROLES.some((r) => roleSatisfies(String(r), effective))).toBe(true);
    expect(JOB_POSTER_ROLES.some((r) => roleSatisfies(String(r), getEffectiveRoles({ role: 'patient' })))).toBe(false);
  });
});
