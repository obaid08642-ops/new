// R23 (070de6a): (a) the step-up challenge was read with get, so one signed
// assertion could be replayed for new tokens within the challenge TTL;
// (b) POST auth/step-up/issue was @Public and took the admin from the email in
// the body instead of the session.
jest.mock('@simplewebauthn/server', () => ({
  verifyAuthenticationResponse: jest.fn(async () => ({ verified: true, authenticationInfo: { newCounter: 1 } })),
}));
import { ForbiddenException } from '@nestjs/common';
import { StepUpService } from './step-up.guard';
import { RedisService } from '../modules/redis/redis.service';
import { StepUpController } from '../modules/auth/step-up.controller';
import { PUBLIC_KEY } from './auth.guard';

describe('step-up ceremony (R23)', () => {
  const cred = { user_id: 'adm', credential_id: 'cred-1', public_key: Buffer.from([1, 2, 3]), counter: 0, transports: [] };
  const passkeyModel = { findOne: jest.fn(() => ({ lean: async () => cred })), updateOne: jest.fn(async () => ({})) };

  it('a challenge is single-use: the same assertion cannot mint a second token', async () => {
    const svc = new StepUpService(passkeyModel as never, new RedisService());
    await svc.storeChallenge('adm');
    await expect(svc.issueFromAssertion('adm', 'POST:/api/v1/x', { id: 'cred-1' })).resolves.toEqual(expect.any(String));
    await expect(svc.issueFromAssertion('adm', 'POST:/api/v1/x', { id: 'cred-1' })).rejects.toThrow('challenge_expired');
  });

  it('issue takes the admin from the session, never from the body email, and is not public', async () => {
    const issueFromAssertion = jest.fn(async () => 'tok');
    const ctrl = new StepUpController({ userModel: { findOne: jest.fn() } } as never, { issueFromAssertion } as never);
    await ctrl.issue({ id: 'adm', role: 'admin' } as never, { identifier: 'other-admin@nabd.test', action: 'POST:/api/v1/x', response: { id: 'cred-1' } } as never);
    expect(issueFromAssertion).toHaveBeenCalledWith('adm', 'POST:/api/v1/x', { id: 'cred-1' });
    expect(Reflect.getMetadata(PUBLIC_KEY, StepUpController.prototype.issue)).toBeFalsy();
    await expect(ctrl.issue({ id: 'p1', role: 'patient' } as never, { action: 'POST:/api/v1/x', response: {} } as never)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
