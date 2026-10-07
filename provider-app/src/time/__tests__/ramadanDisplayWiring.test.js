/**
 * P15.9 — the provider schedule UI shows the Ramadan / special-hours entries
 * from GET /provider/profile/availability (the same profile source the slot
 * engine honours).
 *
 * Source-fact pinning, like `scheduleWiring.test.js`: both screens pull in
 * the whole UI kit, so a render test would mock everything and assert
 * nothing. Removing any wired surface below (the availability sections, the
 * schedule-tab banner, or the helper import) turns this red.
 *
 * Plain JS with require: no node type declarations are installed for test
 * sources.
 */
const fs = require('fs');
const path = require('path');

const AVAILABILITY_SCREEN = path.resolve(
  __dirname,
  '../../screens/doctor/doctor/DoctorAvailabilityScreen.tsx',
);
const SCHEDULE_TAB = path.resolve(__dirname, '../../screens/doctor/doctor/DoctorScheduleTab.tsx');

describe('P15.9 Ramadan / special-hours display wiring', () => {
  const availability = fs.readFileSync(AVAILABILITY_SCREEN, 'utf8');
  const schedule = fs.readFileSync(SCHEDULE_TAB, 'utf8');

  it('the availability screen reads both hour lists from the endpoint', () => {
    expect(availability).toContain("client.get('/provider/profile/availability')");
    expect(availability).toContain('response.data.ramadan_hours');
    expect(availability).toContain('response.data.special_hours');
  });

  it('the availability screen renders distinct Ramadan and special sections', () => {
    expect(availability).toContain("from '../../../time/scheduleHours'");
    expect(availability).toContain('testID="ramadan-hours-section"');
    expect(availability).toContain('testID="special-hours-section"');
    expect(availability).toContain('testID="special-hours-today-badge"');
    expect(availability).toContain('findTodaySpecialHours(');
    expect(availability).toContain('hasRamadanHours(');
  });

  it('the schedule tab badges today’s special hours from the endpoint', () => {
    expect(schedule).toContain("from '../../../time/scheduleHours'");
    expect(schedule).toContain('findTodaySpecialHours(');
    expect(schedule).toContain("client.get('/provider/profile/availability')");
    expect(schedule).toContain('testID="special-hours-today-banner"');
  });

  it('no placeholder hours are rendered when the lists are empty', () => {
    expect(availability).toContain('No Ramadan hours set');
    expect(availability).toContain('No special hours');
  });
});
