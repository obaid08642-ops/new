import { BadRequestException } from '@nestjs/common';
import { AdminNotificationCenterController, AdminNotificationCenterService } from './admin-notification-center.module';

describe('Admin notification campaign governance', () => {
  const makeService = () => {
    const campaigns: any = { insertOne: jest.fn().mockResolvedValue({}), findOne: jest.fn(), updateOne: jest.fn() };
    const users: any = { find: jest.fn(), findOne: jest.fn() };
    const conn: any = { collection: jest.fn((name: string) => ({ campaigns, users, pushengagements: {}, pushlogs: {} }[name])) };
    const service = new AdminNotificationCenterService(conn, { queueNotification: jest.fn() } as any);
    return { service, campaigns };
  };

  it('requires an explicit audience confirmation for a bulk campaign', async () => {
    const { service, campaigns } = makeService();
    await expect(service.createCampaign('admin-1', { title: 'Notice', body: 'Body', segment: 'all' })).rejects.toBeInstanceOf(BadRequestException);
    expect(campaigns.insertOne).not.toHaveBeenCalled();
  });

  it('rejects an unsafe deep link before persisting a campaign', async () => {
    const { service, campaigns } = makeService();
    await expect(service.createCampaign('admin-1', { title: 'Notice', body: 'Body', segment: 'patients', audience_confirmed: true, deep_link: { route: 'https://external.invalid' } })).rejects.toBeInstanceOf(BadRequestException);
    expect(campaigns.insertOne).not.toHaveBeenCalled();
  });

  it('records the authenticated administrator identifier rather than a fixed actor', async () => {
    const { service, campaigns } = makeService();
    await service.createCampaign('admin-actual', { title: 'Notice', body: 'Body', segment: 'patients', audience_confirmed: true });
    expect(campaigns.insertOne).toHaveBeenCalledWith(expect.objectContaining({ created_by: 'admin-actual', segment: 'patients' }));
  });

  it('passes the authenticated admin to broadcast service calls', async () => {
    const svc: any = { broadcast: jest.fn().mockResolvedValue({ ok: true }) };
    const controller = new AdminNotificationCenterController(svc);
    await controller.broadcast({ id: 'admin-actual' }, { title: 'Notice' });
    expect(svc.broadcast).toHaveBeenCalledWith('admin-actual', { title: 'Notice' });
  });
});
