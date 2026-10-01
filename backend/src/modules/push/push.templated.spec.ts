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

  it('falls back to Arabic for an unknown user or language', async () => {
    const service = serviceFor({ user: null });
    expect(await service.userLang('nobody')).toBe('ar');
    const tl = serviceFor({ user: { locale: 'tl-PH' } });
    expect(await tl.userLang('x')).toBe('fil');
  });
});
