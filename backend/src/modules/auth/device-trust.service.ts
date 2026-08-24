import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { TrustedDevice, TrustedDeviceDocument } from './schemas/trusted-device.schema';
import { RedisService } from '../redis/redis.service';

const SESSION_TTL_SEC = 300; // a device is "online" if it heartbeated within 5 min

/**
 * Admin device-trust registry.
 *
 * - issue():       called ONLY after a fully completed 2FA (OTP verified or
 *                  WebAuthn assertion verified). Returns the raw token once;
 *                  the DB keeps only its SHA-256 hash.
 * - validate():    fast path during login — a valid, non-revoked token lets
 *                  a recognized device skip the second factor.
 * - heartbeat():   the admin dashboard pings this; online devices = sessions
 *                  seen within the last 5 minutes (Redis, self-expiring).
 */
@Injectable()
export class DeviceTrustService {
  private readonly logger = new Logger('DeviceTrust');

  constructor(
    @InjectModel(TrustedDevice.name) private readonly model: Model<TrustedDeviceDocument>,
    private readonly redis: RedisService,
  ) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private deviceNameFromUa(ua?: string): string {
    if (!ua) return 'جهاز غير معروف';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Android/i.test(ua)) return 'Android';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'جهاز آخر';
  }

  async issue(userId: string, ua?: string, ip?: string, name?: string): Promise<{ token: string; device: any }> {
    const token = randomBytes(32).toString('base64url');
    const doc = await this.model.create({
      user_id: userId,
      token_hash: this.hash(token),
      name: name || this.deviceNameFromUa(ua),
      user_agent: (ua || '').slice(0, 300),
      ip,
      last_ip: ip,
      last_seen_at: new Date(),
    });
    return { token, device: doc.toObject() };
  }

  /** Returns the trusted device when the cookie token is valid, else null. */
  async validate(userId: string, token: string | undefined, ip?: string): Promise<any | null> {
    if (!token || typeof token !== 'string' || token.length < 20) return null;
    const dev = await this.model.findOne({ token_hash: this.hash(token), user_id: userId, revoked: false });
    if (!dev) return null;
    dev.last_seen_at = new Date();
    if (ip) dev.last_ip = ip;
    await dev.save();
    return dev.toObject();
  }

  async list(userId: string) {
    return this.model
      .find({ user_id: userId, revoked: false }, { token_hash: 0 })
      .sort({ last_seen_at: -1 })
      .lean();
  }

  async revoke(userId: string, deviceId: string) {
    await this.model.updateOne({ id: deviceId, user_id: userId }, { $set: { revoked: true } });
    return { ok: true };
  }

  /** Dashboard heartbeat — marks this (user, device) session as online. */
  async heartbeat(userId: string, deviceToken: string | undefined, ua?: string, ip?: string) {
    const registryKey = `sessions:${userId}`;
    const deviceKey = deviceToken ? this.hash(deviceToken).slice(0, 16) : 'unknown-device';
    let registry: Record<string, any> = {};
    try {
      registry = JSON.parse((await this.redis.get(registryKey)) || '{}');
    } catch {}
    registry[deviceKey] = {
      name: this.deviceNameFromUa(ua),
      ua: (ua || '').slice(0, 200),
      ip,
      at: new Date().toISOString(),
    };
    // Drop stale entries (>5 min) while writing
    const cutoff = Date.now() - SESSION_TTL_SEC * 1000;
    for (const [k, v] of Object.entries(registry)) {
      if (!v?.at || new Date(v.at).getTime() < cutoff) delete registry[k];
    }
    await this.redis.set(registryKey, JSON.stringify(registry), SESSION_TTL_SEC);
    return { ok: true };
  }

  /** Devices with a live (≤5 min) session for this user. */
  async onlineSessions(userId: string) {
    let registry: Record<string, any> = {};
    try {
      registry = JSON.parse((await this.redis.get(`sessions:${userId}`)) || '{}');
    } catch {}
    const cutoff = Date.now() - SESSION_TTL_SEC * 1000;
    return Object.entries(registry)
      .filter(([, v]) => v?.at && new Date(v.at).getTime() >= cutoff)
      .map(([k, v]) => ({ session: k, ...v }));
  }
}
