/**
 * 15.9 — Clocks and time zones: Riyadh wall-clock primitives.
 *
 * Server containers run UTC and laptops run anything; every provider-local
 * decision must resolve the SERVER instant in Asia/Riyadh explicitly.
 * Reference values verified against Node Intl (machine TZ Asia/Riyadh):
 *   2027-02-14T06:00:00Z == Sunday 09:00 Riyadh
 *   2027-02-14T21:30:00Z == Monday 00:30 Riyadh (Riyadh day boundary ≠ UTC)
 *   2026-02-18 == 1 Ramadan 1447, 2027-02-15 == 8 Ramadan 1448.
 */
import { RIYADH_TZ, isRamadan, riyadhParts } from './riyadh-clock';

describe('15.9 riyadh-clock (pure, no DB)', () => {
  it('exposes the Asia/Riyadh contract timezone', () => {
    expect(RIYADH_TZ).toBe('Asia/Riyadh');
  });

  it('resolves a morning instant to the Riyadh wall clock', () => {
    expect(riyadhParts(new Date('2027-02-14T06:00:00Z'))).toEqual({
      dow: 0, hours: 9, minutes: 0, ymd: '2027-02-14',
    });
  });

  it('crosses the Riyadh day boundary independently of UTC', () => {
    // 20:30Z is still Sunday in Riyadh; 21:30Z is already Monday 00:30.
    expect(riyadhParts(new Date('2027-02-14T20:30:00Z')).dow).toBe(0);
    expect(riyadhParts(new Date('2027-02-14T20:30:00Z')).ymd).toBe('2027-02-14');
    expect(riyadhParts(new Date('2027-02-14T21:30:00Z')).dow).toBe(1);
    expect(riyadhParts(new Date('2027-02-14T21:30:00Z')).ymd).toBe('2027-02-15');
  });

  it('detects Ramadan (Umm al-Qura month 9) in Riyadh', () => {
    expect(isRamadan(new Date('2026-02-18T12:00:00Z'))).toBe(true); // 1 Ramadan 1447
    expect(isRamadan(new Date('2027-02-15T12:00:00Z'))).toBe(true); // 8 Ramadan 1448
    expect(isRamadan(new Date('2027-06-01T12:00:00Z'))).toBe(false);
    expect(isRamadan(new Date('2026-04-01T12:00:00Z'))).toBe(false);
  });
});
