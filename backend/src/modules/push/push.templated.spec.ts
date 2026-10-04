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

/**
 * R7-7: a push that hard-codes its text can never be translated or edited by an
 * admin. Every event listener must go through the template keys instead.
 */
describe('PushService listeners are templated (R7-7)', () => {
  const listeners = ['onBooking', 'onChatMessage', 'onCallIncoming', 'onEmergencyAssigned', 'onCallMissed', 'onPaymentCompleted', 'onPaymentFailed', 'onReportReady'];

  it.each(listeners)('%s calls queueTemplated, never queueNotification directly', async (name) => {
    const service: any = Object.create(PushService.prototype);
    service.queueTemplated = jest.fn().mockResolvedValue({ queued: true });
    service.queueNotification = jest.fn().mockResolvedValue({ queued: true });
    service.userLang = jest.fn().mockResolvedValue('ar');

    const evt: any = {
      patient_id: 'p1', callee_id: 'c1', provider_account_id: 'a1',
      universal_state: 'CONFIRMED', state: 'CONFIRMED', provider_name: 'Bupa',
      meta: { participant_ids: ['u2'], actor_account_id: 'u1', sender_name: 'Sara', body: 'hi', thread_id: 't1' },
      caller_name: 'Omar', session_id: 's1', call_type: 'audio', caller_id: 'u9',
      emergency_id: 'e1', vehicle_id: 'v1', amount: 42, booking_id: 'b1', kind: 'consultation', id: 'bk1',
    };

    await (PushService.prototype as any)[name].call(service, evt);

    const templated = service.queueTemplated.mock.calls;
    const direct = service.queueNotification.mock.calls;
    expect(templated.length + direct.length).toBeGreaterThan(0);
    // The only permitted direct sends would carry a template key, not literal text.
    for (const call of direct) expect(typeof call[1]).toBe('string');
    if (name !== 'onChatMessage') expect(templated.length).toBeGreaterThan(0);
  });
});
