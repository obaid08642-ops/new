const rec = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

/** The points balance of GET /loyalty/account, only when the server sent a number (a missing field is no value, never 0). */
export function pointsOf(payload: unknown): number | null {
  const root = rec(payload);
  const data = rec(root?.data) ?? root;
  const value = data?.points ?? data?.balance ?? data?.points_balance;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** How many rows a list answer holds (an array, or `{ data | items: [] }`); null when the answer is not a list. */
export function listCount(payload: unknown): number | null {
  if (Array.isArray(payload)) return payload.length;
  const root = rec(payload);
  for (const candidate of [root?.data, root?.items]) if (Array.isArray(candidate)) return candidate.length;
  return null;
}
