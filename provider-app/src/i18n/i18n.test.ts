import { AUTONYMS, LANGS, isRtlLang, langFromCode, translate } from './index';

const files: Record<string, Record<string, string>> = {
  ar: require('./locales/ar.json'), en: require('./locales/en.json'),
};

describe('provider app translations: Arabic and English (owner 2026-10-31)', () => {
  it('has a file for each of the two languages', () => {
    expect([...LANGS].sort()).toEqual(['ar', 'en']);
    for (const l of LANGS) expect(Object.keys(files[l]).length).toBeGreaterThan(100);
  });

  it('every key exists, non-empty, in every language (no gaps, no fallback needed)', () => {
    const all = new Set(Object.values(files).flatMap((f) => Object.keys(f)));
    const gaps: string[] = [];
    for (const l of LANGS) for (const k of all) if (typeof files[l][k] !== 'string' || !files[l][k].trim()) gaps.push(`${l}:${k}`);
    expect(gaps).toEqual([]);
  });

  it('the same {placeholders} appear in every language of a key', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    const bad = Object.keys(files.en).filter((k) => LANGS.some((l) => ph(files[l][k]) !== ph(files.en[k])));
    expect(bad).toEqual([]);
  });

  it('translate: short common keys, full keys, placeholders; a missing key answers the key, never another language', () => {
    expect(translate('ar', 'login')).toBe(files.ar['common.login']);
    expect(translate('en', 'common.login')).toBe(files.en['common.login']);
    expect(translate('ar', 'login')).not.toBe(translate('en', 'login'));
    expect(translate('ar', 'no.such.key')).toBe('no.such.key');
    expect(translate('en', 'x.y')).toBe('x.y');
  });

  it('knows the device codes; anything else is not a supported language', () => {
    expect(langFromCode('ar-SA')).toBe('ar');
    expect(langFromCode('en_GB')).toBe('en');
    expect(langFromCode('fil-PH')).toBeNull();
    expect(langFromCode('ur')).toBeNull();
    expect(langFromCode(undefined)).toBeNull();
  });

  it('Arabic is right to left, English left to right', () => {
    expect(LANGS.filter(isRtlLang)).toEqual(['ar']);
  });

  it('each language is named in its own script', () => {
    expect(AUTONYMS).toEqual({ ar: 'العربية', en: 'English' });
  });
});
