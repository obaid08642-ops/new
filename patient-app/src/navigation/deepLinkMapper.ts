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

/**
 * Expo Router hands redirectSystemPath a `path` that may be a bare path, a full
 * https://nabd.plus URL or a nabdplus:// link (docs: "no guarantee that this is a
 * path or a valid URL"). Resolve it to an app route, or to the web URL to open in
 * the browser when the app has no such screen.
 */
export function resolveIncomingLink(raw: string): { app: string } | { browser: string } {
  let path = raw || '/';
  let search = '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    try {
      const u = new URL(path);
      // nabdplus://doctor/x puts "doctor" in the host; https keeps it in the pathname.
      path = u.protocol === 'https:' || u.protocol === 'http:' ? u.pathname : `/${u.host}${u.pathname}`;
      search = u.search;
    } catch {
      path = '/';
    }
  }
  if (!path.startsWith('/')) path = `/${path}`;
  const mapped = mapPath(path);
  if (mapped) return { app: mapped + search };
  return { browser: `https://nabd.plus${path}${search}` };
}
