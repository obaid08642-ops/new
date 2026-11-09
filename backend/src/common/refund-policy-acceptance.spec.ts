import { BadRequestException } from '@nestjs/common';
import { REFUND_POLICY_REQUIRED_CODE, REFUND_POLICY_VERSION, refundPolicyAcceptance } from './refund-policy-acceptance';

describe('refundPolicyAcceptance', () => {
  afterEach(() => { delete process.env.REFUND_POLICY_ACCEPTANCE; });
  const NOW = new Date('2026-11-09T10:00:00Z');
  it('a patient who ticked it gets the acceptance with the time and the policy version', () => {
    expect(refundPolicyAcceptance({ role: 'patient' }, true, NOW)).toEqual({ accepted: true, at: NOW, version: REFUND_POLICY_VERSION });
  });
  it('without the tick (missing, false, or anything but boolean true) a patient gets a 400 with a clear code', () => {
    for (const v of [undefined, null, false, 'true', 1, 'yes', {}]) {
      expect(() => refundPolicyAcceptance({ role: 'patient' }, v)).toThrow(new BadRequestException(REFUND_POLICY_REQUIRED_CODE));
    }
    expect(REFUND_POLICY_REQUIRED_CODE).toBe('refund_policy_acceptance_required');
  });
  it('a missing role is treated as a patient (not exempt)', () => {
    expect(() => refundPolicyAcceptance(undefined, undefined)).toThrow(REFUND_POLICY_REQUIRED_CODE);
    expect(() => refundPolicyAcceptance({}, false)).toThrow(REFUND_POLICY_REQUIRED_CODE);
  });
  it('admin and system creates are exempt (back office, seeding): nothing stored', () => {
    for (const role of ['admin', 'super_admin', 'system', 'ADMIN']) expect(refundPolicyAcceptance({ role }, undefined)).toBeUndefined();
  });

  it('ROLLOUT SWITCH: with REFUND_POLICY_ACCEPTANCE=optional a MISSING field passes (nothing stored); false, a string or a number are still refused; the default is required', () => {
    process.env.REFUND_POLICY_ACCEPTANCE = 'optional';
    expect(refundPolicyAcceptance({ role: 'patient' }, undefined)).toBeUndefined();
    expect(refundPolicyAcceptance({ role: 'patient' }, null)).toBeUndefined();
    expect(refundPolicyAcceptance({ role: 'patient' }, true, NOW)).toMatchObject({ accepted: true, version: REFUND_POLICY_VERSION });
    for (const v of [false, 'true', 1]) expect(() => refundPolicyAcceptance({ role: 'patient' }, v)).toThrow(REFUND_POLICY_REQUIRED_CODE);
    delete process.env.REFUND_POLICY_ACCEPTANCE;
    expect(() => refundPolicyAcceptance({ role: 'patient' }, undefined)).toThrow(REFUND_POLICY_REQUIRED_CODE);
    process.env.REFUND_POLICY_ACCEPTANCE = 'anything else';
    expect(() => refundPolicyAcceptance({ role: 'patient' }, undefined)).toThrow(REFUND_POLICY_REQUIRED_CODE);   // only the exact word "optional" relaxes it
  });
});
