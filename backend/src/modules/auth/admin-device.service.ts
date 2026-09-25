import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createHash, randomBytes } from 'crypto';

/**
 * Admin device binding (NOT IP binding — mobile IPs rotate constantly).
 * A browser presents a random per-browser id (HttpOnly cookie set by the
 * admin BFF). With device_lock on, admin JWTs are rejected unless the id
 * is enrolled. Bootstrap-safe: enabling lock auto-enrolls the current id.
 */
@Injectable()
export class AdminDeviceService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get devices() { return this.conn.collection('admin_devices'); }
  private get users() { return this.conn.collection('users'); }

  private hash(id: string) { return createHash('sha256').update(id).digest('hex'); }

  async isLockEnabled(userId: string): Promise<boolean> {
    const u: any = await this.users.findOne({ id: userId }, { projection: { device_lock_enabled: 1 } }).catch(() => null);
    return u?.device_lock_enabled === true;
  }

  async checkDevice(userId: string, deviceId?: string): Promise<{ ok: boolean; reason?: string }> {
    if (!(await this.isLockEnabled(userId))) return { ok: true };
    if (!deviceId || deviceId.length < 16) return { ok: false, reason: 'device_not_enrolled' };
    const dev: any = await this.devices.findOne({ user_id: userId, device_hash: this.hash(deviceId), revoked: { $ne: true } }).catch(() => null);
    return dev ? { ok: true } : { ok: false, reason: 'device_not_enrolled' };
  }

  async list(userId: string) {
    const rows: any[] = await this.devices.find({ user_id: userId, revoked: { $ne: true } }, { projection: { _id: 0, device_hash: 0 } }).sort({ last_seen_at: -1 }).toArray().catch(() => []);
    return rows;
  }

  async enroll(userId: string, deviceId: string, ua?: string, name?: string) {
    if (!deviceId || deviceId.length < 16) throw new BadRequestException('invalid_device_id');
    await this.devices.updateOne(
      { user_id: userId, device_hash: this.hash(deviceId) },
      { $set: { user_id: userId, device_hash: this.hash(deviceId), ua: (ua || '').slice(0, 200), name: name || 'متصفح الإدارة', revoked: false, last_seen_at: new Date() }, $setOnInsert: { enrolled_at: new Date() } },
      { upsert: true },
    );
    return { ok: true };
  }

  async revoke(userId: string, deviceDbId: string) {
    await this.devices.updateOne({ _id: deviceDbId as any, user_id: userId }, { $set: { revoked: true } }).catch(() => null);
    return { ok: true };
  }

  async setLock(userId: string, enabled: boolean, currentDeviceId?: string, ua?: string) {
    await this.users.updateOne({ id: userId }, { $set: { device_lock_enabled: !!enabled } }).catch(() => null);
    if (enabled && currentDeviceId && currentDeviceId.length >= 16) {
      await this.enroll(userId, currentDeviceId, ua, 'هذا الجهاز (تفعيل تلقائي)');
    }
    return { ok: true, device_lock_enabled: !!enabled };
  }

  newDeviceId() { return randomBytes(32).toString('base64url'); }
}
