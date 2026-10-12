import { BadRequestException } from '@nestjs/common';

/**
 * Duration validation logic extracted from controllers for testing.
 * This mirrors the inline validation in:
 * - NursingController.providerSlots
 * - LabsController.providerSlots
 * - RadiologyController.providerSlots
 */
function validateDuration(duration?: string): number {
  const dur = duration ? parseInt(duration, 10) : 30;
  if (!Number.isInteger(dur) || dur < 10 || dur > 120) {
    throw new BadRequestException('duration must be an integer between 10 and 120 minutes');
  }
  return dur;
}

describe('Slots duration validation (shared logic for home-care, labs, radiology)', () => {
  const invalidDurations = [
    { value: 0, desc: 'zero' },
    { value: -15, desc: 'negative' },
    { value: 200, desc: 'above 120' },
    { value: 7.5, desc: 'non-integer float' },
    { value: 'abc', desc: 'non-numeric string' },
    { value: NaN, desc: 'NaN' },
      ];

  const validDurations = [10, 30, 60, 120];

  describe('rejects invalid durations', () => {
    for (const { value, desc } of invalidDurations) {
      it(`duration = ${desc} (${String(value)}) throws BadRequestException`, () => {
        expect(() => validateDuration(String(value))).toThrow(BadRequestException);
        expect(() => validateDuration(String(value))).toThrow('duration must be an integer between 10 and 120 minutes');
      });
    }
  });

  describe('accepts valid durations', () => {
    for (const value of validDurations) {
      it(`duration = ${value} returns ${value}`, () => {
        expect(validateDuration(String(value))).toBe(value);
      });
    }

    it('defaults to 30 when undefined', () => {
      expect(validateDuration(undefined)).toBe(30);
    });

    it('defaults to 30 when null', () => {
      expect(validateDuration(null as any)).toBe(30);
    });

    it('accepts string "30"', () => {
      expect(validateDuration('30')).toBe(30);
    });
  });
});
