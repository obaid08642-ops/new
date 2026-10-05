// X4 (owner decision): finance and support_agent accounts are platform staff
// (they reach the admin console through the gate, from an enrolled device, and
// finance approves payouts behind step-up). Before: passkey enrollment, the
// passkey login, recovery and the device endpoints accepted only admin and
// super_admin, so under ADMIN_PASSKEY_ENFORCED a finance or support_agent
// account could never satisfy passkey_enrollment_required.
import * as bcrypt from 'bcryptjs';
import { ROLES_KEY } from '../../common/auth.guard';
import { roleSatisfies } from '../../common/rbac';
import { AdminDevicesController } from './admin-devices.controller';
import { AdminRecoveryController } from './admin-recovery.controller';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';

const STAFF = ['finance', 'support_agent'] as const;

function passkeyService(role: string, credentials = 0) {
  const users = { findOne: () => ({ lean: async () => ({ id: 'u1', role }) }) };
  const creds = { countDocuments: async () => credentials };
  return new PasskeyService(creds as never, users as never, {} as never);
}

describe('X4: finance and support_agent can hold a passkey', () => {
  describe('enrollment gate', () => {
    it.each(STAFF)('%s may enroll a passkey', async (role) => {
      await expect(passkeyService(role).assertEnrollmentAllowed({ id: 'u1', role })).resolves.toEqual(expect.objectContaining({ role }));
      await expect(passkeyService(role).isEligible({ id: 'u1', role })).resolves.toEqual({ eligible: true });
    });
    it.each(['patient', 'doctor', 'pharmacy'])('%s may not', async (role) => {
      await expect(passkeyService(role).assertEnrollmentAllowed({ id: 'u1', role })).rejects.toThrow('staff_only');
      await expect(passkeyService(role).isEligible({ id: 'u1', role })).resolves.toEqual({ eligible: false });
    });
    it.each(STAFF)('%s adding a second passkey still needs an existing one', async (role) => {
      await expect(passkeyService(role, 0).assertEnrollmentAllowed({ id: 'u1', role }, true)).rejects.toThrow('existing_passkey_required');
      await expect(passkeyService(role, 1).assertEnrollmentAllowed({ id: 'u1', role }, true)).resolves.toBeTruthy();
    });
  });

  describe('sign-in', () => {
    async function authFor(role: string, credentials: number) {
      const user = { id: 'u1', email: 's@nabd.test', role, active: true, password_hash: await bcrypt.hash('pw', 4), save: async () => undefined };
      const enroll = jest.fn(async () => ({ ok: true }));
      const auth = Object.assign(Object.create(AuthService.prototype), {
        userModel: { findOne: async () => user },
        passkeys: {
          countCredentials: async () => credentials,
          startLogin: async () => ({ challenge: 'c' }),
          finishLogin: async () => 'u1',
        },
        adminDevices: { enroll },
        otpContact: () => 's@nabd.test',
        sendOtp: jest.fn(async () => ({ ok: true })),
        verifyOtp: async () => true,
        adminLoginAlert: async () => undefined,
        events: { emit: () => undefined },
        signToken: () => 'tok',
        publicUser: (u: { id: string; role: string }) => ({ id: u.id, role: u.role }),
      });
      return { auth, enroll };
    }

    it.each(STAFF)('%s without a passkey gets the email-code bootstrap, never a token', async (role) => {
      const { auth } = await authFor(role, 0);
      const res = await auth.login('s@nabd.test', 'pw');
      expect(res).toEqual(expect.objectContaining({ requires_2fa: true, passkey_bootstrap: true }));
      expect(res.token).toBeUndefined();
    });
    it.each(STAFF)('%s with a passkey must use it (password alone gives no token)', async (role) => {
      const { auth } = await authFor(role, 1);
      const res = await auth.login('s@nabd.test', 'pw');
      expect(res).toEqual(expect.objectContaining({ requires_passkey: true }));
      expect(res.token).toBeUndefined();
    });
    it.each(STAFF)('%s with a passkey cannot sign in with an emailed code alone', async (role) => {
      const { auth } = await authFor(role, 1);
      await expect(auth.verify2fa('s@nabd.test', '123456')).rejects.toThrow('passkey_required');
    });
    it.each(STAFF)('%s passkey login succeeds and binds this device to the credential', async (role) => {
      const { auth, enroll } = await authFor(role, 1);
      const res = await auth.completePasskeyLogin('s@nabd.test', { id: 'cred-1' }, { deviceId: 'd'.repeat(32), ua: 'ua' });
      expect(res.token).toBe('tok');
      expect(enroll).toHaveBeenCalledWith('u1', 'd'.repeat(32), 'ua', undefined, 'cred-1');
    });
    it('a patient still signs in with a password (no staff flow)', async () => {
      const { auth } = await authFor('patient', 0);
      await expect(auth.login('s@nabd.test', 'pw')).resolves.toEqual(expect.objectContaining({ token: 'tok' }));
    });
    it('a patient cannot use the staff passkey login', async () => {
      const { auth } = await authFor('patient', 1);
      await expect(auth.completePasskeyLogin('s@nabd.test', { id: 'cred-1' })).rejects.toThrow('Invalid credentials');
    });
  });

  it('the device endpoints admit finance and support_agent, not providers or patients', () => {
    const roles: string[] = Reflect.getMetadata(ROLES_KEY, AdminDevicesController);
    for (const role of STAFF) expect(roles.some((r) => roleSatisfies(r, [role]))).toBe(true);
    for (const role of ['patient', 'doctor']) expect(roles.some((r) => roleSatisfies(r, [role]))).toBe(false);
  });

  describe('break-glass recovery', () => {
    function recoveryFor(role: string) {
      const sendOtp = jest.fn(async () => ({ ok: true, channel: 'email' }));
      const auth = Object.assign(Object.create(AuthService.prototype), {
        userModel: { findOne: async () => ({ id: 'u1', email: 's@nabd.test', role, save: async () => undefined }) },
        sendOtp,
        otpContact: () => 's@nabd.test',
        verifyOtp: async () => true,
        adminLoginAlert: async () => undefined,
        publicUser: (u: { id: string }) => ({ id: u.id }),
        jwt: { sign: () => 'tok' },
        storeRefreshSession: async () => undefined,
      });
      const recovery = { generate: jest.fn(async () => ['A']), consume: jest.fn(async () => undefined) };
      return { ctl: new AdminRecoveryController(auth, recovery as never), sendOtp, recovery };
    }
    it.each(STAFF)('%s can generate codes, start and redeem recovery', async (role) => {
      const { ctl, sendOtp, recovery } = recoveryFor(role);
      await expect(ctl.generate({ id: 'u1', role })).resolves.toEqual(expect.objectContaining({ codes: ['A'] }));
      await ctl.start({ email: 's@nabd.test' } as never);
      expect(sendOtp).toHaveBeenCalledWith('s@nabd.test', 'admin_recovery');
      await expect(ctl.redeem({ email: 's@nabd.test', email_code: '1', recovery_code: 'A' } as never)).resolves.toEqual(expect.objectContaining({ token: expect.objectContaining({ accessToken: 'tok' }) }));
      expect(recovery.consume).toHaveBeenCalledWith('u1', 'A');
    });
    it('a patient gets nothing from recovery', async () => {
      const { ctl, sendOtp } = recoveryFor('patient');
      await expect(ctl.generate({ id: 'u1', role: 'patient' })).rejects.toThrow('staff_only');
      await expect(ctl.start({ email: 's@nabd.test' } as never)).resolves.toEqual({ ok: true, channel: 'email' });
      expect(sendOtp).not.toHaveBeenCalled();
      await expect(ctl.redeem({ email: 's@nabd.test', email_code: '1', recovery_code: 'A' } as never)).rejects.toThrow('Invalid credentials');
    });
  });
});
