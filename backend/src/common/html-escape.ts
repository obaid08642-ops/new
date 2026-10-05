/** R11 §5: user text placed in an email's HTML is text, not markup. */
const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
