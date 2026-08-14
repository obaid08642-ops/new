import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { SupportRequest, SupportStatus, PatientSettings } from '../../schemas/support.schema';
import { SupportRequestRepository } from "./repositories/supportrequest.repository";
import { PatientSettingsRepository } from "./repositories/patientsettings.repository";

@Injectable()
export class SupportService {
  constructor(
    @Inject('SupportRequestRepository') private readonly req: SupportRequestRepository,
    @Inject('PatientSettingsRepository') private readonly settings: PatientSettingsRepository,
  ) {}

  // SUPPORT
  async create(user: any, body: any) {
    if (!body.subject || !body.message) throw new BadRequestException('subject and message required');
    const r = await this.req.create({
      user_id: user.id,
      user_name: user.full_name,
      user_phone: user.phone,
      category: body.category || 'GENERAL',
      subject: body.subject.trim(),
      message: body.message.trim(),
      attachments: body.attachments || [],
      source_role: user.role || 'patient',
      priority: body.priority || 'medium',
      thread: [{ by: user.id, role: user.role || 'patient', message: body.message.trim(), at: new Date() }],
    });
    return r.toObject();
  }

  async mine(user: any) {
    return this.req.find({ user_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(80);
  }

  async getOne(user: any, id: string) {
    const r = await this.req.findOne({ id }, { _id: 0, __v: 0 });
    if (!r) throw new NotFoundException();
    if (r.user_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    return r;
  }

  async reply(user: any, id: string, message: string) {
    if (!message?.trim()) throw new BadRequestException('message required');
    const r = await this.req.findOne({ id });
    if (!r) throw new NotFoundException();
    if (r.user_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    r.thread.push({ by: user.id, role: user.role || 'patient', message: message.trim(), at: new Date() });
    await r.save();
    return r.toObject();
  }

  
  async adminList(status?: string) {
    const q: any = {};
    if (status) q.status = status;
    return this.req.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
  }
  async adminUpdateStatus(id: string, status: string, assigned_to: string) {
    if (!Object.values(SupportStatus).includes(status as any)) throw new BadRequestException('bad status');
    const r = await this.req.findOne({ id });
    if (!r) throw new NotFoundException();
    r.status = status as any;
    if (assigned_to !== undefined) r.assigned_to = assigned_to;
    if (status === SupportStatus.RESOLVED) r.resolved_at = new Date();
    await r.save();
    return r.toObject();
  }

  // SETTINGS
  async listTickets(user_id: string) {
    return this.req.find({ patient_id: user_id }).sort({ createdAt: -1 });
  }

  async getSettings(user: any) {
    let s = await this.settings.findOne({ user_id: user.id }, { _id: 0, __v: 0 });
    if (!s) { s = await this.settings.create({ user_id: user.id }) as any; }
    return s;
  }
  async updateSettings(user: any, body: any) {
    const allowed = ['language', 'theme', 'calendar', 'notifications_enabled', 'notif_reminders', 'notif_orders', 'notif_appointments', 'notif_lab_results', 'expo_push_token'];
    const $set: any = {};
    for (const k of allowed) if (body[k] !== undefined) $set[k] = body[k];
    const s = await this.settings.findOneAndUpdate({ user_id: user.id }, { $set }, { new: true, upsert: true });
    return s.toObject();
  }

  // --- WP 1.6 Settings Methods ---
  async getFaqs() {
    return [
      { id: '1', question: 'كيف أحجز موعد؟', answer: 'يمكنك الحجز من خلال قسم العيادات' },
      { id: '2', question: 'هل التأمين مغطى؟', answer: 'نعم، ندعم معظم شركات التأمين' }
    ];
  }

  async submitFeedback(user_id: string, body: any) {
    return { success: true, message: 'شكرًا لملاحظاتك!' };
  }
}
