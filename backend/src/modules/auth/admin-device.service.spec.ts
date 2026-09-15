import { AdminDeviceService } from './admin-device.service';

describe('AdminDeviceService (device lock, never IP)', () => {
  const svc = (usersRows: any[] = [], devRows: any[] = []) => {
    const users = { findOne: jest.fn().mockImplementation((q: any) => Promise.resolve(usersRows.find((u) => u.id === q.id) || null)), updateOne: jest.fn().mockResolvedValue({}) };
    const devices = {
      findOne: jest.fn().mockImplementation((q: any) => Promise.resolve(devRows.find((d) => d.user_id === q.user_id) || null)),
      updateOne: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(devRows) }) }),
    };
    const conn: any = { collection: jest.fn((n: string) => (n === 'users' ? users : devices)) };
    return new AdminDeviceService(conn);
  };

  it('lock disabled => everything allowed without device', async () => {
    const s = svc([{ id: 'a1' }]);
    await expect(s.checkDevice('a1', undefined)).resolves.toEqual({ ok: true });
  });

  it('lock enabled + unknown device => rejected', async () => {
    const s = svc([{ id: 'a1', device_lock_enabled: true }]);
    await expect(s.checkDevice('a1', 'some-browser-id-123456')).resolves.toEqual({ ok: false, reason: 'device_not_enrolled' });
  });

  it('lock enabled + enrolled device => allowed', async () => {
    const conn: any = {
      collection: jest.fn((n: string) => {
        if (n === 'users') return { findOne: jest.fn().mockResolvedValue({ id: 'a1', device_lock_enabled: true }), updateOne: jest.fn().mockResolvedValue({}) };
        return {
          findOne: jest.fn().mockImplementation((q: any) => {
            const { createHash } = require('crypto');
            const h = createHash('sha256').update('browser-id-1234567890').digest('hex');
            return Promise.resolve(q.device_hash === h ? { user_id: 'a1' } : null);
          }),
          updateOne: jest.fn().mockResolvedValue({}),
          find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }),
        };
      }),
    };
    const svcEnrolled = new AdminDeviceService(conn);
    await expect(svcEnrolled.checkDevice('a1', 'browser-id-1234567890')).resolves.toEqual({ ok: true });
  });

  it('setLock(true) auto-enrolls current device', async () => {
    const updateOne = jest.fn().mockResolvedValue({});
    const conn: any = {
      collection: jest.fn((n: string) => {
        if (n === 'users') return { findOne: jest.fn(), updateOne };
        return { findOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({}), find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }) };
      }),
    };
    const s = new AdminDeviceService(conn);
    const out: any = await s.setLock('a1', true, 'browser-id-1234567890', 'ua');
    expect(out.device_lock_enabled).toBe(true);
    expect(updateOne).toHaveBeenCalledWith({ id: 'a1' }, expect.objectContaining({ $set: expect.objectContaining({ device_lock_enabled: true }) }));
  });
});
