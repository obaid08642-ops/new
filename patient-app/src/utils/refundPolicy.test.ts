import { readCancellationPolicy, refundPercent } from './refundPolicy';

const policy = { full_hours: 48, half_hours: 6, half_refund_percent: 30 };

describe('refundPolicy', () => {
  it('reads the three numbers of /system-config/public and nothing else', () => {
    expect(readCancellationPolicy({ cancellation_policy: { full_hours: 48, half_hours: 6, half_refund_percent: 30 } })).toEqual(policy);
    expect(readCancellationPolicy({ cancellation_policy: { full_hours: 48 } })).toBeNull();
    expect(readCancellationPolicy({})).toBeNull();
    expect(readCancellationPolicy(null)).toBeNull();
  });

  it('uses the server numbers, not 24 and 12', () => {
    expect(refundPercent(60, policy)).toBe(100);
    expect(refundPercent(48, policy)).toBe(100);
    expect(refundPercent(24, policy)).toBe(30);
    expect(refundPercent(6, policy)).toBe(30);
    expect(refundPercent(5, policy)).toBe(0);
  });

  it('states no percentage while the policy or the time is unknown', () => {
    expect(refundPercent(24, null)).toBeNull();
    expect(refundPercent(null, policy)).toBeNull();
  });
});
