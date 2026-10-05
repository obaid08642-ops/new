// Independent check: candidates stepped by the appointment's duration, so a
// 45-minute appointment was checked against a 45-minute grid while patients
// pick from the 30-minute list: an aligned pick was refused as not offered.
// Starts are on one fixed 30-minute grid; the duration only sets the length.
import { candidateSlots } from '../availability';

describe('one start grid for every duration', () => {
  const day = new Date('2030-01-02T00:00:00Z');
  const windows = [{ open: '09:00', close: '11:00' }];
  it('30-minute slots', () => {
    expect(candidateSlots(day, windows, 30, 0).map((s) => s.label)).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });
  it('a 45-minute appointment starts on the same grid and must fit before closing', () => {
    expect(candidateSlots(day, windows, 45, 0).map((s) => s.label)).toEqual(['09:00', '09:30', '10:00']);
    expect(candidateSlots(day, windows, 45, 0)[0].end).toBe('2030-01-02T09:45:00.000Z');
  });
});
