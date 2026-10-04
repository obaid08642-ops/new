// Pure web-to-app path mapping (no React Native imports — testable in Jest).
// Used by app/+native-intent.tsx (redirectSystemPath) and the deep-link table test.

const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];

/** Strip the locale prefix from a web path. */
export function stripLocale(path: string): string {
  const parts = path.replace(/^\//, '').split('/');
  if (parts.length > 1 && LOCALES.includes(parts[0])) return '/' + parts.slice(1).join('/');
  return path;
}

/**
 * Map a web path to an EXISTING app route. Returns null if no app screen
 * exists — the caller must open the browser in that case, never +not-found.
 */
export function mapPath(path: string): string | null {
  const clean = stripLocale(path);
  const parts = clean.replace(/^\//, '').split('/').filter(Boolean);

  if (parts[0] === 'p' && parts[1]) return `/p/${parts[1]}`;
  if (parts[0] === 'medicine' && parts[1]) return `/medicine/${parts[1]}`;
  if (parts[0] === 'doctor' && parts[1]) return `/doctor/${parts[1]}`;
  if (parts[0] === 'facility' && parts[1]) return `/facility/${parts[1]}`;
  if (parts[0] === 's' && parts[1] && parts[2]) return `/s/${parts[1]}/${parts[2]}`;
  if (parts[0] === 'articles') return parts[1] ? `/articles/${parts[1]}` : '/articles';
  if (parts[0] === 'services' && !parts[1]) return '/services';
  if (parts[0] === 'family' && parts[1] === 'join') return '/family/join';

  return null;
}
