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

  // The step-up ceremony must check the same origin and RP ID as passkey
  // enrollment and login (WEBAUTHN_ORIGIN / WEBAUTHN_RP_ID); it read other
  // variables and defaulted to localhost, so no production step-up could pass.
  it('verifies against the same WebAuthn origin and RP ID as passkey enrollment', async () => {
    const { verifyAuthenticationResponse } = require('@simplewebauthn/server');
    const env = { ...process.env };
    try {
      delete process.env.WEBAUTHN_ORIGIN; delete process.env.WEBAUTHN_RP_ID; delete process.env.PASSKEY_ORIGIN; delete process.env.PASSKEY_RP_ID;
      const svc = new StepUpService(passkeyModel as never, new RedisService());
      await svc.storeChallenge('adm');
      await svc.issueFromAssertion('adm', 'POST:/api/v1/x', { id: 'cred-1' });
      expect(verifyAuthenticationResponse).toHaveBeenLastCalledWith(expect.objectContaining({ expectedOrigin: ['https://admin.nabd.plus'], expectedRPID: 'nabd.plus' }));
      process.env.WEBAUTHN_ORIGIN = 'http://localhost:3001'; process.env.WEBAUTHN_RP_ID = 'localhost';
      await svc.storeChallenge('adm');
      await svc.issueFromAssertion('adm', 'POST:/api/v1/x', { id: 'cred-1' });
      expect(verifyAuthenticationResponse).toHaveBeenLastCalledWith(expect.objectContaining({ expectedOrigin: ['http://localhost:3001'], expectedRPID: 'localhost' }));
    } finally {
      process.env = env;
    }
  });
});
