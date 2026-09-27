/** R6-5: app version gate helpers (pure, unit-tested). */

export type AppVersionConfig = {
  min_version?: string;
  latest_version?: string;
  maintenance?: boolean;
  message_ar?: string;
  message_en?: string;
};

function parts(version: string): number[] {
  return String(version || '')
    .split('.')
    .map((part) => {
      const n = parseInt(part, 10);
      return Number.isFinite(n) && n >= 0 ? n : NaN;
    });
}

/** True when current < min (fail-open on unparsable values). */
export function isVersionBlocked(current: string, min?: string): boolean {
  if (!min) return false;
  const a = parts(current);
  const b = parts(min);
  if (a.some((n) => Number.isNaN(n)) || b.some((n) => Number.isNaN(n))) return false;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}

export function pickAppConfig(config: any, appKey: string): AppVersionConfig {
  const apps = config?.app_versions?.apps || config?.apps || {};
  const entry = apps[appKey] || {};
  return {
    min_version: typeof entry.min_version === 'string' ? entry.min_version : undefined,
    latest_version: typeof entry.latest_version === 'string' ? entry.latest_version : undefined,
    maintenance: entry.maintenance === true,
    message_ar: typeof entry.message_ar === 'string' ? entry.message_ar : undefined,
    message_en: typeof entry.message_en === 'string' ? entry.message_en : undefined,
  };
}
