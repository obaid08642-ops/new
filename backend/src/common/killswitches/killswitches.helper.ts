/**
 * 14.18 — Kill-switch / degraded-mode helper (read-only over EXISTING stores).
 *
 * MAPPING (do NOT create a new flag store; do NOT modify these — read only):
 * - Canonical flags: `feature_flags` collection.
 *   Schema: `backend/src/schemas/feature-flag.schema.ts`
 *     ({ flagName, isEnabled }) — NOTE: the sibling module-local schema at
 *     `backend/src/modules/feature-flags/feature-flag.schema.ts` uses a
 *     DIFFERENT shape ({ key, enabled }). This helper duck-types both.
 *   Canonical reader: `FeatureFlagsService.isEnabled(key)`
 *     (`backend/src/modules/feature-flags/feature-flags.service.ts`) —
 *     fail-OPEN on absent (absent flag => null, so isKilled falls back to the
 *     caller default = not killed). An absent row must NEVER read as
 *     "explicitly disabled", or every kill switch would fire before seeding.
 *   Public surface: `GET /config` (`ConfigService.getClientConfig()` merges
 *     env baseline + `feature_flags` rows incl. `rollout_percentage`) and
 *     public `GET /feature-flags`. Admin toggle: `POST admin/feature-flags/:key`.
 * - Kill switches: `system_configs` doc `{ key: 'kill_switches', value: [...] }`
 *   (SystemConfig schema: `backend/src/schemas/system-config.schema.ts`,
 *   collection `system_configs`). Each entry:
 *   `{ id, name, key, value, description, danger }` where `value: true`
 *   means the capability is ON. Admin-managed via `KillSwitchesController`
 *   (`GET`/`POST :key /kill-switches` in
 *   `backend/src/modules/admin/governance/admin-governance.module.ts`).
 * - Per-app maintenance banner: `system_configs` doc `{ key: 'app_versions',
 *   value: { apps: { patient|provider|driver|pharmacy|web:
 *   { min_version, latest_version, maintenance, message_ar, message_en } } } }`.
 *   Read fail-open in `ConfigService.getClientConfig()`; admin-managed via
 *   `PUT app-versions` in
 *   `backend/src/modules/admin/web-core/controllers/admin-config.controller.ts`.
 *
 * WIRING (how each consumer degrades — implement at the call site, not here):
 * - AI (`ai_symptom_checker` flag): when killed, skip the AI call and return
 *   the static safe fallback (no LLM request, no billing).
 * - Recommendations: when killed, return the non-personalized default list
 *   (e.g. popular/nearby) instead of the recommender output.
 * - Nudges: when killed, skip enqueueing/sending; drop silently with a counter.
 * - Live map: when killed, serve the last-cached snapshot / static list and
 *   hide realtime markers on clients via the `features` map from `/config`.
 * - Analytics ingestion: when killed, short-circuit the ingest path (accept
 *   and drop, or 202-noop) so producers never backpressure.
 * - Search suggestions: when killed, return only direct matches (no
 *   suggestion expansion / no external suggester call).
 * - Per-app maintenance banner hook: clients read `app_versions.apps[app]`
 *   from `GET /config`; when `maintenance === true`, render the banner with
 *   `message_ar`/`message_en` and block mutating actions for that app.
 *
 * DESIGN: this module is dependency-free on purpose — it takes a minimal
 * duck-typed `KillSwitchSource` (mirrors the existing readers above) so
 * callers pass `FeatureFlagsService`, a raw mongoose `Connection`, or a
 * `{ getSystemConfig }` adapter. All reads are fail-open to the caller
 * default (degraded modes must never take down the request path when the
 * flag store itself is unavailable).
 */

/** Minimal reader mirroring `FeatureFlagsService.isEnabled(key)`. */
export interface FeatureFlagReader {
  isEnabled(key: string): Promise<boolean | null | undefined>;
}

/** Minimal reader for `system_configs` docs (e.g. `kill_switches`, `app_versions`). */
export interface SystemConfigReader {
  getSystemConfig(key: string): Promise<any>;
}

/**
 * Duck-typed flag source. Accepts any object exposing one of:
 * - `isEnabled(key)` (existing `FeatureFlagsService` shape), and/or
 * - `getSystemConfig(key)` (adapter over the `system_configs` collection).
 * Never imports sibling modules — keeps this helper decoupled from them.
 */
export type KillSwitchSource = Partial<FeatureFlagReader & SystemConfigReader>;

/** Known degraded-mode features and the existing flag key each reads. */
export const KILLSWITCH_FEATURES = {
  ai: 'ai_symptom_checker',
  recommendations: 'recommendations_enabled',
  nudges: 'nudges_enabled',
  liveMap: 'live_map_enabled',
  analyticsIngestion: 'analytics_ingestion_enabled',
  searchSuggestions: 'search_suggestions_enabled',
} as const;

export type KillswitchFeature = keyof typeof KILLSWITCH_FEATURES;

/** Apps carrying a per-app maintenance entry under `app_versions.apps`. */
export const MAINTENANCE_APPS = [
  'patient',
  'provider',
  'driver',
  'pharmacy',
  'web',
] as const;

export type MaintenanceApp = (typeof MAINTENANCE_APPS)[number];

/**
 * Apply a caller default when the flag store yields absent/undefined.
 * Mirrors the existing convention: `ConfigService` fails OPEN (absent =>
 * no enforcement) and `FeatureFlagsService.isEnabled` yields null when the
 * row is absent (so isKilled below fails open to "not killed") — the caller
 * picks via `def`.
 */
export function withFlagDefault<T>(value: T | null | undefined, def: T): T {
  return value === null || value === undefined ? def : value;
}

/**
 * Normalize the two existing `feature_flags` row shapes
 * (`{ key, enabled }` vs `{ flagName, isEnabled }`) to a boolean.
 * Returns `null` when the row carries no recognizable enabled field.
 */
export function normalizeFlagRow(
  row: any,
): boolean | null {
  if (!row || typeof row !== 'object') return null;
  if (typeof row.enabled === 'boolean') return row.enabled;
  if (typeof row.isEnabled === 'boolean') return row.isEnabled;
  if (typeof row.value === 'boolean') return row.value;
  return null;
}

/**
 * Resolve one raw flag key against the source.
 * Returns `null` when the source has no such reader/row (caller default applies).
 */
export async function readFlag(
  key: string,
  source: KillSwitchSource,
): Promise<boolean | null> {
  if (!source || typeof source.isEnabled !== 'function') return null;
  try {
    const v = await source.isEnabled(key);
    return v === null || v === undefined ? null : !!v;
  } catch {
    return null; // Flag-store outage must not break the request path (fail-open here).
  }
}

/**
 * Duck-typed flag source over a raw mongoose Connection. Reads the SAME
 * `featureflags` collection (`{ key, enabled }` rows) that
 * FeatureFlagsService owns, normalizing both row shapes via
 * normalizeFlagRow. Absent row / missing collection / store error => null
 * (fail-open upstream). For services that already hold a Connection and
 * should not take a module dependency on FeatureFlagsModule.
 */
export function connectionFlagSource(
  conn: { collection?: (name: string) => any } | null | undefined,
): KillSwitchSource {
  return {
    isEnabled: async (key: string) => {
      try {
        const col = conn?.collection?.('featureflags');
        if (!col || typeof col.findOne !== 'function') return null;
        return normalizeFlagRow(await col.findOne({ key: { $eq: key } }));
      } catch {
        return null;
      }
    },
  };
}

/**
 * True when the named degraded-mode feature is killed (explicitly disabled
 * in the EXISTING `feature_flags` store). Absent flag / store error =>
 * `opts.default` (default `false` = not killed, i.e. fail-open).
 */
export async function isKilled(
  feature: KillswitchFeature | string,
  source: KillSwitchSource,
  opts: { default?: boolean } = {},
): Promise<boolean> {
  const def = opts.default ?? false;
  const key =
    (KILLSWITCH_FEATURES as Record<string, string>)[feature] ?? feature;
  if (!key) return def;
  // 1) Canonical `feature_flags` store via the existing reader.
  const fromFlags = await readFlag(key, source);
  if (fromFlags !== null) return !fromFlags;
  // 2) Fallback: `system_configs` doc `kill_switches` list entry `{ key, value }`.
  if (source && typeof source.getSystemConfig === 'function') {
    try {
      const doc = await source.getSystemConfig('kill_switches');
      const list = Array.isArray(doc) ? doc : doc?.value;
      if (Array.isArray(list)) {
        const entry = list.find((e: any) => e && e.key === key);
        const v = normalizeFlagRow(entry);
        if (v !== null) return !v;
      }
    } catch {
      // Fail-open to caller default.
    }
  }
  return def;
}

/**
 * Per-app maintenance banner hook. Reads the EXISTING
 * `system_configs`/`app_versions` doc shape (see mapping above).
 * Returns `{ maintenance, message_ar, message_en }`; absent config =>
 * `{ maintenance: false }` (fail-open: no banner).
 */
export async function getAppMaintenance(
  app: MaintenanceApp | string,
  source: KillSwitchSource,
): Promise<{ maintenance: boolean; message_ar?: string; message_en?: string }> {
  if (source && typeof source.getSystemConfig === 'function') {
    try {
      const doc = await source.getSystemConfig('app_versions');
      const apps = doc?.value?.apps ?? doc?.apps;
      const entry = apps?.[app];
      if (entry && typeof entry === 'object') {
        return {
          maintenance: entry.maintenance === true,
          message_ar:
            typeof entry.message_ar === 'string' ? entry.message_ar : undefined,
          message_en:
            typeof entry.message_en === 'string' ? entry.message_en : undefined,
        };
      }
    } catch {
      // Fail-open: no banner when the store is unavailable.
    }
  }
  return { maintenance: false };
}

/**
 * Convenience: true when the app banner must render for `app`.
 */
export async function isAppInMaintenance(
  app: MaintenanceApp | string,
  source: KillSwitchSource,
): Promise<boolean> {
  return (await getAppMaintenance(app, source)).maintenance === true;
}
