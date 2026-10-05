// 7d27a4e / R18: the patient app handles the nabdplus:// scheme (app.json
// expo.scheme) for every host the website's nabd-links fallback table knows,
// routing each to an existing app screen, or to the website when the app has
// no such screen. Expo Router calls app/+native-intent.tsx for every link.
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Linking } from 'react-native';
jest.mock('expo-router', () => ({ Redirect: () => null }));

import { redirectSystemPath } from '../app/+native-intent';
import { resolveIncomingLink } from '../src/navigation/deepLinkMapper';

const APP = join(__dirname, '..', 'app');
const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

/** True when an expo-router route file serves this path (groups like (tabs) are transparent). */
function routeExists(path: string): boolean {
  const segs = path.split('?')[0].split('/').filter(Boolean);
  const walk = (dir: string, rest: string[]): boolean => {
    if (!existsSync(dir)) return false;
    const groups = require('fs').readdirSync(dir).filter((n: string) => /^\(.+\)$/.test(n));
    if (rest.length === 0) {
      if (existsSync(join(dir, 'index.tsx'))) return true;
      return groups.some((g: string) => walk(join(dir, g), rest));
    }
    const [head, ...tail] = rest;
    const entries: string[] = require('fs').readdirSync(dir);
    const dyn = entries.filter((n) => /^\[.+\]$/.test(n) || /^\[.+\]\.tsx$/.test(n));
    if (tail.length === 0 && (existsSync(join(dir, `${head}.tsx`)) || dyn.some((n) => n.endsWith('.tsx')))) return true;
    if (existsSync(join(dir, head)) && walk(join(dir, head), tail)) return true;
    if (dyn.some((n) => !n.endsWith('.tsx') && walk(join(dir, n), tail))) return true;
    return groups.some((g: string) => walk(join(dir, g), rest));
  };
  return walk(APP, segs);
}

describe('nabdplus:// scheme (R18)', () => {
  beforeEach(() => mockOpenURL.mockClear());

  it('the app registers the scheme the links use', () => {
    const app = JSON.parse(readFileSync(join(__dirname, '..', 'app.json'), 'utf8'));
    expect(app.expo.scheme).toBe('nabdplus');
  });

  it.each([
    ['nabdplus://doctor/dr-reem', '/doctor/dr-reem'],
    ['nabdplus://doctor/en/dr-reem', '/doctor/dr-reem'],
    ['nabdplus://facility/kfsh', '/facility/kfsh'],
    ['nabdplus://p/panadol-500?ref=sms', '/p/panadol-500?ref=sms'],
    ['nabdplus://medicine/abc', '/medicine/abc'],
    ['nabdplus://s/doctor/dr-reem', '/s/doctor/dr-reem'],
    ['nabdplus://articles/sleep', '/articles/sleep'],
    ['nabdplus://consultations', '/consultations'],
    ['nabdplus://doctors', '/consultations'],
    ['nabdplus://labs', '/diagnostics'],
    ['nabdplus://radiology', '/diagnostics'],
    ['nabdplus://nursing', '/nursing'],
    ['nabdplus://home-nursing/riyadh', '/nursing'],
    ['nabdplus://pharmacy', '/pharmacy'],
    ['nabdplus://pharmacies/riyadh', '/pharmacy'],
    ['nabdplus://services', '/services'],
  ])('%s opens the app screen %s', async (link, expected) => {
    expect(resolveIncomingLink(link)).toEqual({ app: expected });
    await expect(redirectSystemPath({ path: link, initial: true })).resolves.toBe(expected);
    expect(mockOpenURL).not.toHaveBeenCalled();
    expect(routeExists(expected)).toBe(true);
  });

  it('a link with no app screen opens the website page', async () => {
    await expect(redirectSystemPath({ path: 'nabdplus://condition/diabetes', initial: false })).resolves.toBe('/');
    expect(mockOpenURL).toHaveBeenCalledWith('https://nabd.plus/condition/diabetes');
  });

  it('a https link to a website listing keeps opening the website (only the app scheme opens the tab)', () => {
    expect(resolveIncomingLink('https://nabd.plus/ar/labs')).toEqual({ browser: 'https://nabd.plus/ar/labs' });
    expect(resolveIncomingLink('nabdplus://labs')).toEqual({ app: '/diagnostics' });
  });

  it('never routes to admin or api paths', () => {
    expect(resolveIncomingLink('nabdplus://admin/users')).toEqual({ browser: 'https://nabd.plus/admin/users' });
  });
});
