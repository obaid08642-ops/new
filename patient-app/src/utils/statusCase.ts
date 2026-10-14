/**
 * An appointment's server status, compared in one case. The list reads 'confirmed' while the detail and follow-up
 * screens read 'COMPLETED', so every screen asks through these two functions instead of testing a literal.
 */
export function statusCode(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

/** True when the status is one of `codes` (given in any case). */
export function statusIs(raw: unknown, codes: readonly string[]): boolean {
  const s = statusCode(raw);
  return s !== '' && codes.some((code) => statusCode(code) === s);
}
