// R11 §5 lead 2 (reproduced on a real Mongo): admin_devices is a raw
// collection, so revoke()'s string `_id` never matched the stored ObjectId
// (always 404), and list() stripped `_id`, so no caller had an id to send.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException } from '@nestjs/common';
import { AdminDeviceService } from './admin-device.service';

jest.setTimeout(60_000);

describe('AdminDeviceService.revoke on a real Mongo (R11 §5)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: AdminDeviceService;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'devrevoke' }).asPromise();
    svc = new AdminDeviceService(conn);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('the id list() returns revokes that device, and only for its owner', async () => {
    await svc.enroll('admin-1', 'device-aaaaaaaaaaaaaaaa', 'ua', 'Laptop');
    const [row] = await svc.list('admin-1') as Array<{ id: string; device_hash?: string }>;
    expect(typeof row.id).toBe('string');
    expect(row.device_hash).toBeUndefined();
    await expect(svc.revoke('admin-2', row.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.revoke('admin-1', row.id)).resolves.toEqual({ ok: true });
    expect(await svc.list('admin-1')).toHaveLength(0);
  });

  it('a malformed id is a 404, not a crash', async () => {
    await expect(svc.revoke('admin-1', 'not-an-object-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
