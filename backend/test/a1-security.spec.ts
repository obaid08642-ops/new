/**
 * A1 acceptance — pure RBAC primitives (no DB needed).
 * Gate: role hierarchy, reason enforcement, permission sanitization.
 */
import {
  ROLE_HIERARCHY, roleSatisfies, validateReason, ReasonError,
  mergePermissions, sanitizePermissions, CUSTOM_ROLE_KEY_RE,
  MIN_REASON_LENGTH, MIN_FINANCIAL_REASON_LENGTH,
} from '../src/common/rbac';
import { Permission, ROLE_PERMISSIONS, PERMISSION_LABELS_AR } from '../src/common/permissions';

describe('A1 · role hierarchy', () => {
  it('super_admin satisfies @Roles(ADMIN) — the fixed regression', () => {
    expect(roleSatisfies('admin', ['super_admin'])).toBe(true);
    expect(roleSatisfies('ADMIN', ['SUPER_ADMIN'])).toBe(true);
  });
  it('admin does NOT satisfy @Roles(SUPER_ADMIN)', () => {
    expect(roleSatisfies('super_admin', ['admin'])).toBe(false);
  });
  it('provider roles never inherit admin powers', () => {
    expect(roleSatisfies('admin', ['patient'])).toBe(false);
    expect(roleSatisfies('admin', ['doctor', 'pharmacy', 'lab'])).toBe(false);
    expect(roleSatisfies('admin', [])).toBe(false);
  });
  it('identity holds for every role without hierarchy entry', () => {
    expect(roleSatisfies('finance', ['finance'])).toBe(true);
    expect(roleSatisfies('support_agent', ['support_agent'])).toBe(true);
  });
  it('hierarchy map is closed and minimal', () => {
    expect(Object.keys(ROLE_HIERARCHY).sort()).toEqual(['admin', 'super_admin']);
    expect(ROLE_HIERARCHY.super_admin).toEqual(['super_admin', 'admin']);
  });
});

describe('A1 · mandatory reason (plan §2: destructive ⇒ confirm + reason)', () => {
  it('rejects missing/short reasons with coded error', () => {
    for (const bad of ['', '   ', null, undefined, 'ab']) {
      expect(() => validateReason(bad)).toThrow(ReasonError);
    }
    try { validateReason('abc'); } catch (e: any) {
      expect(e.code).toBe(`reason_too_short_min_${MIN_REASON_LENGTH}`);
    }
  });
  it('accepts and normalizes a valid reason', () => {
    expect(validateReason('  patient   requested   cancel  ')).toBe('patient requested cancel');
  });
  it('financial decisions require ≥10 chars', () => {
    expect(() => validateReason('قصير', MIN_FINANCIAL_REASON_LENGTH)).toThrow(ReasonError);
    expect(validateReason('استرداد بعد رفض الخدمة من العميل', MIN_FINANCIAL_REASON_LENGTH)).toBeTruthy();
    expect(isFinite(NaN)).toBe(false); // sanity
  });
});

describe('A1 · dynamic RBAC helpers', () => {
  const CATALOG = Object.values(Permission) as string[];
  it('mergePermissions dedupes across static+dynamic+jwt grants', () => {
    expect(mergePermissions(['a', 'b'], ['b', 'c'], undefined)).toEqual(['a', 'b', 'c']);
  });
  it('sanitizePermissions drops unknown keys and dedupes', () => {
    expect(sanitizePermissions([Permission.ORDER_READ, 'evil.permission', Permission.ORDER_READ], CATALOG))
      .toEqual([Permission.ORDER_READ]);
    expect(sanitizePermissions('not-an-array', CATALOG)).toEqual([]);
  });
  it('custom role key format is strict', () => {
    expect(CUSTOM_ROLE_KEY_RE.test('finance_ops')).toBe(true);
    expect(CUSTOM_ROLE_KEY_RE.test('Bad Key')).toBe(false);
    expect(CUSTOM_ROLE_KEY_RE.test('ab')).toBe(false);
  });
  it('every catalog permission has an Arabic label', () => {
    for (const p of CATALOG) expect(PERMISSION_LABELS_AR[p]).toBeTruthy();
  });
  it('super_admin static matrix covers the full catalog', () => {
    expect(new Set(ROLE_PERMISSIONS.super_admin as any).size).toBe(CATALOG.length);
  });
});
