/**
 * 15.12 — unit tests for the admin control-surface helpers.
 *
 * The behaviour under test: the admin never presents an absent flag as "off",
 * never presents an unconfigured app as "up to date", and never allows a
 * force-update save before one successful load (a blind save would wipe the
 * stored config).
 */
import { describe, expect, it } from 'vitest';
import {
  canSaveAppVersions,
  checkVersionFormat,
  effectiveAppEnforcement,
  resolveFlagState,
  type FlagRow,
} from '../ops-control';

const ROWS: FlagRow[] = [
  { key: 'checkout.new_flow', enabled: true, rollout_percentage: 50 },
  { key: 'payments.legacy', enabled: false, rollout_percentage: 100 },
];

describe('15.12 — remote flags: absent is never presented as off', () => {
  it('resolves a stored enabled flag with its rollout', () => {
    const resolved = resolveFlagState('checkout.new_flow', ROWS);
    expect(resolved.status).toBe('enabled');
    expect(resolved.row?.key).toBe('checkout.new_flow');
    expect(resolved.note).toContain('50');
  });

  it('resolves a stored disabled flag as an explicit, intentional off', () => {
    const resolved = resolveFlagState('payments.legacy', ROWS);
    expect(resolved.status).toBe('disabled');
    expect(resolved.row).not.toBeNull();
    expect(resolved.note).toContain('معطَّلة');
  });

  it('resolves a missing key as absent and says clients evaluate it as disabled today', () => {
    const resolved = resolveFlagState('kill_switch.never_created', ROWS);
    expect(resolved.status).toBe('absent');
    expect(resolved.row).toBeNull();
    // Honest, not guessing: must not contain the "off" claim used for stored rows.
    expect(resolved.note).toContain('لا يوجد سجل');
    expect(resolved.note).toContain('كمعطَّل');
    expect(resolved.note).toContain('لا يمكن تمييزه');
  });

  it('does not match on surrounding whitespace and asks for a key when empty', () => {
    expect(resolveFlagState('  checkout.new_flow  ', ROWS).status).toBe('enabled');
    const empty = resolveFlagState('   ', ROWS);
    expect(empty.status).toBe('absent');
    expect(empty.row).toBeNull();
  });

  it('resolves absent against an empty list instead of claiming off', () => {
    const resolved = resolveFlagState('anything', []);
    expect(resolved.status).toBe('absent');
    expect(resolved.row).toBeNull();
  });
});

describe('15.12 — force-update: unconfigured is never presented as fine', () => {
  it('reports an absent entry as unconfigured with clients enforcing nothing', () => {
    const enforcement = effectiveAppEnforcement('patient', undefined);
    expect(enforcement.configured).toBe(false);
    expect(enforcement.summary).toContain('غير مضبوط');
    expect(enforcement.summary).toContain('لا يفرض العملاء');
  });

  it('reports an empty entry as unconfigured too', () => {
    expect(effectiveAppEnforcement('provider', {}).configured).toBe(false);
  });

  it('summarises a fully configured app without inventing defaults', () => {
    const enforcement = effectiveAppEnforcement('patient', {
      min_version: '1.4.0',
      latest_version: '1.6.0',
      maintenance: true,
    });
    expect(enforcement.configured).toBe(true);
    expect(enforcement.maintenance).toBe(true);
    expect(enforcement.summary).toContain('1.4.0');
    expect(enforcement.summary).toContain('1.6.0');
    expect(enforcement.summary).toContain('الصيانة مفعَّل');
  });

  it('marks a maintenance-only entry as configured', () => {
    const enforcement = effectiveAppEnforcement('web', { maintenance: true });
    expect(enforcement.configured).toBe(true);
    expect(enforcement.minVersion).toBeNull();
    expect(enforcement.summary).toContain('لا تحديث إجباري');
  });
});

describe('15.12 — version format warnings', () => {
  it('accepts strict semver and prereleases, flags the rest, allows empty', () => {
    expect(checkVersionFormat('1.4.0')).toBe('valid');
    expect(checkVersionFormat('10.20.30-rc.1')).toBe('valid');
    expect(checkVersionFormat('')).toBe('empty');
    expect(checkVersionFormat(undefined)).toBe('empty');
    expect(checkVersionFormat('1.0')).toBe('invalid');
    expect(checkVersionFormat('v1.2.3')).toBe('invalid');
    expect(checkVersionFormat('latest')).toBe('invalid');
  });
});

describe('15.12 — the save guard that prevents a blind wipe', () => {
  it('forbids saving before the first successful load and while saving', () => {
    expect(canSaveAppVersions(false, false)).toBe(false);
    expect(canSaveAppVersions(true, true)).toBe(false);
    expect(canSaveAppVersions(true, false)).toBe(true);
  });
});
