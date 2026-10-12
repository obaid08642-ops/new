import fs from 'fs';
import path from 'path';

import { redirectSystemPath } from '../../app/+native-intent';
import { takeDeepLinkLanguage } from '../navigation/deepLinkLanguage';
import { WEB_LOCALES, mapWebSegments, resolveWebLink } from '../navigation/webLinkMap';
import { APP_LINK_LOCALES, PUBLIC_APP_LINK_PATHS, allAppLinkPatterns } from '../../../patient-web/lib/app-links';

/**
 * Web-to-app deep links: every public web page type, under every locale, opens a route that exists as a file
 * under patient-app/app, and the link's locale becomes the app language. The AASA list (patient-web) and the
 * Android intent filters (app.json) cover exactly the same paths, and every one of them has an app mapping.
 * Slugs and ids below are TEST values.
 */

const APP_DIR = path.resolve(__dirname, '../../app');

/** expo-router file conventions: (group) segments vanish, a trailing index is the folder, [x] is one segment, [...x] the rest. */
function collectRoutes(dir: string, segments: string[] = []): string[][] {
  const routes: string[][] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const next = /^\(.*\)$/.test(entry.name) ? segments : [...segments, entry.name];
      routes.push(...collectRoutes(path.join(dir, entry.name), next));
      continue;
    }
    const match = /^(.*)\.(tsx|ts|jsx|js)$/.exec(entry.name);
    if (!match) continue;
    const name = match[1];
    if (name.startsWith('_') || name.startsWith('+') || name.endsWith('.test') || name.endsWith('.web')) continue;
    routes.push(name === 'index' ? segments : [...segments, name]);
  }
  return routes;
}

const ROUTES = collectRoutes(APP_DIR);

function routeExists(target: string): boolean {
  const pathname = target.split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  return ROUTES.some((route) => {
    if (route.length > 0 && /^\[\.\.\..+\]$/.test(route[route.length - 1])) {
      const fixed = route.slice(0, -1);
      return parts.length > fixed.length && fixed.every((s, i) => /^\[.+\]$/.test(s) || s === parts[i]);
    }
    return route.length === parts.length && route.every((s, i) => /^\[.+\]$/.test(s) || s === parts[i]);
  });
}

/** One example URL per public web page type (path after the locale) and the app route it must open. */
const PUBLIC_TYPES: { web: string; route: string }[] = [
  { web: '', route: '/' },
  { web: '/p/test-medicine', route: '/p/test-medicine' },
  { web: '/c', route: '/pharmacy' },
  { web: '/c/test-category/test-sub', route: '/pharmacy' },
  { web: '/doctor/test-doctor', route: '/doctor/test-doctor' },
  { web: '/doctor/test-doctor/test-city', route: '/doctor/test-doctor' },
  { web: '/consultations/doctors', route: '/search?view=doctors' },
  { web: '/consultations/doctors/doc-1', route: '/consultations/doctor/doc-1' },
  { web: '/doctors/test-specialty/test-city', route: '/search?view=doctors' },
  { web: '/facility/test-facility', route: '/facility/test-facility' },
  { web: '/consultations/clinics/clinic-1', route: '/consultations/clinic/clinic-1' },
  { web: '/pharmacy/test-pharmacy', route: '/pharmacy' },
  { web: '/pharmacies/test-city', route: '/pharmacy' },
  { web: '/labs/test-test/test-city', route: '/diagnostics' },
  { web: '/diagnostics/labs', route: '/diagnostics' },
  { web: '/diagnostics/labs/lab-1', route: '/diagnostics/lab/lab-1' },
  { web: '/diagnostics/packages', route: '/diagnostics/packages' },
  { web: '/diagnostics/packages/pkg-1', route: '/diagnostics/package-detail?id=pkg-1' },
  { web: '/radiology/test-service/test-city', route: '/diagnostics?tab=radiology' },
  { web: '/diagnostics/radiology', route: '/diagnostics?tab=radiology' },
  { web: '/diagnostics/radiology/rad-1', route: '/diagnostics/test-detail?id=rad-1&type=radiology' },
  { web: '/home-nursing/test-city', route: '/nursing' },
  { web: '/nursing/catalog', route: '/nursing' },
  { web: '/home-care/services/svc-1', route: '/nursing/service-info?serviceId=svc-1' },
  { web: '/articles', route: '/articles' },
  { web: '/articles/test-article', route: '/articles/test-article' },
  { web: '/condition/test-condition', route: '/search?q=test%20condition' },
];

beforeEach(() => {
  takeDeepLinkLanguage();
});

describe('redirectSystemPath: public web pages × locales', () => {
  it('the app and the web agree on the six locales', () => {
    expect([...WEB_LOCALES]).toEqual([...APP_LINK_LOCALES]);
  });

  for (const type of PUBLIC_TYPES) {
    for (const locale of WEB_LOCALES) {
      it(`/${locale}${type.web} → ${type.route} in ${locale}`, () => {
        const target = redirectSystemPath({ path: `https://nabd.plus/${locale}${type.web}`, initial: true });
        expect(target).toBe(type.route);
        expect(routeExists(target)).toBe(true);
        expect(takeDeepLinkLanguage()).toBe(locale);
      });
    }
  }

  it('maps on every associated host and keeps the link query', () => {
    for (const host of ['nabd.plus', 'www.nabd.plus', 'app.nabd.plus', 'app.nabdahplus.com']) {
      expect(redirectSystemPath({ path: `https://${host}/en/articles/test-article?utm_source=test`, initial: false })).toBe('/articles/test-article?utm_source=test');
    }
  });
});

describe('redirectSystemPath: other links', () => {
  it('maps non-locale web paths without changing the language', () => {
    expect(redirectSystemPath({ path: 'https://nabd.plus/p/test-medicine', initial: true })).toBe('/p/test-medicine');
    expect(redirectSystemPath({ path: '/doctor/test-doctor', initial: false })).toBe('/doctor/test-doctor');
    expect(takeDeepLinkLanguage()).toBeNull();
  });

  it('keeps the non-public mappings', () => {
    const cases: [string, string][] = [
      ['https://nabd.plus/ar/orders/order-1', '/orders'],
      ['https://nabd.plus/en/chat/thread-1', '/consultations/appointments'],
      ['https://nabd.plus/family/join?code=TEST01', '/family/add?tab=join&code=TEST01'],
      ['nabdplus://family/join?code=TEST01', '/family/add?tab=join&code=TEST01'],
      ['https://nabd.plus/en/community/post-1', '/articles'],
      ['nabdplus://community', '/articles'],
      ['https://nabd.plus/s/doctor/test-doctor', '/s/doctor/test-doctor'],
      ['https://nabd.plus/medicine/test-medicine', '/p/test-medicine'],
    ];
    for (const [url, route] of cases) {
      const target = redirectSystemPath({ path: url, initial: false });
      expect(target).toBe(route);
      expect(routeExists(target)).toBe(true);
    }
  });

  it('passes app-scheme links to app routes through unchanged', () => {
    expect(redirectSystemPath({ path: 'nabdplus://pharmacy/order-tracking?orderId=o-1', initial: false })).toBe('/pharmacy/order-tracking?orderId=o-1');
    expect(redirectSystemPath({ path: 'nabdplus://consultations/doctor/doc-1', initial: false })).toBe('/consultations/doctor/doc-1');
  });

  it('unknown paths drop the locale and fall to the app route of that name or +not-found, never throw', () => {
    expect(redirectSystemPath({ path: 'https://nabd.plus/en/no-such-page/x', initial: true })).toBe('/no-such-page/x');
    expect(takeDeepLinkLanguage()).toBe('en');
    expect(routeExists('/no-such-page/x')).toBe(false);
    expect(fs.existsSync(path.join(APP_DIR, '+not-found.tsx'))).toBe(true);
    expect(redirectSystemPath({ path: 'https://nabd.plus/%E0%A4%A/x', initial: true })).toBe('/%25E0%25A4%25A/x');
    expect(redirectSystemPath({ path: '', initial: true })).toBe('/');
    expect(mapWebSegments(['no-such-page'])).toBeNull();
  });

  it('a link that is not ours keeps its path and sets no language', () => {
    expect(resolveWebLink('https://example.com/en/p/x')).toEqual({ route: '/p/x', lang: 'en' });
    expect(resolveWebLink('https://example.com/settings')).toEqual({ route: '/settings', lang: null });
  });
});

describe('universal links / app links coverage', () => {
  const patterns = allAppLinkPatterns();

  /** A concrete URL path for an AASA pattern ("/x/*" → "/x/test-1"). */
  const sample = (pattern: string) => (pattern.endsWith('/*') ? `${pattern.slice(0, -1)}test-1` : pattern);

  it('every AASA path has an app mapping to an existing route', () => {
    expect(patterns.length).toBe(PUBLIC_APP_LINK_PATHS.reduce((n, e) => n + (e.localeOnly ? 6 : 7), 0));
    for (const pattern of patterns) {
      const parts = sample(pattern).split('/').filter(Boolean);
      const rest = parts.length > 0 && (WEB_LOCALES as readonly string[]).includes(parts[0]) ? parts.slice(1) : parts;
      const mapped = mapWebSegments(rest);
      expect({ pattern, mapped }).toEqual({ pattern, mapped: expect.any(String) });
      expect({ pattern, exists: routeExists(mapped as string) }).toEqual({ pattern, exists: true });
    }
  });

  it('app.json intent filters equal the AASA list on every nabd.plus host', () => {
    const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../app.json'), 'utf8')) as {
      expo: { ios: { associatedDomains: string[] }; android: { intentFilters: { autoVerify?: boolean; data: { scheme: string; host?: string; path?: string; pathPrefix?: string }[] }[] } };
    };
    const expected = patterns.map((p) => (p.endsWith('/*') ? `prefix:${p.slice(0, -1)}` : `path:${p}`)).sort();
    const hosts = appJson.expo.ios.associatedDomains.map((d) => d.replace(/^applinks:/, ''));
    expect(hosts.sort()).toEqual(['app.nabd.plus', 'app.nabdahplus.com', 'nabd.plus', 'www.nabd.plus']);
    const filter = appJson.expo.android.intentFilters.find((f) => f.autoVerify);
    expect(filter).toBeDefined();
    for (const host of hosts) {
      const got = (filter?.data ?? [])
        .filter((d) => d.scheme === 'https' && d.host === host)
        .map((d) => (d.pathPrefix ? `prefix:${d.pathPrefix}` : `path:${d.path}`))
        .sort();
      expect({ host, got }).toEqual({ host, got: expected });
    }
  });
});
