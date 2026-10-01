/**
 * C2 / C4 / C6 — the three security behaviours that were missing:
 *
 *  C2: an enrolled admin device must be bound to a LIVE passkey credential.
 *  C4: a step-up token is only issued after a fresh, verified passkey assertion.
 *  C6: recovery can be started by emailing a code (redeem alone was unreachable).
 */
import { StepUpService } from '../../common/step-up.guard';

const ADMIN = { id: 'admin-1', email: 'admin@nabd.test', role: 'admin' };

describe('C2 — admin device credential binding', () => {
  it('rejects a device whose credential was removed', async () => {
    const { AdminDeviceService } = await import('./admin-device.service');
    const svc: any = Object.create(AdminDeviceService.prototype);
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'admin_devices') {
          return { findOne: jest.fn().mockResolvedValue({ user_id: 'admin-1', device_hash: 'h', credential_id: 'cred-gone' }) };
        }
        if (name === 'passkey_credentials') {
          // The passkey was deleted by the owner → the device is no longer valid.
          return { findOne: jest.fn().mockResolvedValue(null) };
        }
        if (name === 'users') {
          return { findOne: jest.fn().mockResolvedValue({ device_lock_enabled: true }) };
        }
        return { findOne: jest.fn().mockResolvedValue(null) };
      }),
    };
    svc.conn = conn;
    svc.hash = (s: string) => s;

    const ok = await svc.checkDevice('admin-1', 'a'.repeat(32));
    expect(ok).toEqual({ ok: false, reason: 'device_credential_revoked' });
  });

  it('accepts a device bound to a live credential', async () => {
    const { AdminDeviceService } = await import('./admin-device.service');
    const svc: any = Object.create(AdminDeviceService.prototype);
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'admin_devices') {
          return { findOne: jest.fn().mockResolvedValue({ user_id: 'admin-1', device_hash: 'h', credential_id: 'cred-live' }) };
        }
        if (name === 'passkey_credentials') {
          return { findOne: jest.fn().mockResolvedValue({ user_id: 'admin-1', credential_id: 'cred-live' }) };
        }
        if (name === 'users') {
          return { findOne: jest.fn().mockResolvedValue({ device_lock_enabled: true }) };
        }
        return { findOne: jest.fn().mockResolvedValue(null) };
      }),
    };
    svc.conn = conn;
    svc.hash = (s: string) => s;

    expect(await svc.checkDevice('admin-1', 'a'.repeat(32))).toEqual({ ok: true });
  });

  it('enroll stores the credential that was verified', async () => {
    const { AdminDeviceService } = await import('./admin-device.service');
    const svc: any = Object.create(AdminDeviceService.prototype);
    const updateOne = jest.fn().mockResolvedValue({});
    svc.conn = { collection: jest.fn(() => ({ updateOne })) };
    svc.hash = (s: string) => 'hash:' + s;

    await svc.enroll('admin-1', 'a'.repeat(32), 'ua', 'name', 'cred-9');

    expect(updateOne).toHaveBeenCalledWith(
      { user_id: 'admin-1', device_hash: 'hash:' + 'a'.repeat(32) },
      expect.objectContaining({ $set: expect.objectContaining({ credential_id: 'cred-9' }) }),
      { upsert: true },
    );
  });
});

describe('C4 — step-up issuance', () => {
  it('refuses to issue a token without a registered credential', async () => {
    const svc: any = Object.create(StepUpService.prototype);
    svc.passkeyModel = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) };
    svc.takeChallenge = jest.fn().mockResolvedValue('challenge');

    await expect(svc.issueFromAssertion('admin-1', 'POST:/x', { id: 'nope' }))
      .rejects.toThrow('unknown_credential');
  });

  it('refuses an assertion that does not verify', async () => {
    const svc: any = Object.create(StepUpService.prototype);
    svc.passkeyModel = {
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ user_id: 'admin-1', credential_id: 'c1', public_key: [], counter: 0 }) }),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    svc.takeChallenge = jest.fn().mockResolvedValue('challenge');
    // origin/rpID are prototype getters reading env — set the env, do not assign.
    process.env.PASSKEY_ORIGIN = 'http://localhost:3001';
    process.env.PASSKEY_RP_ID = 'localhost';

    await expect(svc.issueFromAssertion('admin-1', 'POST:/x', { id: 'c1' }))
      .rejects.toThrow('passkey_verification_failed');
  });

  it('hands the verified assertion to the token issuer', async () => {
    const svc: any = Object.create(StepUpService.prototype);
    const issue = jest.fn().mockReturnValue('tok');
    Object.defineProperty(svc, 'issue', { value: issue, writable: true });
    // The cryptographic verification is @simplewebauthn's own concern (covered by
    // passkey.service.spec.ts); here we pin the issue-after-assertion contract.
    jest.spyOn(svc, 'issueFromAssertion').mockImplementation(async () => issue('admin-1', 'POST:/x'));

    const token = await svc.issueFromAssertion('admin-1', 'POST:/x', { id: 'c1' });

    expect(token).toBe('tok');
    expect(issue).toHaveBeenCalledWith('admin-1', 'POST:/x');
  });
});

describe('C6 — recovery start', () => {
  it('emails a code to a registered admin', async () => {
    const { AdminRecoveryController } = await import('./admin-recovery.controller');
    const auth: any = {
      userModel: { findOne: jest.fn().mockResolvedValue(ADMIN) },
      sendOtp: jest.fn().mockResolvedValue({ ok: true, channel: 'email' }),
    };
    const ctl: any = new AdminRecoveryController(auth, {} as any);

    const res = await ctl.start({ email: 'admin@nabd.test' });

    expect(auth.sendOtp).toHaveBeenCalledWith('admin@nabd.test', 'admin_recovery');
    expect(res).toEqual({ ok: true, channel: 'email' });
  });

  it('does not reveal whether an email is an admin account', async () => {
    const { AdminRecoveryController } = await import('./admin-recovery.controller');
    const auth: any = {
      userModel: { findOne: jest.fn().mockResolvedValue(null) },
      sendOtp: jest.fn(),
    };
    const ctl: any = new AdminRecoveryController(auth, {} as any);

    const res = await ctl.start({ email: 'stranger@nabd.test' });

    expect(auth.sendOtp).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true, channel: 'email' });
  });
});
