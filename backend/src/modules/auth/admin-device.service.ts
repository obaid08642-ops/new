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

  /**
   * C2: is this device allowed to act for `userId`?
   *
   * Two conditions, both required:
   *  1. The device id is enrolled and not revoked.
   *  2. If the device is bound to a passkey credential, that credential still
   *     exists. Deleting the passkey revokes its devices with it, so a token
   *     replayed from a browser that never completed a WebAuthn assertion is
   *     rejected even though the device id is enrolled.
   */
  async checkDevice(userId: string, deviceId?: string): Promise<{ ok: boolean; reason?: string }> {
    if (!(await this.isLockEnabled(userId))) return { ok: true };
    if (!deviceId || deviceId.length < 16) return { ok: false, reason: 'device_not_enrolled' };
    const dev: any = await this.devices.findOne({ user_id: userId, device_hash: this.hash(deviceId), revoked: { $ne: true } }).catch(() => null);
    if (!dev) return { ok: false, reason: 'device_not_enrolled' };
    if (dev.credential_id) {
      const live: any = await this.conn.collection('passkey_credentials').findOne({ user_id: userId, credential_id: dev.credential_id }).catch(() => null);
      if (!live) return { ok: false, reason: 'device_credential_revoked' };
    }
    return { ok: true };
  }

  async list(userId: string) {
    const rows: any[] = await this.devices.find({ user_id: userId, revoked: { $ne: true } }, { projection: { _id: 0, device_hash: 0 } }).sort({ last_seen_at: -1 }).toArray().catch(() => []);
    return rows;
  }

  /**
   * Enroll a device. `credentialId` binds the device to the passkey that was
   * just verified: the guard rejects the device if that credential is later
   * removed, so deleting a passkey revokes its devices with it. A device with no
   * credential (legacy rows) stays valid but is reported so it can be re-bound.
   */
  async enroll(userId: string, deviceId: string, ua?: string, name?: string, credentialId?: string) {
    if (!deviceId || deviceId.length < 16) throw new BadRequestException('invalid_device_id');
    await this.devices.updateOne(
      { user_id: userId, device_hash: this.hash(deviceId) },
      { $set: { user_id: userId, device_hash: this.hash(deviceId), ua: (ua || '').slice(0, 200), name: name || 'متصفح الإدارة', revoked: false, last_seen_at: new Date(), ...(credentialId ? { credential_id: credentialId } : {}) }, $setOnInsert: { enrolled_at: new Date() } },
      { upsert: true },
    );
    return { ok: true };
  }

  async revoke(userId: string, deviceDbId: string) {
    const res: any = await this.devices.updateOne({ _id: deviceDbId as any, user_id: userId }, { $set: { revoked: true } }).catch(() => null);
    if (!res?.modifiedCount && !(await this.devices.findOne({ _id: deviceDbId as any, user_id: userId }).catch(() => null))) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('device_not_found');
    }
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
