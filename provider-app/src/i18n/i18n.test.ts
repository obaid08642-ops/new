import { AUTONYMS, LANGS, isRtlLang, langFromCode, translate } from './index';

const files: Record<string, Record<string, string>> = {
  ar: require('./locales/ar.json'), en: require('./locales/en.json'), ur: require('./locales/ur.json'),
  hi: require('./locales/hi.json'), bn: require('./locales/bn.json'), tl: require('./locales/tl.json'),
};

describe('provider app translations: six languages', () => {
  it('has a file for each of the six languages', () => {
    expect([...LANGS].sort()).toEqual(['ar', 'bn', 'en', 'hi', 'tl', 'ur']);
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
    expect(translate('ur', 'common.login')).toBe(files.ur['common.login']);
    expect(translate('ur', 'login')).not.toBe(translate('en', 'login'));
    expect(translate('hi', 'no.such.key')).toBe('no.such.key');
    expect(translate('en', 'x.y')).toBe('x.y');
  });

  it('knows the device codes, including Filipino ("fil" on the device, "tl" in the files)', () => {
    expect(langFromCode('fil-PH')).toBe('tl');
    expect(langFromCode('tl')).toBe('tl');
    expect(langFromCode('ur_PK')).toBe('ur');
    expect(langFromCode('fr')).toBeNull();
    expect(langFromCode(undefined)).toBeNull();
  });

  it('Arabic and Urdu are right to left, the rest left to right', () => {
    expect(LANGS.filter(isRtlLang)).toEqual(['ar', 'ur']);
  });

  it('each language is named in its own script', () => {
    expect(AUTONYMS).toEqual({ ar: 'العربية', en: 'English', ur: 'اردو', hi: 'हिन्दी', bn: 'বাংলা', tl: 'Filipino' });
  });
});
