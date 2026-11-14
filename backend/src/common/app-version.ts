/** R12: version comparison for the app gate (same rules as patient-app/src/utils/version.ts: dotted numbers, fail-open on anything unparsable). */
function parts(version: string): number[] {
  return String(version || '').split('.').map((p) => { const n = parseInt(p, 10); return Number.isFinite(n) && n >= 0 ? n : NaN; });
}

/** True when `current` is older than `min`. Unparsable input never blocks. */
export function isVersionBelow(current: string, min?: string): boolean {
  if (!min) return false;
  const a = parts(current); const b = parts(min);
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0; const y = b[i] || 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}
