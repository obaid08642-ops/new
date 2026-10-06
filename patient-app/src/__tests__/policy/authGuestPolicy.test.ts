import fs from 'fs';
import path from 'path';

// Product decision: guest mode IS a first-class entry (device-bound account
// via /auth/guest — guests can use every service except insurance & family).
// The guardrails that remain:
//  1. The app shell (_layout) must NEVER silently create a guest session —
//     guest entry is an explicit user action on the welcome screen.
//  2. The welcome screen must use the real backend guest endpoint with a
//     stable per-device id (no fake local tokens).

describe('guest authentication policy', () => {
  const appDir = path.resolve(__dirname, '../../../app');

  it('never silently creates a guest session from the app shell', () => {
    const layout = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
    expect(layout).not.toContain('/auth/guest');
    expect(layout).not.toContain('guestLogin(');
    expect(layout).not.toContain('GUEST_MODE');
  });

  it('welcome screen guest entry is wired to the real backend endpoint with a device id', () => {
    const welcome = fs.readFileSync(path.join(appDir, '(auth)', 'welcome.tsx'), 'utf8');
    expect(welcome).toContain("apiFetch('/auth/guest'");
    expect(welcome).toContain('getDeviceId(');
    expect(welcome).toContain('x-device-id');
    expect(welcome).toContain('storeAuthSession(');
    expect(welcome).toContain('guestLogin(');
  });
});
