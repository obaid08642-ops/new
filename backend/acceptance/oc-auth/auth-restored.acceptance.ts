// ACCEPTANCE — OpenCode review 2026-10-05 (REVIEW_OPENCODE_P15_P21.md, item A).
// Written by the reviewer; the implementing agent makes it pass and may not edit it.
// 6242f179 replaced backend/src/modules/auth/auth.service.ts (1263 -> 187 lines) and
// e87b626e left shell residue at its end, so the backend did not compile and every
// sign-in path (patient OTP, password, admin 2FA/passkey, refresh, reset, guest)
// was gone. Required: the service of 08420c11 is back, with Phase 21 ADDED on top.
// Also required (run separately, see README): `npx jest src/modules/auth` passes
// every suite that passed at 08420c11 (14/14) without editing those specs.
// Q107: socialLogin stays, verifying the provider token ([REVIEW-FIX] d7dc620f / #290).
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '../../src/modules/auth');
const REQUIRED = [
  'signToken', 'refreshToken', 'revokeAllUserSessions', 'revokeAfterCredentialChange', 'rotateSessionsAfterPasswordChange',
  'logoutAllDevices', 'recordComplianceConsent', 'requestPatientOtp', 'verifyPatientOtp', 'exchangePatientSession',
  'forgotPatientPassword', 'resetPatientPassword', 'registerPatientContract', 'register', 'login', 'verify2fa',
  'completePasskeyLogin', 'adminLoginAlert', 'listTrustedDevices', 'revokeTrustedDevice', 'deviceHeartbeat', 'onlineDevices',
  'guest', 'convertGuest', 'me', 'publicUser', 'sendOtp', 'verifyOtp', 'resetPassword', 'socialLogin',
];

describe('auth service restored (OpenCode review item A)', () => {
  it('auth.service.ts is plain TypeScript (no shell residue)', () => {
    const text = fs.readFileSync(path.join(SRC, 'auth.service.ts'), 'utf8');
    expect(text).not.toMatch(/^\s*EOF\s*$/m);
    expect(text).not.toMatch(/^\s*(wc -l|cat <<|git (add|commit))\b/m);
    expect(text).not.toMatch(/rest of existing auth\.service\.ts methods/);
  });

  it('every sign-in / session / guest method of 08420c11 exists on AuthService', async () => {
    const { AuthService } = await import('../../src/modules/auth/auth.service');
    const missing = REQUIRED.filter((m) => typeof (AuthService.prototype as unknown as Record<string, unknown>)[m] !== 'function');
    expect(missing).toEqual([]);
  });

  it('every this.auth.<method>(...) the controller calls exists on AuthService', async () => {
    const { AuthService } = await import('../../src/modules/auth/auth.service');
    const ctl = fs.readFileSync(path.join(SRC, 'auth.controller.ts'), 'utf8');
    const called = [...new Set([...ctl.matchAll(/this\.auth\.([A-Za-z0-9_]+)\(/g)].map((m) => m[1]))];
    const missing = called.filter((m) => typeof (AuthService.prototype as unknown as Record<string, unknown>)[m] !== 'function');
    expect(missing).toEqual([]);
  });

});
