// R6-5: app version gate helpers (plain JS so provider-app jest runs them).
function parts(version) {
  return String(version || '').split('.').map((part) => {
    const n = parseInt(part, 10);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  });
}

function isVersionBlocked(current, min) {
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

function pickAppConfig(config, appKey) {
  const apps = (config && (config.app_versions?.apps || config.apps)) || {};
  const entry = apps[appKey] || {};
  return {
    min_version: typeof entry.min_version === 'string' ? entry.min_version : undefined,
    latest_version: typeof entry.latest_version === 'string' ? entry.latest_version : undefined,
    maintenance: entry.maintenance === true,
    message_ar: typeof entry.message_ar === 'string' ? entry.message_ar : undefined,
    message_en: typeof entry.message_en === 'string' ? entry.message_en : undefined,
  };
}

module.exports = { isVersionBlocked, pickAppConfig };
