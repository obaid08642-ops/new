/**
 * Web-to-app link mapping (used by app/+native-intent.tsx → expo-router `redirectSystemPath`).
 *
 * A public web page (https://nabd.plus/{locale}/...) that iOS universal links / Android app links hand
 * to the app is turned into the matching app route, and its locale prefix becomes the app language.
 * Every target here is a real file under patient-app/app (checked by src/__tests__/native-intent.test.ts).
 * Pure module: no React Native imports, so it can be unit-tested and shared with the link checks.
 */

/** The web locale prefixes; they are the app's language codes too (Filipino is `fil` in both). */
export const WEB_LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;
export type WebLocale = (typeof WEB_LOCALES)[number];

/** Hosts that serve the patient web (the hosts in app.json associatedDomains). */
export const WEB_HOSTS = ['nabd.plus', 'www.nabd.plus', 'app.nabd.plus', 'app.nabdahplus.com'] as const;

export type WebLinkTarget = {
  /** The app route (path plus query) expo-router should open. */
  route: string;
  /** The language the link asks for (its locale prefix), or null when the link has none. */
  lang: WebLocale | null;
};

const isWebLocale = (value: string): value is WebLocale => (WEB_LOCALES as readonly string[]).includes(value);

const seg = (value: string): string => encodeURIComponent(value);

/** Map the path segments of a web page (locale already removed) to an app route; null when the app has no mapping. */
export function mapWebSegments(parts: readonly string[]): string | null {
  const [head, a, b] = parts;
  switch (head) {
    case undefined:
      return '/';
    // Medicine detail (alias /medicine/:slug kept from the old mapping)
    case 'p':
    case 'medicine':
      return a ? `/p/${seg(a)}` : '/pharmacy';
    // Catalogue categories: the app's pharmacy hub (its category chips are a fixed set, not the web's names)
    case 'c':
      return '/pharmacy';
    // Doctor profile by slug (/doctor/:slug and /doctor/:slug/:city)
    case 'doctor':
      return a ? `/doctor/${seg(a)}` : '/search?view=doctors';
    // Doctors by specialty and city: the doctor search
    case 'doctors':
      return '/search?view=doctors';
    case 'consultations':
      if (a === 'doctors') return b ? `/consultations/doctor/${seg(b)}` : '/search?view=doctors';
      if (a === 'clinics' && b) return `/consultations/clinic/${seg(b)}`;
      // AC-4: an agent booking hold links to the web booking-status page; open the same screen in the app.
      if (a === 'booking-status') return '/consultations/booking-status';
      return '/consultations';
    case 'facility':
      return a ? `/facility/${seg(a)}` : '/consultations';
    // Pharmacy profile and pharmacies by city: the app has no pharmacy profile screen, so the pharmacy hub.
    // AC-4: an agent pharmacy request links to the web broadcast-status page; open the same screen in the app.
    case 'pharmacy':
      if (a === 'broadcast-status') return '/pharmacy/broadcast-status';
      return '/pharmacy';
    case 'pharmacies':
      return '/pharmacy';
    // Lab tests by city: the diagnostics hub (labs side)
    case 'labs':
      return '/diagnostics';
    // Radiology services by city: the diagnostics hub, radiology side
    case 'radiology':
      return '/diagnostics?tab=radiology';
    case 'diagnostics':
      if (a === 'labs') return b && b !== 'book' ? `/diagnostics/lab/${seg(b)}` : '/diagnostics';
      if (a === 'packages') return b ? `/diagnostics/package-detail?id=${seg(b)}` : '/diagnostics/packages';
      if (a === 'radiology') return b ? `/diagnostics/test-detail?id=${seg(b)}&type=radiology` : '/diagnostics?tab=radiology';
      // AC-4: an agent lab hold links to the web booking page (/diagnostics/bookings/<domain>/<id>);
      // open the diagnostics order screen for the same booking.
      if (a === 'bookings') return parts[3] ? `/diagnostics/order/${seg(parts[3])}` : '/diagnostics';
      return '/diagnostics';
    // Home nursing by city and the nursing catalogue: the nursing hub.
    // AC-4: an agent nursing hold links to the web visit page; open the visit tracking screen.
    case 'home-nursing':
      return '/nursing';
    case 'nursing':
      if (a === 'visits' && b) return `/nursing/live-tracking?type=nurse&bookingId=${seg(b)}`;
      return '/nursing';
    case 'home-care':
      return a === 'services' && b ? `/nursing/service-info?serviceId=${seg(b)}` : '/nursing';
    case 'articles':
      return a ? `/articles/${seg(a)}` : '/articles';
    // Condition guide: the app has no condition screen; open the app search for the condition
    case 'condition':
      return a ? `/search?q=${seg(a.replace(/-/g, ' '))}` : '/search';
    // Non-public links kept from the old mapping
    case 's':
      return a && b ? `/s/${seg(a)}/${seg(b)}` : null;
    case 'services':
      return '/services';
    case 'orders':
      return '/orders';
    // Web /chat redirects to the appointments list; a thread id is not an app appointment id
    case 'chat':
      return '/consultations/appointments';
    case 'family':
      return a === 'join' ? '/family/add?tab=join' : null;
    // Community is removed (owner decision 1): its links open the articles
    case 'community':
      return '/articles';
    default:
      return null;
  }
}

/** Split an incoming URL or path into its scheme kind, path segments and query string. */
function splitIncoming(input: string): { web: boolean; parts: string[]; query: string } {
  let rest = input.trim();
  let web = true;
  const scheme = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(.*)$/i.exec(rest);
  if (scheme) {
    const protocol = scheme[1].toLowerCase();
    if (protocol === 'http' || protocol === 'https') {
      web = (WEB_HOSTS as readonly string[]).includes(scheme[2].toLowerCase());
      rest = scheme[3];
    } else {
      // custom scheme (nabdplus://p/x): the "host" is the first path segment
      web = false;
      rest = `/${scheme[2]}${scheme[3]}`;
    }
  }
  const hashAt = rest.indexOf('#');
  if (hashAt >= 0) rest = rest.slice(0, hashAt);
  const queryAt = rest.indexOf('?');
  const query = queryAt >= 0 ? rest.slice(queryAt + 1) : '';
  const pathname = queryAt >= 0 ? rest.slice(0, queryAt) : rest;
  const parts = pathname.split('/').filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  return { web, parts, query };
}

/** Add the link's own query (e.g. a family invite code) to the target, without overriding the target's params. */
function withQuery(route: string, query: string): string {
  if (!query) return route;
  const queryAt = route.indexOf('?');
  const own = new URLSearchParams(queryAt >= 0 ? route.slice(queryAt + 1) : '');
  const extra = new URLSearchParams();
  new URLSearchParams(query).forEach((value, key) => {
    if (!own.has(key)) extra.append(key, value);
  });
  const qs = extra.toString();
  if (!qs) return route;
  return `${route}${queryAt >= 0 ? '&' : '?'}${qs}`;
}

/**
 * Resolve an incoming system URL. Web links (our https hosts, a bare path, or anything with a locale prefix) are
 * mapped to app routes; other links (the nabdplus:// scheme naming an app route) pass through unchanged except the
 * two retired aliases. A path the map does not know is returned without its locale, so expo-router opens the app
 * route of that name or its +not-found screen.
 */
export function resolveWebLink(input: string): WebLinkTarget {
  const { web, parts, query } = splitIncoming(input);
  const lang = parts.length > 0 && isWebLocale(parts[0]) ? parts[0] : null;
  const rest = lang ? parts.slice(1) : parts;
  const restPath = `/${rest.map(seg).join('/')}`;
  if (web || lang) {
    const mapped = mapWebSegments(rest);
    return { route: withQuery(mapped ?? restPath, query), lang };
  }
  const alias = rest[0] === 'community' || (rest[0] === 'family' && rest[1] === 'join') ? mapWebSegments(rest) : null;
  return { route: withQuery(alias ?? restPath, query), lang: null };
}
