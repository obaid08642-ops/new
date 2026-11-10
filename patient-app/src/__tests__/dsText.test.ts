import { dsText } from '../design-system/dsText';

describe('the design-system accessibility texts', () => {
  it('come from the translation files in the app language, with the slots filled', () => {
    expect(dsText('en', 'ds.badge.notification', { n: 3 })).toBe('3 notifications');
    expect(dsText('ar', 'ds.badge.notification', { n: 3 })).toBe('3 إشعار');
    expect(dsText('ur', 'ds.otp.digit', { n: 2, total: 6 })).toContain('2');
    expect(dsText('hi', 'ds.toast.close')).not.toBe('ds.toast.close');
  });
  it('fall back to English, then to the key, so nothing is blank', () => {
    expect(dsText('xx', 'ds.toast.close')).toBe('Close');
    expect(dsText('en', 'ds.unknown.key')).toBe('ds.unknown.key');
  });
  it('have a text in all six languages for every ds.* key', () => {
    const keys = ['ds.avatar.user', 'ds.avatar.online', 'ds.avatar.offline', 'ds.badge.newNotification', 'ds.badge.notification', 'ds.badge.remove', 'ds.sheet.drag', 'ds.sheet.dragHint', 'ds.input.hidePassword', 'ds.input.showPassword', 'ds.loading', 'ds.otp.digit', 'ds.search.field', 'ds.search.hint', 'ds.search.voice', 'ds.search.filtersActive', 'ds.search.filters', 'ds.toast.close', 'ds.back'];
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) for (const key of keys) expect(dsText(lang, key)).not.toBe(key);
  });
});
