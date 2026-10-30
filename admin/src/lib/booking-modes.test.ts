import { describe, expect, it } from 'vitest';
import { cleanOptions, modeOf, optionsError, toggleOption } from './booking-modes';

describe('booking modes', () => {
  it('a row without a mode is a visit', () => {
    expect(modeOf(undefined)).toBe('visit');
    expect(modeOf('weird')).toBe('visit');
    expect(modeOf('programme')).toBe('programme');
  });
  it('sends only the groups of the chosen mode, known values, in catalogue order', () => {
    expect(cleanOptions('continuous', { hours: [24, 8, 99], shift: ['night'], period: ['week'], sessions: [4], recurrence: ['daily'] }))
      .toEqual({ hours: [8, 24], shift: ['night'], period: ['week'] });
    expect(cleanOptions('programme', { sessions: [12, 4] })).toEqual({ sessions: [4, 12] });
  });
  it('toggles a value on and off', () => {
    const on = toggleOption({}, 'hours', 12);
    expect(on.hours).toEqual([12]);
    expect(toggleOption(on, 'hours', 12).hours).toEqual([]);
  });
  it('asks for at least one value in every group of the mode', () => {
    expect(optionsError('continuous', { hours: [8], shift: ['day'] })).toContain('الفترة');
    expect(optionsError('continuous', { hours: [8], shift: ['day'], period: ['day'] })).toBeNull();
    expect(optionsError('visit', {})).toContain('التكرار');
  });
});
