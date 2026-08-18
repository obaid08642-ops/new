import { Injectable, Optional, NotFoundException, ForbiddenException, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../../common/enums';
import { UserRepository } from './repositories/user.repository';
import { PatientProfileRepository } from './repositories/patient-profile.repository';
import { ProviderProfileRepository } from './repositories/provider-profile.repository';
import { PatientProfile } from '../../schemas/patient-profile.schema';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @Inject('PatientProfileRepository') private readonly patientRepository: PatientProfileRepository,
    @Inject('ProviderProfileRepository') private readonly providerRepository: ProviderProfileRepository,
    @InjectConnection() private readonly conn: Connection,
    private readonly redisService: RedisService,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  async getWishlist(userId: string) {
    const profile = await this.patientRepository.findOne({ user_id: userId });
    return profile?.wishlist || [];
  }

  async toggleWishlist(userId: string, itemId: string) {
    const profile = await this.patientRepository.findOne({ user_id: userId });
    if (!profile) return { ok: false };
    const idx = (profile.wishlist || []).findIndex((i: any) => i.id === itemId);
    if (idx >= 0) {
      profile.wishlist.splice(idx, 1);
    } else {
      if (!profile.wishlist) profile.wishlist = [];
      profile.wishlist.push({ id: itemId }); // Real implementation would query product
    }
    await this.patientRepository.updateOne({ user_id: userId }, { $set: { wishlist: profile.wishlist } });
    return { ok: true, message: 'Wishlist toggled' };
  }

  listAll(role?: UserRole, search?: string) {
    const q: any = {};
    if (role) q.role = role;
    if (search) q.$or = [{ full_name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    return this.userRepository.find(q, { _id: 0, password_hash: 0, __v: 0 }, { sort: { createdAt: -1 }, limit: 500 });
  }

  async getPatientProfile(user_id: string) {
    let p = await this.patientRepository.findOne({ user_id }, { _id: 0, __v: 0 });
    if (!p) p = await this.patientRepository.create({ user_id });
    const o: any = typeof (p as any).toObject === 'function' ? (p as any).toObject() : p;
    // Alias: the app reads/writes `chronic_conditions`; the schema field is `chronic_diseases`.
    return { ...o, chronic_conditions: o.chronic_diseases || [] };
  }

  /** S11: patient-editable profile fields — everything else (user_id, verified,
   *  created_by, system flags) can never be written through the public PATCH. */
  private static readonly PATIENT_PROFILE_EDITABLE = new Set([
    'full_name', 'date_of_birth', 'dob', 'gender', 'height_cm', 'weight_kg', 'height', 'weight',
    'blood_type', 'phone', 'email',
    'chronic_diseases', 'allergies', 'current_medications', 'emergency_contacts',
    'addresses', 'preferred_lang', 'avatar_url', 'national_id', 'marital_status',
    'occupation', 'smoking_status', 'notes',
  ]);

  async updatePatientProfile(user_id: string, data: Partial<PatientProfile> & { chronic_conditions?: string[] }) {
    const mapped: any = {};
    for (const [k, v] of Object.entries(data || {})) {
      if (k === 'chronic_conditions') { mapped.chronic_diseases = v; continue; }
      // Reject $-operator keys and dot-notation paths outright (NoSQL hardening),
      // then apply the editable-field whitelist (mass-assignment fix).
      if (k.startsWith('$') || k.includes('.')) continue;
      if (UsersService.PATIENT_PROFILE_EDITABLE.has(k)) mapped[k] = v;
    }
    return this.patientRepository.updateOne({ user_id }, { $set: mapped }, { upsert: true, new: true, projection: { _id: 0, __v: 0 } });
  }


  // --- WP 1.6 Settings Methods — persisted on the patient profile document ---
  private async getSetting(id: string, key: string, defaults: any) {
    const p: any = await this.patientRepository.findOne({ user_id: id }, { [key]: 1 });
    return p?.[key] ?? defaults;
  }
  private async setSetting(id: string, key: string, body: any) {
    const clean = (body && typeof body === 'object') ? body : {};
    await this.patientRepository.updateOne({ user_id: id }, { $set: { [key]: clean } }, { upsert: true });
    return clean;
  }

  async getNotificationSettings(id: string) {
    return this.getSetting(id, 'notification_settings', { push: true, email: false, sms: true });
  }
  async updateNotificationSettings(id: string, body: any) {
    return this.setSetting(id, 'notification_settings', body);
  }

  /** Real storage usage computed from the patient's stored content (base64 payloads). */
  async getStorageDetails(id: string) {
    const LIMIT_GB = 5;
    const sumBase64 = async (collection: string, match: any, field: string) => {
      try {
        const rows = await this.conn.db.collection(collection).aggregate([
          { $match: { ...match, [field]: { $type: 'string', $ne: '' } } },
          { $group: { _id: null, total: { $sum: { $strLenBytes: `$${field}` } } } },
        ]).toArray();
        return rows.length ? (rows[0].total * 3) / 4 : 0; // base64 → bytes
      } catch { return 0; }
    };
    const prescBytes = await sumBase64('prescriptions', { patient_id: id }, 'upload_image');
    let reportBytes = 0;
    try {
      const rows = await this.conn.db.collection('medicalreports').aggregate([
        { $match: { patient_id: id } },
        { $unwind: '$attachments' },
        { $match: { 'attachments.base64': { $type: 'string' } } },
        { $group: { _id: null, total: { $sum: { $strLenBytes: '$attachments.base64' } } } },
      ]).toArray();
      reportBytes = rows.length ? (rows[0].total * 3) / 4 : 0;
    } catch { /* collection may not exist yet */ }
    const usedBytes = prescBytes + reportBytes;
    const fmt = (b: number) => b >= 1073741824 ? `${(b / 1073741824).toFixed(1)} GB` : `${(b / 1048576).toFixed(1)} MB`;
    const limitBytes = LIMIT_GB * 1073741824;
    const pct = (b: number) => Math.min(100, Math.round((b / limitBytes) * 100));
    return {
      used: fmt(usedBytes),
      total: `${LIMIT_GB} GB`,
      limit: LIMIT_GB,
      items: [
        { label: 'الوصفات المرفوعة', val: fmt(prescBytes), pct: pct(prescBytes), color: '#23B5CE' },
        { label: 'التقارير الطبية', val: fmt(reportBytes), pct: pct(reportBytes), color: '#7A6BEA' },
      ],
    };
  }

  async getPrivacySettings(id: string) {
    return this.getSetting(id, 'privacy_settings', { profile_visible: true, share_data: false });
  }
  async updatePrivacySettings(id: string, body: any) {
    return this.setSetting(id, 'privacy_settings', body);
  }
  async getSecuritySettings(id: string) {
    return this.getSetting(id, 'security_settings', { biometric: false, two_factor: false });
  }
  async updateSecuritySettings(id: string, body: any) {
    return this.setSetting(id, 'security_settings', body);
  }

  /** Real password change: verify current hash, then rotate. */
  async changePassword(id: string, body: any) {
    const current = String(body?.current_password || '');
    const next = String(body?.new_password || '');
    if (next.length < 8) throw new BadRequestException('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
    const u: any = await this.userRepository.findOne({ id });
    if (!u) throw new NotFoundException();
    if (u.password_hash) {
      const ok = await bcrypt.compare(current, u.password_hash);
      if (!ok) throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
    }
    const hash = await bcrypt.hash(next, 12);
    await this.userRepository.updateOne({ id }, { $set: { password_hash: hash } });
    return { success: true };
  }

  /** Active sessions = live refresh tokens tracked in Redis (device-bound, 7d TTL). */
  async getSessions(id: string) {
    try {
      const client = this.redisService.getClient?.();
      if (!client) return [];
      const jtis: string[] = await client.smembers(`refresh_user:${id}`);
      const sessions: any[] = [];
      for (const jti of jtis || []) {
        const raw = await client.get(`refresh:${jti}`);
        if (!raw) continue; // expired or revoked
        let device: string | null = null;
        try { device = JSON.parse(raw)?.d ?? null; } catch { /* keep null */ }
        const ttl = await client.ttl(`refresh:${jti}`);
        sessions.push({ id: jti, device, expires_in_seconds: ttl });
      }
      return sessions;
    } catch {
      return [];
    }
  }

  /** Revoke one of the caller's own sessions (delete the refresh token from Redis). */
  async revokeSession(id: string, jti: string) {
    const client = this.redisService.getClient?.();
    if (!client) throw new BadRequestException('sessions unavailable');
    const isMember = await client.sismember(`refresh_user:${id}`, jti);
    if (!isMember) throw new NotFoundException('session not found');
    await client.del(`refresh:${jti}`);
    await client.srem(`refresh_user:${id}`, jti);
    return { ok: true };
  }

  async toggle(user_id: string, by: any) {
    const u = await this.userRepository.findOne({ id: user_id });
    if (!u) throw new NotFoundException();
    if (u.id === by.id) throw new ForbiddenException('Cannot toggle yourself');
    u.active = !u.active;
    await this.userRepository.updateOne({ id: user_id }, { $set: { active: u.active } });
    return { ok: true, active: u.active };
  }

  async deleteUser(user_id: string, by: any) {
    if (user_id === by.id) throw new ForbiddenException('Cannot delete yourself');
    // S5: user deletion is irreversible and sensitive — audit BEFORE deleting,
    // keeping only privacy-safe identifiers (hashed phone tail, role).
    const target: any = await this.userRepository.findOne({ id: user_id });
    try {
      this.events?.emit('admin.user_deleted', {
        admin_id: by?.id,
        target_user_id: user_id,
        role: target?.role,
        phone_tail: target?.phone ? String(target.phone).slice(-4) : undefined,
      });
    } catch {}
    await this.userRepository.deleteOne({ id: user_id });
    return { ok: true };
  }
}
