import 'reflect-metadata';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { StepUpController } from './step-up.controller';
import { PUBLIC_KEY, ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

describe('POST auth/step-up/options', () => {
  const stepUp: any = { startAssertion: jest.fn().mockResolvedValue({ challenge: 'c' }) };
  const ctrl = new StepUpController({} as any, stepUp);
  beforeEach(() => stepUp.startAssertion.mockClear());

  it('is not public and is limited to admin roles', () => {
    const fn = StepUpController.prototype.options;
    expect(Reflect.getMetadata(PUBLIC_KEY, fn)).toBeFalsy();
    expect(Reflect.getMetadata(ROLES_KEY, fn)).toEqual([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  });

  it('takes the user from the JWT, not from a body', async () => {
    await ctrl.options({ id: 'a1', role: UserRole.ADMIN });
    expect(stepUp.startAssertion).toHaveBeenCalledWith('a1');
    expect(StepUpController.prototype.options.length).toBe(1);
  });

  it('refuses an anonymous caller', async () => {
    await expect(ctrl.options(undefined)).rejects.toThrow(UnauthorizedException);
    expect(stepUp.startAssertion).not.toHaveBeenCalled();
  });

  it('refuses a non-admin caller', async () => {
    await expect(ctrl.options({ id: 'p1', role: UserRole.PATIENT })).rejects.toThrow(ForbiddenException);
    expect(stepUp.startAssertion).not.toHaveBeenCalled();
  });
});
