// ACCEPTANCE — Q89 + R23 (REVIEW_REAUDIT Round 12 Phase A #5). Written by the
// reviewer before the fix; the implementing agent makes it pass and may not edit
// it. Step-up (fresh passkey) plus a named permission on every remaining money /
// privilege admin route (the Q66 list), a step-up ceremony that is single-use and
// bound to the session, and a usable admin step-up prompt.
// Second independent check (step-up round): the admin client builds the
// step-up action from the DECODED path, while the BFF re-encodes each segment
// and Express keeps req.path encoded. An id with '@', ':' or a space then
// failed with step_up_invalid on the retry. Both sides now use the decoded path.
import { Reflector } from '@nestjs/core';
import { StepUpGuard, StepUpService, STEP_UP_KEY } from '../../src/common/step-up.guard';

describe('StepUpGuard binds the token to the decoded request path', () => {
  const verify = jest.fn(async () => true);
  const reflector = { getAllAndOverride: (key: string) => key === STEP_UP_KEY } as unknown as Reflector;
  const guard = new StepUpGuard(reflector, { verify } as unknown as StepUpService, {} as never);
  const ctx = (path: string) => ({
    getHandler: () => null, getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ method: 'POST', path, user: { id: 'adm' }, headers: { 'x-step-up-token': 't' } }) }),
  }) as never;

  it('an encoded id is verified against the decoded action the client signed', async () => {
    await guard.canActivate(ctx('/api/v1/admin/users/a%40b%3Ac%20d/ban'));
    expect(verify).toHaveBeenLastCalledWith('adm', 'POST:/api/v1/admin/users/a@b:c d/ban', 't');
  });

  it('a malformed escape keeps the raw path instead of throwing', async () => {
    await guard.canActivate(ctx('/api/v1/admin/users/%E0%A4%A/ban'));
    expect(verify).toHaveBeenLastCalledWith('adm', 'POST:/api/v1/admin/users/%E0%A4%A/ban', 't');
  });
});
