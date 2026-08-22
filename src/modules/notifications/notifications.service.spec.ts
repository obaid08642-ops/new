import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService ownership', () => {
  it('scopes markRead to the notification owner or role and fails closed for foreign ids', async () => {
    const model: any = { updateOne: jest.fn().mockResolvedValue({ matchedCount: 0 }) };
    const service = new NotificationsService(
      model,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(service.markRead('notification-foreign', { id: 'patient-2', role: 'patient' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(model.updateOne).toHaveBeenCalledWith(
      { id: 'notification-foreign', $or: [{ user_id: 'patient-2' }, { role: 'patient' }, { role: 'all' }] },
      { $addToSet: { read_by: 'patient-2' } },
    );
  });

  it('accepts a matched notification and returns ok', async () => {
    const model: any = { updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }) };
    const service = new NotificationsService(model, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.markRead('notification-owned', { id: 'patient-1', role: 'patient' })).resolves.toEqual({ ok: true });
  });
});
