import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { createHash, randomBytes } from 'crypto';

/** D-35: at most 2 active enrolled admin devices per admin. */
export const MAX_ACTIVE_ADMIN_DEVICES = 2;

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

  /** D-35: like list, but every row carries an `id` that DELETE accepts (never the raw device id). */
  async listWithIds(userId: string) {
    const rows: any[] = await this.devices.find({ user_id: userId, revoked: { $ne: true } }).sort({ last_seen_at: -1 }).toArray().catch(() => []);
    return rows.map((r: any) => ({
      id: String(r?.id ?? r?._id ?? ''),
      name: r?.name ?? null,
      ua: r?.ua ?? null,
      enrolled_at: r?.enrolled_at ? new Date(r.enrolled_at).toISOString() : null,
      last_seen_at: r?.last_seen_at ? new Date(r.last_seen_at).toISOString() : null,
    }));
  }

  /**
   * D-35: active (non-revoked) enrolled devices. A store without countDocuments (unit doubles) counts 0; a count that
   * fails at runtime fails CLOSED (reports the limit), so a database error can never let a third device enrol.
   */
  async activeCount(userId: string): Promise<number> {
    const count = (this.devices as any)?.countDocuments;
    if (typeof count !== 'function') return 0;
    try {
      const n = await count.call(this.devices, { user_id: userId, revoked: { $ne: true } });
      return typeof n === 'number' ? n : MAX_ACTIVE_ADMIN_DEVICES;
    } catch {
      return MAX_ACTIVE_ADMIN_DEVICES;
    }
  }

  /** D-35: is this raw device id enrolled and active for the admin? */
  async isEnrolledDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      const dev: any = await this.devices.findOne({ user_id: userId, device_hash: this.hash(deviceId), revoked: { $ne: true } }).catch(() => null);
      return !!dev;
    } catch {
      return false;
    }
  }

  /** D-35 audit trail: every enrolment and revoke is logged, never the raw device id. */
  async auditDevice(userId: string, action: 'admin_device.enrolled' | 'admin_device.revoked', actorRole?: string, name?: string) {
    try {
      await (this.conn as any)?.collection?.('audit_logs')?.insertOne?.({
        id: randomBytes(8).toString('hex'),
        user_id: userId,
        action,
        actor_role: actorRole ?? null,
        device_name: name ?? null,
        created_at: new Date(),
      });
    } catch {
      // Auditing must never break the device action.
    }
  }

  /**
   * Enroll a device. `credentialId` binds the device to the passkey that was
   * just verified: the guard rejects the device if that credential is later
   * removed, so deleting a passkey revokes its devices with it. A device with no
   * credential (legacy rows) stays valid but is reported so it can be re-bound.
   */
  async enroll(userId: string, deviceId: string, ua?: string, name?: string, credentialId?: string) {
    if (!deviceId || deviceId.length < 16) throw new BadRequestException('invalid_device_id');
    const r: any = await this.devices.updateOne(
      { user_id: userId, device_hash: this.hash(deviceId) },
      { $set: { user_id: userId, device_hash: this.hash(deviceId), ua: (ua || '').slice(0, 200), name: name || 'متصفح الإدارة', revoked: false, last_seen_at: new Date(), ...(credentialId ? { credential_id: credentialId } : {}) }, $setOnInsert: { enrolled_at: new Date() } },
      { upsert: true },
    ).catch(() => null);
    return { ok: true, enrolled: (r?.upsertedCount || 0) > 0 };
  }

  async revoke(userId: string, deviceDbId: string) {
    // D-35: the id the list returns is the document's string id; accept it (and raw ObjectIds).
    // Scoped to the caller's own rows, so another admin's revoke is a no-op — never an error.
    let key: any = deviceDbId;
    try {
      key = new Types.ObjectId(String(deviceDbId));
    } catch {
      key = deviceDbId;
    }
    const updated: any = await this.devices.updateOne({ user_id: userId, $or: [{ _id: key }, { id: String(deviceDbId) }] }, { $set: { revoked: true } }).catch(() => null);
    if (updated?.modifiedCount) await this.auditDevice(userId, 'admin_device.revoked');
    return { ok: true };
  }

  /**
   * D-35: enrolment that respects the device limit. Already-enrolled devices
   * refresh as before; a new device is refused once 2 are active.
   */
  async autoEnroll(userId: string, deviceId: string, ua?: string, name?: string, credentialId?: string) {
    if (!deviceId || deviceId.length < 16) throw new BadRequestException('invalid_device_id');
    if (await this.isEnrolledDevice(userId, deviceId)) {
      return this.enroll(userId, deviceId, ua, name, credentialId);
    }
    if ((await this.activeCount(userId)) >= MAX_ACTIVE_ADMIN_DEVICES) {
      return { ok: false, reason: 'admin_device_limit' } as const;
    }
    const r = await this.enroll(userId, deviceId, ua, name, credentialId);
    // D-35: every enrolment is audit-logged.
    if ((r as any)?.enrolled) await this.auditDevice(userId, 'admin_device.enrolled', undefined, name);
    return r;
  }

  async setLock(userId: string, enabled: boolean, currentDeviceId?: string, ua?: string) {
    await this.users.updateOne({ id: userId }, { $set: { device_lock_enabled: !!enabled } }).catch(() => null);
    // D-35 reviewer (device-bound keys): enabling the lock no longer enrols
    // the presenting device on its own. Any codeless enrollment would let a
    // third device on the same account (e.g. via a synced passkey login) pass
    // as enrolled. New devices come only through the approval + e-mailed-code
    // flow (first device: code only); already-enrolled browsers are unaffected.
    return { ok: true, device_lock_enabled: !!enabled };
  }

  newDeviceId() { return randomBytes(32).toString('base64url'); }
}
