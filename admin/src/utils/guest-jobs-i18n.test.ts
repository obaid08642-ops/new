import { describe, expect, it } from 'vitest';
import { GUEST_JOB_LANGS, GUEST_JOB_MESSAGES } from './guest-jobs-i18n';

describe('Guest job posts page texts: six languages', () => {
  const ar = GUEST_JOB_MESSAGES.ar as Record<string, string>;
  const keys = Object.keys(ar).sort();
  it('has the six platform languages', () => {
    expect([...GUEST_JOB_LANGS]).toEqual(['ar', 'en', 'ur', 'hi', 'bn', 'fil']);
  });
  it('every language has every key and none is empty', () => {
    for (const lang of GUEST_JOB_LANGS) {
      const m = GUEST_JOB_MESSAGES[lang] as Record<string, string>;
      expect(Object.keys(m).sort(), lang).toEqual(keys);
      for (const k of keys) expect(m[k].trim(), `${lang}.${k}`).not.toBe('');
    }
  });
  it('no other language reuses the Arabic text, and no non-English language leaves the English text', () => {
    const en = GUEST_JOB_MESSAGES.en as Record<string, string>;
    // words that are the same in more than one language on purpose
    const same = new Set(['contact', 'company', 'role_nurse', 'reviewer']);
    for (const lang of GUEST_JOB_LANGS.filter((l) => l !== 'ar')) {
      const m = GUEST_JOB_MESSAGES[lang] as Record<string, string>;
      for (const k of keys) expect(m[k], `${lang}.${k} equals Arabic`).not.toBe(ar[k]);
      if (lang !== 'en') for (const k of keys.filter((x) => !same.has(x))) expect(m[k], `${lang}.${k} left in English`).not.toBe(en[k]);
    }
  });
});
