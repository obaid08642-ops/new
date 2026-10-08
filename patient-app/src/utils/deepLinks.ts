/**
 * The curated sections of Home (GET /content/home) carry an admin-typed `deep_link` per card. The backend keeps
 * whatever string was typed (cut to 160 characters, no check against the app's routes), so the app decides what a
 * tap may open: an internal path of the app that starts with one of its own sections, and nothing else. A mistyped
 * path, an external URL, a scheme (`javascript:`, `http:`) or a protocol-relative `//host` is not a link: the card
 * is drawn, but it does not navigate.
 */

/** The first path segment of every section a curated card may open: each is a folder or file of `app/`. */
export const DEEP_LINK_SECTIONS: readonly string[] = [
  '(tabs)', 'ai', 'ai-assistant', 'articles','consultations', 'delivery', 'diagnostics', 'doctor',
  'drug-scanner', 'emergency', 'facility', 'family', 'health', 'insurance', 'loyalty', 'map', 'maternity', 'medicine',
  'mental-health', 'notifications', 'nursing', 'nutrition', 'offers', 'orders', 'payments', 'pharmacy', 'profile',
  'programs', 'reports', 'returns', 'reviews', 'search', 'services', 'settings', 'support', 'voice', 'wearables',
];

/** The link itself when it is a known internal path of the app, otherwise null. */
export function internalRoute(link: unknown): string | null {
  if (typeof link !== 'string') return null;
  const value = link.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\s\\]|:\/\//.test(value)) return null;
  const path = value.split(/[?#]/)[0];
  const first = path.split('/').filter(Boolean)[0];
  return first && DEEP_LINK_SECTIONS.includes(first) ? value : null;
}
