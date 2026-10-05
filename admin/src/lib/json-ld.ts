/**
 * R11 §5 lead 17: JSON.stringify does not escape "<", so a backend string such
 * as "</script><script>…" inside structured data closed the JSON-LD script tag
 * and ran as page script. Escape "<" (and the JS line separators) for the
 * script body.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data ?? null)
    .replace(/</g, '\\u003c')
    .replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));
}
