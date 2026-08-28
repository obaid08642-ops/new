import { PharmacyNotificationService } from '../services/pharmacy-notification.service';

describe('PharmacyNotificationService realtime broadcasts', () => {
  const notifications = { create: jest.fn().mockResolvedValue(undefined) };
  const orders = { findOne: jest.fn() };
  const realtime = { emitToUser: jest.fn().mockResolvedValue(undefined) };
  const service = new PharmacyNotificationService(notifications as any, orders as any, realtime as any);

  beforeEach(() => jest.clearAllMocks());

  it('notifies the target pharmacy and emits a live availability event', async () => {
    await service.notifyPharmacyBroadcast(
      'pharmacy-account-1',
      { id: 'order-1', items: [{ sku: 'm1' }] } as any,
      { id: 'broadcast-1', current_round: 2, current_radius_km: 12 },
    );

    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'pharmacy-account-1',
      action: expect.objectContaining({ type: 'open_pharmacy_broadcast', broadcast_id: 'broadcast-1', order_id: 'order-1' }),
    }));
    expect(realtime.emitToUser).toHaveBeenCalledWith('pharmacy-account-1', 'pharmacy:broadcast:available', {
      broadcast_id: 'broadcast-1', order_id: 'order-1', round: 2, radius_km: 12,
    });
  });

  it('emits a targeted cancellation event', async () => {
    await service.notifyPharmacyBroadcastCancelled('pharmacy-account-1', 'order-1', 'won_by_other_pharmacy');
    expect(realtime.emitToUser).toHaveBeenCalledWith('pharmacy-account-1', 'pharmacy:broadcast:cancelled', {
      order_id: 'order-1', reason: 'won_by_other_pharmacy',
    });
  });
});
