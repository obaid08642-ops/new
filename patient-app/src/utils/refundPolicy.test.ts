import { readCancellationPolicy } from './refundPolicy';

const policy = { full_hours: 48, half_hours: 6, half_refund_percent: 30 };

describe('refundPolicy', () => {
  it('reads the three numbers of /system-config/public and nothing else', () => {
    expect(readCancellationPolicy({ cancellation_policy: { full_hours: 48, half_hours: 6, half_refund_percent: 30 } })).toEqual(policy);
    expect(readCancellationPolicy({ cancellation_policy: { full_hours: 48 } })).toBeNull();
    expect(readCancellationPolicy({})).toBeNull();
    expect(readCancellationPolicy(null)).toBeNull();
  });
});
