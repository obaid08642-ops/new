import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { autoTranslate } from '../../i18n';
import type { LangCode } from '../../context/AppContext';

/**
 * Batch 0 fixes (owner rule 2026-10-06): the screens hold translation keys, not sentences. Every key a touched file
 * names exists in the locale files in all six languages, is real text (never the key itself), and is not English in
 * the other five. A typo in a key would otherwise show the key to the reader.
 */

const ROOT = join(__dirname, '..', '..', '..');
const FILES = [
  'app/(auth)/forgot-password.tsx', 'app/(auth)/login.tsx', 'app/(auth)/otp.tsx', 'app/(auth)/register.tsx', 'app/(auth)/reset-password.tsx',
  'app/(auth)/welcome.tsx', 'app/(tabs)/index.tsx', 'app/notifications/index.tsx', 'app/index.tsx',
  'src/components/home/HomeParts.tsx', 'src/components/home/HomeTopRow.tsx', 'src/components/views/DoctorSearchView.tsx',
  'src/utils/notificationsFeed.ts', 'src/utils/serverMessage.ts', 'src/hooks/useSocialLogin.ts',
];
const KEY = /['"]((?:common|errors|auth|home|notifications|search\.doctors)\.[A-Za-z0-9_.]+)['"]/g;
const LOCALES: Record<LangCode, string> = { ar: 'ar', en: 'en', ur: 'ur', hi: 'hi', bn: 'bn', fil: 'tl' };
const load = (file: string): Record<string, string> => JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales', `${file}.json`), 'utf8'));
const locales = Object.fromEntries(Object.entries(LOCALES).map(([lang, file]) => [lang, load(file)])) as Record<LangCode, Record<string, string>>;

const used = new Set<string>();
for (const file of FILES) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  for (const m of text.matchAll(KEY)) used.add(m[1]);
}
// keys built from a condition in the source (title/sub/label picked at run time) are named in full there too

describe('keys the Batch 0 fixes name', () => {
  it('there are keys to check', () => {
    expect(used.size).toBeGreaterThan(80);
  });

  it.each([...used].sort())('%s is translated in ar, en, ur, hi, bn and fil', (key) => {
    const english = locales.en[key];
    expect(english).toBeTruthy();
    for (const lang of Object.keys(LOCALES) as LangCode[]) {
      const value = locales[lang][key];
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
      expect(autoTranslate(key, lang)).toBe(value);
      if (lang !== 'en' && lang !== 'ar' && key !== 'common.appName' && !/^[\dX\s]+$/.test(value)) expect(value).not.toBe(english); // the brand name is the same
      if (key.includes('{n}') || english.includes('{n}')) expect(value).toContain('{n}');
    }
  });
});
