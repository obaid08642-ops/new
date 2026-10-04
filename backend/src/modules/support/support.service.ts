import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SupportRequest, SupportStatus, SupportCategory, PatientSettings } from '../../schemas/support.schema';
import { SupportRequestRepository } from "./repositories/supportrequest.repository";
import { PatientSettingsRepository } from "./repositories/patientsettings.repository";

@Injectable()
export class SupportService {
  constructor(
    @Inject('SupportRequestRepository') private readonly req: SupportRequestRepository,
    @Inject('PatientSettingsRepository') private readonly settings: PatientSettingsRepository,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  // SUPPORT
  async create(user: any, body: any) {
    if (!body.subject || !body.message) throw new BadRequestException('subject and message required');
    // PATIENT-APP-2: clients send lowercase ('general'); normalize to the enum, fallback GENERAL.
    const raw = String(body.category || 'GENERAL').trim().toUpperCase();
    const category = (Object.values(SupportCategory).includes(raw as SupportCategory) ? raw : SupportCategory.GENERAL) as SupportCategory;
    const r = await this.req.create({
      user_id: user.id,
      user_name: user.full_name,
      user_phone: user.phone,
      category,
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
    return this.req.find({ user_id }).sort({ createdAt: -1 }).limit(80);
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
    try {
      const rows: any[] = await this.conn.collection('faqs').find({ active: { $ne: false } }).sort({ sort: 1 }).limit(100).toArray();
      if (rows.length) return rows.map((r: any) => ({ id: r.id || String(r._id), question: r.question_ar, question_en: r.question_en || null, answer: r.answer_ar, answer_en: r.answer_en || null }));
    } catch { /* fall through to defaults */ }
    return [
      { id: '1', question: 'كيف أحجز موعد؟', answer: 'يمكنك الحجز من خلال قسم العيادات' },
      { id: '2', question: 'هل التأمين مغطى؟', answer: 'نعم، ندعم معظم شركات التأمين' }
    ];
  }

  /** P6.x-13: admin-managed FAQs (public list falls back to defaults when empty). */
  async listFaqsAdmin(): Promise<any[]> {
    return this.conn.collection('faqs').find({}).sort({ sort: 1 }).limit(200).toArray();
  }

  async upsertFaq(dto: { id?: string; question_ar: string; question_en?: string; answer_ar: string; answer_en?: string; sort?: number; active?: boolean }) {
    if (!dto?.question_ar?.trim() || !dto?.answer_ar?.trim()) throw new BadRequestException('question_answer_required');
    const doc = {
      id: dto.id || require('uuid').v4(),
      question_ar: String(dto.question_ar).slice(0, 500),
      question_en: dto.question_en ? String(dto.question_en).slice(0, 500) : null,
      answer_ar: String(dto.answer_ar).slice(0, 5000),
      answer_en: dto.answer_en ? String(dto.answer_en).slice(0, 5000) : null,
      sort: Number.isFinite(dto.sort) ? dto.sort : 0,
      active: dto.active !== false,
      updated_at: new Date(),
    };
    await this.conn.collection('faqs').updateOne({ id: doc.id }, { $set: doc }, { upsert: true });
    return doc;
  }

  async deleteFaq(id: string) {
    const res: any = await this.conn.collection('faqs').updateOne({ id: { $eq: id } }, { $set: { active: false } });
    if (!res.modifiedCount && !(await this.conn.collection('faqs').findOne({ id: { $eq: id } }))) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('faq_not_found');
    }
    return { ok: true };
  }

  async submitFeedback(user_id: string) {
    return { success: true, message: 'شكرًا لملاحظاتك!' };
  }
}
