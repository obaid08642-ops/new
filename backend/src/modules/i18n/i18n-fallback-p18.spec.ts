import { I18nService, resolveLang } from './i18n.service';

/**
 * Phase 18, task 18.2 (language fallback), backend half.
 *
 * The rule the owner set: the user's chosen language → the device language if it is
 * supported → English. **Arabic is only ever used when the user chose it or the device is in
 * Arabic**, "so Urdu, Hindi, Bengali and Filipino users no longer get Arabic silently".
 *
 * Why this was a real defect and not a theoretical one: `PushService.userLang` and the
 * notification delivery path deliberately return the user's own locale, including `hi`, `bn`
 * and `fil`. `I18nService`'s dictionary only holds `ar | en | ur`, so `entry[lang]` was
 * `undefined` for those three and `t()` fell through to `entry[DEFAULT]`, which was `'ar'`.
 * A Hindi user who picked Hindi was served **Arabic** push and notification text.
 */
describe('18.2 backend language fallback', () => {
  const svc = new I18nService();

  it.each([
    ['ar', 'ar'],
    ['en', 'en'],
    ['ur', 'ur'],
  ])('keeps the supported locale %s', (input, expected) => {
    expect(resolveLang(input)).toBe(expected);
  });

  it.each([
    ['hi', 'Hindi'],
    ['bn', 'Bengali'],
    ['fil', 'Filipino'],
    ['tl', 'Filipino under the tl code'],
    ['fr', 'unsupported French'],
    ['de', 'unsupported German'],
    ['zz', 'unknown'],
  ])('resolves %s (%s) to English, never Arabic', (input) => {
    expect(resolveLang(input)).toBe('en');
  });

  it.each([undefined, null, '', '   '])('resolves the empty value %p to English', (input) => {
    expect(resolveLang(input as any)).toBe('en');
  });

  it('tolerates region tags and mixed case', () => {
    expect(resolveLang('en-US')).toBe('en');
    expect(resolveLang('AR-sa')).toBe('ar');
    expect(resolveLang('ur_PK')).toBe('ur');
    expect(resolveLang('HI-in')).toBe('en');
  });

  it('never serves Arabic built-in text to a Hindi, Bengali or Filipino user', () => {
    const key = 'common.cancel';
    const arabic = svc.t(key, 'ar');
    const english = svc.t(key, 'en');
    expect(arabic).not.toBe(english);
    for (const lang of ['hi', 'bn', 'fil', 'tl', 'fr']) {
      expect(svc.t(key, lang as any)).toBe(english);
    }
  });

  it('with no locale at all the built-in text is English', () => {
    expect(svc.t('common.cancel')).toBe(svc.t('common.cancel', 'en'));
    expect(svc.t('common.cancel')).not.toBe(svc.t('common.cancel', 'ar'));
  });

  it('an explicit Arabic request still gets Arabic', () => {
    expect(svc.t('common.cancel', 'ar')).toBe('إلغاء');
  });

  it('all() follows the same rule', () => {
    const en = svc.all('en');
    const hi = svc.all('hi' as any);
    const ar = svc.all('ar');
    expect(hi).toEqual(en);
    expect(ar).not.toEqual(en);
    expect(svc.all()).toEqual(en);
  });

  it('an unknown key still returns the key, in every locale', () => {
    for (const lang of ['ar', 'en', 'hi', undefined]) {
      expect(svc.t('no.such.key', lang as any)).toBe('no.such.key');
    }
  });

  it('parameters are still interpolated after the fallback is applied', () => {
    expect(svc.t('pharmacy.broadcast.body', 'hi' as any, { items_count: 4 })).toContain('4');
  });
});
