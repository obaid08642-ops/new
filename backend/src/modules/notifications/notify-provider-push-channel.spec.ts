import axios from 'axios';
import { NotificationsService } from './notifications.service';

jest.mock('axios');

// A new order must reach the provider's phone on the loud channel with its own sound, at high priority, and carry what the tap opens.
describe('provider push: loud channel for a new order', () => {
  const build = () => {
    const svc: any = Object.create(NotificationsService.prototype);
    const inserted: any[] = [];
    svc.model = { db: {
      collection: () => ({ findOne: async () => null, insertOne: async (d: any) => { inserted.push(d); } }),
      model: () => ({ find: () => ({ lean: async () => [{ token: 'ExponentPushToken[abc]', provider: 'expo' }] }) }),
    } };
    svc.logger = { debug: jest.fn(), error: jest.fn() };
    return { svc, inserted };
  };

  it('new_request goes out on new_order with the sound, high priority and the booking to open', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { data: [{ status: 'ok' }] } });
    const { svc } = build();
    await svc.notifyProviderAccount('acc-1', { type: 'new_request', title_ar: 'حجز جديد', title_en: 'New booking', related_id: 'b1', related_type: 'appointment', action: { route: '/provider/job/b1' } });
    const [, messages] = (axios.post as jest.Mock).mock.calls.at(-1)!;
    expect(messages[0]).toMatchObject({ channelId: 'new_order', sound: 'new_order.wav', priority: 'high', data: { channel: 'new_order', related_id: 'b1', related_type: 'appointment', screen: '/provider/job/b1' } });
  });

  it('an ordinary update stays on the default channel', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { data: [{ status: 'ok' }] } });
    const { svc } = build();
    await svc.notifyProviderAccount('acc-1', { type: 'booking_update', title_ar: 'تحديث', title_en: 'Update', related_id: 'b1', related_type: 'appointment' });
    const [, messages] = (axios.post as jest.Mock).mock.calls.at(-1)!;
    expect(messages[0]).toMatchObject({ channelId: 'default', priority: 'high' });
    expect(messages[0].sound).not.toBe('new_order.wav');
  });
});
