import { ForbiddenException } from '@nestjs/common';
import { generateRegistrationOptions, verifyRegistrationResponse, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { StepUpService } from './step-up.guard';
import { webauthnOrigins, webauthnRpId } from './webauthn-config';

jest.mock('@simplewebauthn/server', () => ({
  ...jest.requireActual('@simplewebauthn/server'),
  verifyAuthenticationResponse: jest.fn(),
}));

class TestStepUp extends StepUpService {
  store = new Map<string, string>();
  protected async setChallenge(k: string, c: string) { this.store.set(k, c); }
  protected async takeChallenge(k: string) { const v = this.store.get(k) ?? null; this.store.delete(k); return v; }
}

describe('webauthn-config + step-up on the admin origin', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; jest.clearAllMocks(); });

  it('defaults: rpID nabd.plus, origins admin.nabd.plus and nabd.plus', () => {
    delete process.env.WEBAUTHN_RP_ID; delete process.env.PASSKEY_RP_ID;
    delete process.env.WEBAUTHN_ORIGIN; delete process.env.PASSKEY_ORIGIN;
    expect(webauthnRpId()).toBe('nabd.plus');
    expect(webauthnOrigins()).toEqual(['https://admin.nabd.plus', 'https://nabd.plus']);
  });

  it('APP_ORIGIN/localhost no longer leaks into the rpID', () => {
    process.env.APP_ORIGIN = 'http://localhost:3001';
    delete process.env.WEBAUTHN_RP_ID; delete process.env.PASSKEY_RP_ID;
    expect(webauthnRpId()).toBe('nabd.plus');
  });

  it('options → issue verifies with rpID nabd.plus and the admin origin', async () => {
    const model: any = {
      find: () => ({ lean: async () => [{ credential_id: 'cred-1', transports: ['internal'] }] }),
      findOne: () => ({ lean: async () => ({ credential_id: 'cred-1', public_key: Buffer.from([1, 2]), counter: 0 }) }),
      updateOne: jest.fn(),
    };
    const svc = new TestStepUp(model);
    const options = await svc.startAssertion('u1');
    expect(options.rpId).toBe('nabd.plus');
    (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 0 } });
    const token = await svc.issueFromAssertion('u1', 'POST:/x', { id: 'cred-1' });
    const args = (verifyAuthenticationResponse as jest.Mock).mock.calls[0][0];
    expect(args.expectedRPID).toBe('nabd.plus');
    expect(args.expectedOrigin).toContain('https://admin.nabd.plus');
    expect(args.expectedChallenge).toBe(options.challenge);
    expect(svc.verify('u1', 'POST:/x', token)).toBe(true);
  });

  it('a failed verification is rejected (reason logged, not leaked)', async () => {
    const model: any = {
      find: () => ({ lean: async () => [{ credential_id: 'c' }] }),
      findOne: () => ({ lean: async () => ({ credential_id: 'c', public_key: Buffer.from([1]), counter: 0 }) }),
    };
    const svc = new TestStepUp(model);
    await svc.startAssertion('u1');
    (verifyAuthenticationResponse as jest.Mock).mockRejectedValue(new Error('Unexpected authentication response origin'));
    await expect(svc.issueFromAssertion('u1', 'a', { id: 'c' })).rejects.toThrow(ForbiddenException);
  });

  it('the credential lookup only takes a string id and matches it with $eq (no operator object reaches the query)', async () => {
    const findOne = jest.fn(() => ({ lean: async () => ({ credential_id: 'cred-1', public_key: Buffer.from([1, 2]), counter: 0 }) }));
    const model: any = { find: () => ({ lean: async () => [{ credential_id: 'cred-1' }] }), findOne, updateOne: jest.fn() };
    const svc = new TestStepUp(model);
    await svc.startAssertion('u1');
    (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 1 } });
    await svc.issueFromAssertion('u1', 'POST:/x', { id: 'cred-1' });
    expect(findOne).toHaveBeenCalledWith({ user_id: { $eq: 'u1' }, credential_id: { $eq: 'cred-1' } });
    findOne.mockClear();
    for (const id of [{ $ne: '' }, { $gt: '' }, 5, undefined, '']) {
      await expect(svc.issueFromAssertion('u1', 'POST:/x', { id })).rejects.toThrow(ForbiddenException);
    }
    expect(findOne).not.toHaveBeenCalled();
  });
});
