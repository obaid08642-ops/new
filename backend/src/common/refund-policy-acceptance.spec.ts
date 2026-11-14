import { BadRequestException } from '@nestjs/common';
import { REFUND_POLICY_REQUIRED_CODE, REFUND_POLICY_VERSION, refundPolicyAcceptance, refundPolicyMissingCount, refundPolicyMode } from './refund-policy-acceptance';

// The refusal tests run with the switch on (REFUND_POLICY_ACCEPTANCE=required, what production gets once the clients send the tick); the default (unset) is `optional`.
describe('refundPolicyAcceptance', () => {
  beforeEach(() => { process.env.REFUND_POLICY_ACCEPTANCE = 'required'; });
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

  it('ROLLOUT: the DEFAULT (unset) and any value but the exact word "required" is optional: a MISSING field passes (nothing stored, counted); false, a string or a number are still refused', () => {
    for (const mode of [undefined, 'optional', 'anything else', 'REQUIRED']) {
      if (mode === undefined) delete process.env.REFUND_POLICY_ACCEPTANCE; else process.env.REFUND_POLICY_ACCEPTANCE = mode;
      expect(refundPolicyMode()).toBe('optional');
      expect(refundPolicyAcceptance({ role: 'patient' }, undefined)).toBeUndefined();
      expect(refundPolicyAcceptance({ role: 'patient' }, null)).toBeUndefined();
      expect(refundPolicyAcceptance({ role: 'patient' }, true, NOW)).toMatchObject({ accepted: true, version: REFUND_POLICY_VERSION });
      for (const v of [false, 'true', 1]) expect(() => refundPolicyAcceptance({ role: 'patient' }, v)).toThrow(REFUND_POLICY_REQUIRED_CODE);
    }
  });
  it('turning it on is config only: REFUND_POLICY_ACCEPTANCE=required makes a missing field a 400', () => {
    process.env.REFUND_POLICY_ACCEPTANCE = 'required';
    expect(refundPolicyMode()).toBe('required');
    expect(() => refundPolicyAcceptance({ role: 'patient' }, undefined)).toThrow(REFUND_POLICY_REQUIRED_CODE);
  });
  it('every patient create without the field is counted (so it is visible when required is safe); ticked, refused and exempt creates are not', () => {
    process.env.REFUND_POLICY_ACCEPTANCE = 'optional';
    const before = refundPolicyMissingCount();
    refundPolicyAcceptance({ role: 'patient' }, undefined);
    refundPolicyAcceptance({ role: 'patient' }, null);
    expect(refundPolicyMissingCount()).toBe(before + 2);
    refundPolicyAcceptance({ role: 'patient' }, true);
    refundPolicyAcceptance({ role: 'admin' }, undefined);
    expect(() => refundPolicyAcceptance({ role: 'patient' }, false)).toThrow();
    expect(refundPolicyMissingCount()).toBe(before + 2);
  });
});
