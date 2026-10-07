/**
 * 15.12 — ship fixes fast and safely: the admin-side control surface.
 *
 * Two honest-presentation problems live on this surface, and both are solved
 * here as pure functions so they are unit-testable without a backend:
 *
 * 1. Remote feature flags. `FeatureFlagsService.isEnabled()` returns `false`
 *    when the flag row is **absent** (absent == disabled), and the admin
 *    `GET governance-controls/feature-flags` only lists rows that exist. The
 *    backend fix is another agent's; the admin must therefore never present an
 *    absent key as "off". `resolveFlagState()` keeps the third state visible.
 *
 * 2. Force-update (`config/app-versions`). The backend `GET` answers
 *    `{ apps: {} }` when nothing was ever saved, which looks identical to a
 *    failed load that left the form empty — and saving that empty form would
 *    PUT `{ apps: {} }`, wiping the force-update config. `canSaveAppVersions()`
 *    and `effectiveAppEnforcement()` keep those states apart.
 */

export interface FlagRow {
  key: string;
  enabled: boolean;
  rollout_percentage?: number;
  updatedAt?: string | null;
  source?: string;
}

export type FlagPresence = 'enabled' | 'disabled' | 'absent';

export interface ResolvedFlag {
  status: FlagPresence;
  /** The stored row, or null when no row exists for this key. */
  row: FlagRow | null;
  /** Operator-facing Arabic note; the absent note never claims "off". */
  note: string;
}

/**
 * Resolve one flag key against the rows the admin list endpoint returned.
 * Matching trims the input; an empty input resolves to absent with a prompt
 * to type a key rather than to any claim about the backend.
 */
export function resolveFlagState(key: string, rows: FlagRow[]): ResolvedFlag {
  const needle = key.trim();
  if (!needle) {
    return { status: 'absent', row: null, note: 'أدخل مفتاح الراية للتحقق من حالتها.' };
  }
  const row = rows.find((candidate) => candidate.key === needle) || null;
  if (!row) {
    return {
      status: 'absent',
      row: null,
      note:
        'لا يوجد سجل بهذا المفتاح — يُقيَّم اليوم لدى العملاء كمعطَّل، ' +
        'ولا يمكن تمييزه عن المعطَّل المسجَّل. أنشئه من نموذج التعديل لجعله explicit.',
    };
  }
  if (row.enabled) {
    return {
      status: 'enabled',
      row,
      note: `مسجَّلة ومفعَّلة · rollout ${Number(row.rollout_percentage ?? 100)}%.`,
    };
  }
  return { status: 'disabled', row, note: 'مسجَّلة ومعطَّلة — هذا إيقاف مقصود وواضح.' };
}

export interface AppVersionEntry {
  min_version?: string;
  latest_version?: string;
  maintenance?: boolean;
  message_ar?: string;
  message_en?: string;
}

export type VersionValidity = 'valid' | 'empty' | 'invalid';

/**
 * Conservative `major.minor.patch` check (optional prerelease suffix). Empty
 * means "not set", which is honest and allowed; anything else that does not
 * parse is flagged as a warning. This never blocks a save — the backend does
 * no format validation and mobile comparators are another agent's domain —
 * so a warning is shown but the operator stays in charge.
 */
export function checkVersionFormat(value: string | undefined): VersionValidity {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'empty';
  return /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(trimmed) ? 'valid' : 'invalid';
}

export interface AppEnforcement {
  /** False when the backend has no entry for this app: clients enforce nothing. */
  configured: boolean;
  maintenance: boolean;
  minVersion: string | null;
  latestVersion: string | null;
  summary: string;
}

/**
 * What clients will actually enforce for one app, derived only from the
 * stored entry. An absent/empty entry is reported as unconfigured — never as
 * "up to date" or "off".
 */
export function effectiveAppEnforcement(app: string, entry: AppVersionEntry | undefined): AppEnforcement {
  const minVersion = (entry?.min_version || '').trim() || null;
  const latestVersion = (entry?.latest_version || '').trim() || null;
  const maintenance = entry?.maintenance === true;
  const configured = minVersion !== null || latestVersion !== null || maintenance;
  if (!configured) {
    return {
      configured: false,
      maintenance: false,
      minVersion: null,
      latestVersion: null,
      summary: `${app}: غير مضبوط — لا يفرض العملاء أي تحديث إجباري ولا وضع صيانة.`,
    };
  }
  const parts: string[] = [];
  parts.push(minVersion ? `التحديث الإجباري أدنى من ${minVersion}` : 'لا تحديث إجباري');
  parts.push(latestVersion ? `الأحدث ${latestVersion}` : 'الأحدث غير محدد');
  parts.push(maintenance ? 'وضع الصيانة مفعَّل' : 'وضع الصيانة متوقف');
  return { configured: true, maintenance, minVersion, latestVersion, summary: `${app}: ${parts.join(' · ')}.` };
}

/**
 * The save guard for the force-update form. Saving is only allowed after one
 * successful load: after a failed (or not-yet-attempted) load the form is
 * empty, and PUT-ing that emptiness would wipe the stored config.
 */
export function canSaveAppVersions(loaded: boolean, saving: boolean): boolean {
  return loaded && !saving;
}
