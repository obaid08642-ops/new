import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { DEEP_LINK_SECTIONS, internalRoute } from './deepLinks';

const APP = join(__dirname, '..', '..', 'app');

describe('curated deep links: known internal routes only', () => {
  it('every section of the allow-list is a folder or file of the app', () => {
    for (const section of DEEP_LINK_SECTIONS) {
      expect([join(APP, section), join(APP, `${section}.tsx`)].some((p) => existsSync(p))).toBe(true);
    }
  });

  it.each(['/offers/abc', '/consultations/appointments', '/(tabs)/pharmacy', '/search?view=doctors&specialty=dentistry', '/loyalty/hub', '/articles/diabetes#top'])(
    '%s opens',
    (link) => {
      expect(internalRoute(link)).toBe(link);
    },
  );

  it.each([
    'https://evil.example/phish',
    'http://nabd.plus',
    '//evil.example',
    'javascript:alert(1)',
    'nabdplus://pay',
    'offers/abc', // no leading slash
    '/not-a-section/abc',
    '/(auth)/login', // auth screens are not curated targets
    '/offers/a b',
    '/offers\\x',
    '/',
    '',
    '   ',
    undefined,
    null,
    42,
    { href: '/offers/1' },
  ])('%p does not open', (link) => {
    expect(internalRoute(link)).toBeNull();
  });

  it('trims a link typed with spaces around it', () => {
    expect(internalRoute('  /offers/1  ')).toBe('/offers/1');
  });
});
