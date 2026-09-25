/**
 * P3.3 (F15) mass-assignment guard.
 * Services must never spread the raw request body into a create/update —
 * always `pick(body, ALLOWED_*)` so `id`/`_id`/governance flags can't be
 * overwritten by the caller.
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  if (!obj || typeof obj !== 'object') return out;
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k as string];
    if (v !== undefined) (out as Record<string, unknown>)[k as string] = v;
  }
  return out;
}
