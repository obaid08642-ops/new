import { mapPath, stripLocale } from '../../src/navigation/deepLinkMapper';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function appFile(pathname: string): string {
  // Map dynamic route patterns to their actual files
  const dynamicMap: Record<string, string> = {
    '/s/medicine/abc': 's/[type]/[slug].tsx',
    '/p/abc': 'p/[slug].tsx',
    '/medicine/abc': 'medicine/[slug].tsx',
    '/doctor/xyz': 'doctor/[slug].tsx',
    '/facility/f1': 'facility/[slug].tsx',
    '/articles/xyz': 'articles/[slug].tsx',
    '/articles': 'articles/index.tsx',
    '/services': 'services/index.tsx',
  };
  const file = dynamicMap[pathname] || `${pathname.replace(/^\/+/, '')}.tsx`;
  return resolve(__dirname, '..', file);
}

describe('[7E.D2] deep-link table test', () => {
  it('strips locale prefixes', () => {
    expect(stripLocale('/ar/p/abc')).toBe('/p/abc');
    expect(stripLocale('/en/doctor/xyz')).toBe('/doctor/xyz');
    expect(stripLocale('/p/abc')).toBe('/p/abc');
  });

  it.each([
    ['/p/abc', '/p/abc'],
    ['/medicine/abc', '/medicine/abc'],
    ['/doctor/xyz', '/doctor/xyz'],
    ['/facility/f1', '/facility/f1'],
    ['/s/medicine/abc', '/s/medicine/abc'],
    ['/articles/xyz', '/articles/xyz'],
    ['/articles', '/articles'],
    ['/services', '/services'],
    ['/family/join', '/family/join'],
    ['/ar/p/abc', '/p/abc'],
    ['/en/doctor/xyz', '/doctor/xyz'],
  ])('maps %s to existing app route %s', (webPath, appPath) => {
    expect(mapPath(webPath)).toBe(appPath);
    expect(existsSync(appFile(appPath))).toBe(true);
  });

  it.each([
    '/condition/abc',
    '/doctors',
    '/home-nursing',
    '/pharmacies/riyadh',
    '/labs',
    '/radiology',
    '/c/meds',
    '/chat/123',
    '/orders/456',
    '/diagnostics',
    '/community',
    '/consultations',
    '/nursing',
    '/pharmacy/abc',
  ])('returns null for web-only route %s (browser opens)', (webPath) => {
    expect(mapPath(webPath)).toBeNull();
  });
});
