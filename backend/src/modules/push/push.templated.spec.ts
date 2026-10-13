import { PushService } from './push.module';
import { I18nService } from '../i18n/i18n.service';

/** R7-7: templated pushes resolve the admin template (else the built-in text) in the recipient's language. */
function serviceFor(opts: { template?: any; user?: any } = {}) {
  const service: any = Object.create(PushService.prototype);
  service.i18n = new I18nService();
  service.templateModel = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(opts.template ?? null) }) };
  service.tokens = { db: { collection: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(opts.user ?? null) }) } };
  service.queueNotification = jest.fn().mockResolvedValue({ queued: true });
  return service;
}

describe('PushService templated text (R7-7)', () => {
  it('uses the built-in text in the user language when no template exists', async () => {
    const service = serviceFor({ user: { id: 'u1', locale: 'en' } });
    await service.queueTemplated('u1', 'push.cart.reminder.title', 'push.cart.reminder.body', { type: 'cart' });
    expect(service.queueNotification).toHaveBeenCalledWith('u1', 'Your cart is waiting', expect.stringContaining('medicines in your cart'), { type: 'cart' }, 'high');
  });

  it('an admin-edited template wins over the built-in text', async () => {
    const service = serviceFor({
      user: { id: 'u1', locale: 'ar' },
      template: { key: 'push.cart.reminder.title', title: { ar: 'عنوان معدل', en: 'Edited' }, body: { ar: 'نص معدل', en: 'Edited body' } },
    });
    await service.queueTemplated('u1', 'push.cart.reminder.title', 'push.cart.reminder.body');
    expect(service.queueNotification).toHaveBeenCalledWith('u1', 'عنوان معدل', 'نص معدل', {}, 'high');
  });

  // Phase 18.2: an unknown user or an unknown language falls back to **English**, not Arabic
  // ("Arabic only when the user chose it or the device is in Arabic, so Urdu, Hindi, Bengali
  // and Filipino users no longer get Arabic silently"). The `tl` → `fil` alias is unchanged:
  // Filipino is a supported app locale, so it is kept as the user's own choice.
  it('falls back to English for an unknown user or language, and keeps the tl→fil alias', async () => {
    const service = serviceFor({ user: null });
    expect(await service.userLang('nobody')).toBe('en');
    const tl = serviceFor({ user: { locale: 'tl-PH' } });
    expect(await tl.userLang('x')).toBe('fil');
  });

  it('a Hindi user keeps their locale but the built-in text is English, not Arabic', async () => {
    const service = serviceFor({ user: { id: 'u1', locale: 'hi-IN' } });
    expect(await service.userLang('u1')).toBe('hi');
    await service.queueTemplated('u1', 'push.cart.reminder.title', 'push.cart.reminder.body', { type: 'cart' });
    expect(service.queueNotification).toHaveBeenCalledWith('u1', 'Your cart is waiting', expect.stringContaining('medicines in your cart'), { type: 'cart' }, 'high');
  });
});
