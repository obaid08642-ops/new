import fs from 'fs';
import path from 'path';

// Product decision: guest mode IS a first-class entry (device-bound account
// via /auth/guest — guests can use every service except insurance & family).
// The guardrails that remain:
//  1. The app shell (_layout) must NEVER silently create a guest session.
//     Owner decision B2 (2026-10-06): the SPLASH (app/index.tsx) opens a silent
//     guest session on first launch with no session at all, so Home loads
//     without the error banner. It goes through ensureGuestSession(), which
//     does nothing when any session is stored.
//  2. Every guest session (splash or the welcome screen's explicit button) uses
//     the real backend guest endpoint with a stable per-device id (no fake
//     local tokens): src/utils/guestSession.ts.

describe('guest authentication policy', () => {
  const appDir = path.resolve(__dirname, '../../../app');

  it('never silently creates a guest session from the app shell', () => {
    const layout = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
    expect(layout).not.toContain('/auth/guest');
    expect(layout).not.toContain('guestLogin(');
    expect(layout).not.toContain('GUEST_MODE');
  });

  it('the splash opens the silent guest session through the shared helper', () => {
    const splash = fs.readFileSync(path.join(appDir, 'index.tsx'), 'utf8');
    expect(splash).toContain('ensureGuestSession(');
    expect(splash).toContain('guestLogin(');
  });

  it('welcome screen guest entry and the splash share the real backend guest helper', () => {
    const welcome = fs.readFileSync(path.join(appDir, '(auth)', 'welcome.tsx'), 'utf8');
    expect(welcome).toContain('createGuestSession(');
    expect(welcome).toContain('guestLogin(');
    const helper = fs.readFileSync(path.resolve(appDir, '../src/utils/guestSession.ts'), 'utf8');
    expect(helper).toContain("apiFetch('/auth/guest'");
    expect(helper).toContain('getDeviceId(');
    expect(helper).toContain('x-device-id');
    expect(helper).toContain('storeAuthSession(');
  });
});
