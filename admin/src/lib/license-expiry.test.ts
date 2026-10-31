import { describe, expect, it } from 'vitest';
import { expiryState, expiryText } from './license-expiry';

describe('licence expiry rows', () => {
  it('classifies expired, urgent and upcoming', () => {
    expect(expiryState({ days_left: -3, expired: true })).toBe('expired');
    expect(expiryState({ days_left: 7, expired: false })).toBe('urgent');
    expect(expiryState({ days_left: 30, expired: false })).toBe('upcoming');
  });
  it('says it in words', () => {
    expect(expiryText({ days_left: -3, expired: true })).toBe('منتهٍ منذ 3 يوم');
    expect(expiryText({ days_left: 0, expired: false })).toBe('ينتهي اليوم');
    expect(expiryText({ days_left: 12, expired: false })).toBe('يتبقى 12 يوم');
  });
});
