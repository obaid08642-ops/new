import { RadiologyOpsService, radiologyWindows } from './radiology.service';

/** Gap 17: the availability schedule a centre saves (and the admin approves) is what its booking slots follow. */
describe('radiologyWindows', () => {
  const sched = { working_days: [true, true, true, true, true, false, false], morning_shift: { from: '08:00', to: '14:00' }, evening_shift: { from: '17:00', to: '22:00' } };
  it('a working day has a morning and an evening window; Sunday is day 0', () => {
    expect(radiologyWindows(sched, 0)).toEqual([{ open: '08:00', close: '14:00' }, { open: '17:00', close: '22:00' }]);
  });
  it('a day that is switched off has none', () => {
    expect(radiologyWindows(sched, 5)).toEqual([]);
    expect(radiologyWindows(sched, 6)).toEqual([]);
  });
  it('a shift without a valid HH:MM pair is left out, never guessed', () => {
    expect(radiologyWindows({ ...sched, evening_shift: { from: '17:00' } }, 1)).toEqual([{ open: '08:00', close: '14:00' }]);
    expect(radiologyWindows({ ...sched, morning_shift: { from: '8:00', to: '25:00' } }, 1)).toEqual([{ open: '17:00', close: '22:00' }]);
    expect(radiologyWindows({ working_days: [true], morning_shift: null }, 0)).toEqual([]);
  });
  it('no schedule, or one that is not a list of days, gives nothing', () => {
    expect(radiologyWindows(null, 0)).toEqual([]);
    expect(radiologyWindows({ working_days: 'yes' as any }, 0)).toEqual([]);
    expect(radiologyWindows({ working_days: ['true'] as any, morning_shift: { from: '08:00', to: '10:00' } }, 0)).toEqual([]);
  });
});

describe('slotsForProvider follows the approved schedule', () => {
  // the next Sunday and Friday, far enough ahead that no slot is "in the past"
  const nextDow = (dow: number) => { const d = new Date(Date.now() + 14 * 86400000); while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
  const build = (settings: any, scheduleClinic: any[] | undefined) => {
    const svc: any = Object.create(RadiologyOpsService.prototype);
    svc.profileModel = { findOne: () => ({ lean: async () => ({ account_id: 'rad-1', type: 'radiology', schedule_clinic: scheduleClinic }) }) };
    svc.conn = { collection: () => ({ findOne: async () => settings }) };
    svc.bkgModel = { find: () => ({ select: () => ({ lean: async () => [] }) }) };
    return svc as RadiologyOpsService;
  };
  const approved = { radiology_schedule: { working_days: [true, true, true, true, true, false, false], morning_shift: { from: '09:00', to: '11:00' }, evening_shift: { from: '18:00', to: '19:00' } } };

  it('a working day offers slots inside the saved shifts only', async () => {
    const out = await build(approved, undefined).slotsForProvider('rad-1', nextDow(0), 30);
    expect(out.slots.map((s: any) => s.label)).toEqual(['09:00', '09:30', '10:00', '10:30', '18:00', '18:30']);
  });
  it('a day the centre switched off is closed, even if its profile hours say open', async () => {
    const profileHours = [{ day: 'fri', open: '08:00', close: '12:00' }];
    const out = await build(approved, profileHours).slotsForProvider('rad-1', nextDow(5), 30);
    expect(out).toMatchObject({ slots: [], reason: 'closed' });
  });
  it('a centre that never saved a schedule keeps the opening hours of its profile', async () => {
    const out = await build(null, [{ day: 'all', open: '10:00', close: '11:00' }]).slotsForProvider('rad-1', nextDow(0), 30);
    expect(out.slots.map((s: any) => s.label)).toEqual(['10:00', '10:30']);
  });
  it('neither a saved schedule nor profile hours: no schedule', async () => {
    expect(await build(null, undefined).slotsForProvider('rad-1', nextDow(0), 30)).toMatchObject({ slots: [], reason: 'no_schedule' });
  });
});
