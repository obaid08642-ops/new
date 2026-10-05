/**
 * 14.18 — Kill switches over the EXISTING flag stores.
 *
 * A kill switch is an explicit `enabled: false` row. A MISSING row means
 * "not killed": a feature is never switched off because nobody created its
 * flag yet (the live stores start empty). An outage of the flag store also
 * resolves to the caller default (not killed unless the caller says so).
 *
 * The source must be tri-state: `getFlag(key)` returns `true`/`false` for a
 * row and `null`/`undefined` when there is none. `FeatureFlagsService.isEnabled`
 * is deliberately NOT accepted: it returns `false` for an absent flag, which
 * would read as "killed".
 *
 * Wired at: `AiGatewayService.generate` (feature `ai`, flag `ai_gateway_enabled`).
 */

export interface KillSwitchSource {
  getFlag?(key: string): Promise<boolean | null | undefined>;
  getSystemConfig?(key: string): Promise<unknown>;
}

/** Features that consult a kill switch, and the flag key each reads. */
export const KILLSWITCH_FEATURES = {
  ai: 'ai_gateway_enabled',
} as const;

export type KillswitchFeature = keyof typeof KILLSWITCH_FEATURES;

/**
 * Normalize the existing flag row shapes (`{ key, enabled }`,
 * `{ flagName, isEnabled }`, kill_switches entries `{ key, value }`) to a
 * boolean. Returns `null` when the row carries no recognizable enabled field.
 */
export function normalizeFlagRow(row: unknown): boolean | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  if (typeof r.enabled === 'boolean') return r.enabled;
  if (typeof r.isEnabled === 'boolean') return r.isEnabled;
  if (typeof r.value === 'boolean') return r.value;
  return null;
}

async function readFlag(key: string, source: KillSwitchSource): Promise<boolean | null> {
  if (!source || typeof source.getFlag !== 'function') return null;
  try {
    const v = await source.getFlag(key);
    return typeof v === 'boolean' ? v : null;
  } catch {
    return null; // Flag-store outage must not break the request path.
  }
}

/**
 * True only when the feature is explicitly disabled. Absent flag or store
 * error => `opts.default` (default `false` = not killed).
 */
export async function isKilled(
  feature: KillswitchFeature | string,
  source: KillSwitchSource,
  opts: { default?: boolean } = {},
): Promise<boolean> {
  const def = opts.default ?? false;
  const key = (KILLSWITCH_FEATURES as Record<string, string>)[feature] ?? feature;
  if (!key) return def;
  const fromFlags = await readFlag(key, source);
  if (fromFlags !== null) return !fromFlags;
  if (source && typeof source.getSystemConfig === 'function') {
    try {
      const doc = await source.getSystemConfig('kill_switches');
      const list = Array.isArray(doc) ? doc : (doc as { value?: unknown } | null)?.value;
      if (Array.isArray(list)) {
        const entry = list.find((e: unknown) => !!e && typeof e === 'object' && (e as { key?: unknown }).key === key);
        const v = normalizeFlagRow(entry);
        if (v !== null) return !v;
      }
    } catch {
      // Store outage: caller default.
    }
  }
  return def;
}
