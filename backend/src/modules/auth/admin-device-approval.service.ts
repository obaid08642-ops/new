import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { AdminDeviceService, MAX_ACTIVE_ADMIN_DEVICES } from './admin-device.service';
import { MailService } from '../mail/mail.module';

/**
 * D-35 — admin on two devices. Enrolling a new device never happens by asking:
 * the new device requests, an already-enrolled device approves, and the new
 * device confirms with a one-time e-mailed code. At most 2 active enrolled
 * devices per admin; a third is refused until one is revoked. The admin's
 * FIRST device (none active) needs only the code.
 */
@Injectable()
export class AdminDeviceApprovalService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly devices: AdminDeviceService,
    private readonly mail: MailService,
  ) {}

  private get requests() { return this.conn.collection('admin_device_requests'); }
  private get users() { return this.conn.collection('users'); }

  private hashDevice(id: string) { return createHash('sha256').update(id).digest('hex'); }
  private hashCode(code: string) { return createHash('sha256').update(`d35:${code}`).digest('hex'); }

  private codesEqual(a: string, b: string): boolean {
    const x = Buffer.from(String(a));
    const y = Buffer.from(String(b));
    return x.length === y.length && timingSafeEqual(x, y);
  }

  /** POST /admin/devices/enroll — from the NEW device. Never enrols on its own. */
  async request(userId: string, deviceId: string, name?: string) {
    if (!deviceId || deviceId.length < 16) throw new BadRequestException('device_id_required');
    if (await this.devices.isEnrolledDevice(userId, deviceId)) {
      return { ok: true, status: 'already_enrolled' };
    }
    if ((await this.devices.activeCount(userId)) >= MAX_ACTIVE_ADMIN_DEVICES) {
      // No request row, no e-mail.
      throw new ConflictException('admin_device_limit');
    }
    // A new request from the same device replaces its older open one.
    await this.requests.deleteMany({ user_id: userId, device_hash: this.hashDevice(deviceId) }).catch(() => null);
    const code = String(randomInt(100000, 1000000));
    const doc = {
      id: randomBytes(8).toString('hex'),
      user_id: userId,
      device_hash: this.hashDevice(deviceId),
      name: (name || 'جهاز جديد').slice(0, 120),
      code_hash: this.hashCode(code),
      approved: false,
      approved_at: null,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 60_000),
    };
    await this.requests.insertOne(doc as any);
    const user: any = await this.users.findOne({ id: userId }, { projection: { email: 1 } }).catch(() => null);
    const email = String(user?.email || '').trim();
    if (!email) {
      await this.requests.deleteOne({ id: doc.id }).catch(() => null);
      throw new BadRequestException('admin_email_missing');
    }
    const subject = 'New admin device approval code';
    const text = `An admin device enrollment was requested for your account.\n\nApproval code: ${code}\n\nApprove it from an already-enrolled device, then enter this code on the new device. The code expires in 30 minutes. If you did not request this, ignore it.`;
    const html = `<p>An admin device enrollment was requested for your account.</p><p>Approval code: <strong>${code}</strong></p><p>Approve it from an already-enrolled device, then enter this code on the new device. The code expires in 30 minutes. If you did not request this, ignore it.</p>`;
    const sent = await this.mail.send(email, subject, html, text);
    if (!sent.ok) {
      await this.requests.deleteOne({ id: doc.id }).catch(() => null);
      throw new ServiceUnavailableException('enrollment_email_failed');
    }
    return { status: 'pending_approval', request_id: doc.id };
  }

  /** GET /admin/devices/requests — from an ENROLLED device. Never the code or the raw device id. */
  async listRequests(userId: string, callerDeviceId: string) {
    if (!(await this.devices.isEnrolledDevice(userId, callerDeviceId))) {
      throw new ForbiddenException('device_not_enrolled');
    }
    const rows: any[] = await this.requests.find({ user_id: userId }).sort({ created_at: -1 }).limit(50).toArray().catch(() => []);
    return rows.map((r: any) => ({
      request_id: r.id,
      id: r.id,
      name: r.name ?? null,
      approved: !!r.approved,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));
  }

  /** POST /admin/devices/requests/:id/approve — from an ENROLLED device (not the requesting one). */
  async approve(userId: string, requestId: string, callerDeviceId: string) {
    if (!(await this.devices.isEnrolledDevice(userId, callerDeviceId))) {
      throw new ForbiddenException('device_not_enrolled');
    }
    const req: any = await this.requests.findOne({ id: String(requestId), user_id: userId }).catch(() => null);
    if (!req) throw new NotFoundException('enrollment_request_not_found');
    if (req.device_hash === this.hashDevice(callerDeviceId)) {
      throw new ForbiddenException('self_approval_forbidden');
    }
    await this.requests.updateOne({ id: req.id }, { $set: { approved: true, approved_at: new Date() } }).catch(() => null);
    return { ok: true };
  }

  /** POST /admin/devices/requests/:id/confirm {code} — from the NEW device. */
  async confirm(userId: string, requestId: string, callerDeviceId: string, code: string, ua?: string) {
    const req: any = await this.requests.findOne({ id: String(requestId), user_id: userId }).catch(() => null);
    if (!req) throw new NotFoundException('enrollment_request_not_found');
    if (req.device_hash !== this.hashDevice(callerDeviceId)) {
      throw new ForbiddenException('request_device_mismatch');
    }
    if (req.expires_at && new Date(req.expires_at).getTime() < Date.now()) {
      await this.requests.deleteOne({ id: req.id }).catch(() => null);
      throw new BadRequestException('code_expired');
    }
    // The admin's FIRST device (none active) needs only the code.
    const active = await this.devices.activeCount(userId);
    if (active > 0 && !req.approved) {
      throw new ConflictException('approval_required');
    }
    if (!code || !this.codesEqual(this.hashCode(String(code)), String(req.code_hash))) {
      throw new BadRequestException('invalid_code');
    }
    // Every path that enrols respects the limit of 2.
    if ((await this.devices.activeCount(userId)) >= MAX_ACTIVE_ADMIN_DEVICES) {
      throw new ConflictException('admin_device_limit');
    }
    // A fresh insert (fresh enrolled_at, fresh audit): drop any revoked row for this device first.
    await this.conn.collection('admin_devices').deleteMany({ user_id: userId, device_hash: req.device_hash, revoked: true }).catch(() => null);
    const user: any = await this.users.findOne({ id: userId }, { projection: { role: 1 } }).catch(() => null);
    const enrolled = await this.devices.enroll(userId, callerDeviceId, ua, req.name);
    await this.requests.deleteOne({ id: req.id }).catch(() => null);
    if ((enrolled as any)?.enrolled) await this.devices.auditDevice(userId, 'admin_device.enrolled', user?.role, req.name);
    return { ok: true };
  }
}
