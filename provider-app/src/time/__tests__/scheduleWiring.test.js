/**
 * P15.9 — the schedule screen wiring, pinned without rendering the screen.
 *
 * `DoctorScheduleTab` pulls in sockets, navigation and the whole UI kit, so a
 * render test would be a mock of everything and an assertion of nothing.
 * What regressed before was the *call site*: `scheduled_at` (a server instant)
 * formatted with the device-zone `toLocaleTimeString`. This pins the source
 * facts that fix it — the instant goes through `formatInProviderZone`, and no
 * device-zone formatting of `scheduled_at` remains. Reverting the wiring
 * line turns this red.
 *
 * Plain JS with require, like `video-call-room.livekit.test.js`: no node
 * type declarations are installed for test sources.
 */
const fs = require('fs');
const path = require('path');

const SCREEN = path.resolve(__dirname, '../../screens/doctor/doctor/DoctorScheduleTab.tsx');

describe('P15.9 schedule screen renders server instants in Asia/Riyadh', () => {
  const source = fs.readFileSync(SCREEN, 'utf8');

  it('maps scheduled_at through formatInProviderZone', () => {
    expect(source).toContain("from '../../../time/providerZone'");
    expect(source).toContain('formatInProviderZone');
    expect(source).toMatch(/formatInProviderZone\(\s*x\.scheduled_at/);
  });

  it('no device-zone formatting of the server instant remains', () => {
    expect(source).not.toMatch(/scheduled_at\)\.toLocale/);
    expect(source).not.toContain('new Date(x.scheduled_at).toLocaleTimeString');
  });

  it('a missing instant still renders empty, not "Invalid Date"', () => {
    expect(source).toMatch(/\?\?\s*''/);
  });
});
