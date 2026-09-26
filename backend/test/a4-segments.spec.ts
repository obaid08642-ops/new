/**
 * Segments DSL compiler — pure-function gate.
 */
import { compileSegment, compileRule, isAllowedField } from '../src/modules/admin-enterprise/segments.engine';

describe('segments engine', () => {
  it('compiles a single rule with the patient fence', () => {
    expect(compileSegment({ rules: [{ field: 'city', op: 'eq', value: 'الرياض' }] }))
      .toEqual({ role: 'patient', city: 'الرياض' });
  });

  it('all → $and, any → $or across multiple rules', () => {
    const def = { match: 'any' as const, rules: [
      { field: 'city', op: 'eq' as const, value: 'جدة' },
      { field: 'verified', op: 'eq' as const, value: true },
    ] };
    const q = compileSegment(def);
    expect(q.$or).toHaveLength(2);
    expect(q.role).toBe('patient');
  });

  it('between normalizes bounds for dates and numbers', () => {
    const r = compileRule({ field: 'createdAt', op: 'between', value: '2026-03-10', value2: '2026-03-01' });
    const c = r.createdAt as any;
    expect(c.$gte.getTime()).toBeLessThanOrEqual(c.$lte.getTime());
    const n = compileRule({ field: 'bookings_total', op: 'between', value: 5, value2: 1 });
    expect(n.bookings_total).toEqual({ $gte: 1, $lte: 5 });
  });

  it('contains escapes regex metacharacters', () => {
    const r = compileRule({ field: 'acquisition_source', op: 'contains', value: 'tik.(' });
    expect((r.acquisition_source as any).$regex).toBe('tik\\.\\(');
  });

  it('privacy fence rejects non-whitelisted fields (PII like phone/full_name)', () => {
    expect(() => compileSegment({ rules: [{ field: 'phone', op: 'exists', value: true }] })).toThrow('forbidden_field:phone');
    expect(() => compileSegment({ rules: [{ field: 'password_hash', op: 'exists', value: true }] })).toThrow();
    expect(isAllowedField('full_name')).toBe(false);
    expect(isAllowedField('wallet_balance')).toBe(true);
  });

  it('rejects empty definitions and unsupported ops', () => {
    expect(() => compileSegment({ rules: [] })).toThrow('segment_rules_required');
    expect(() => compileRule({ field: 'city', op: 'regex_inject' as any })).toThrow('unsupported_op');
  });
});
