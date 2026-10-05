// Q90: users, push and the web send `fil`; the dictionary keys Filipino as `tl`.
// Without an alias a Filipino user fell back to Arabic.
import { I18nService } from './i18n.service';

describe('I18nService accepts fil for Filipino (Q90)', () => {
  const i18n = new I18nService();
  it('t() with fil returns the Filipino text', () => {
    expect(i18n.t('push.report.ready.title', 'fil' as never)).toBe(i18n.t('push.report.ready.title', 'tl'));
    expect(i18n.t('push.report.ready.title', 'fil' as never)).not.toBe(i18n.t('push.report.ready.title', 'ar'));
  });
  it('all() with fil returns the Filipino bundle', () => {
    expect(i18n.all('fil' as never)['push.report.ready.title']).toBe(i18n.t('push.report.ready.title', 'tl'));
  });
});
