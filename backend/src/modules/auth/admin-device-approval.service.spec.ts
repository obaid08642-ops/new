import { AdminDeviceApprovalService } from './admin-device-approval.service';
import { createHash } from 'crypto';

const hashCode = (code: string) => createHash('sha256').update(`d35:${code}`).digest('hex');

describe('AdminDeviceApprovalService (D-35 confirm attempt limit)', () => {
  const svc = (req: any) => {
    const requests = {
      findOne: jest.fn().mockResolvedValue(req),
      updateOne: jest.fn().mockResolvedValue({}),
      deleteOne: jest.fn().mockResolvedValue({}),
    };
    const users = { findOne: jest.fn().mockResolvedValue({ id: 'a1', role: 'super_admin', email: 'a@x.test' }) };
    const devices = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    const adminDevicesColl = { findOne: jest.fn(), updateOne: jest.fn(), deleteMany: jest.fn().mockResolvedValue({}) };
    const conn: any = {
      collection: jest.fn((n: string) => {
        if (n === 'admin_device_requests') return requests;
        if (n === 'users') return users;
        if (n === 'admin_devices') return adminDevicesColl;
        return { findOne: jest.fn(), updateOne: jest.fn(), deleteMany: jest.fn().mockResolvedValue({}) };
      }),
    };
    const deviceSvc: any = {
      isEnrolledDevice: jest.fn().mockResolvedValue(false),
      activeCount: jest.fn().mockResolvedValue(1),
      enroll: jest.fn().mockResolvedValue({ ok: true, enrolled: true }),
      auditDevice: jest.fn().mockResolvedValue(undefined),
    };
    const mail: any = { send: jest.fn().mockResolvedValue({ ok: true }) };
    return { s: new AdminDeviceApprovalService(conn, deviceSvc, mail), requests, deviceSvc };
  };
  const openReq = (over: any = {}) => ({
    id: 'r1', user_id: 'a1', device_hash: createHash('sha256').update('browser-id-1234567890').digest('hex'),
    name: 'd', code_hash: hashCode('482916'), approved: true, approved_at: new Date(),
    created_at: new Date(), expires_at: new Date(Date.now() + 600_000), failed_attempts: 0, ...over,
  });

  it('a wrong code records the failure and keeps refusing with invalid_code', async () => {
    const { s, requests } = svc(openReq());
    await expect(s.confirm('a1', 'r1', 'browser-id-1234567890', '000000')).rejects.toThrow('invalid_code');
    expect(requests.updateOne).toHaveBeenCalledWith({ id: 'r1' }, { $set: { failed_attempts: 1 } });
    expect(requests.deleteOne).not.toHaveBeenCalled();
  });

  it('the 5th wrong code cancels the request with too_many_attempts', async () => {
    const { s, requests } = svc(openReq({ failed_attempts: 4 }));
    await expect(s.confirm('a1', 'r1', 'browser-id-1234567890', '000000')).rejects.toThrow('too_many_attempts');
    expect(requests.deleteOne).toHaveBeenCalledWith({ id: 'r1' });
  });

  it('the right code still works after 4 failures', async () => {
    const { s, requests } = svc(openReq({ failed_attempts: 4 }));
    await expect(s.confirm('a1', 'r1', 'browser-id-1234567890', '482916')).resolves.toEqual({ ok: true });
    expect(requests.deleteOne).toHaveBeenCalledWith({ id: 'r1' });
  });
});
