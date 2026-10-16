import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SupportRequest, SupportStatus, SupportCategory, PatientSettings } from '../../schemas/support.schema';
import { SupportRequestRepository } from "./repositories/supportrequest.repository";
import { PatientSettingsRepository } from "./repositories/patientsettings.repository";

const FAQ_LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;
type FaqLang = (typeof FAQ_LANGS)[number];

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
    // issue 1585: the built-in fallback carries every app language in the same shape as stored FAQs
    // (question/answer = Arabic, question_en/answer_en = English) plus question_<lang>/answer_<lang> for ur, hi, bn, fil.
    return SupportService.DEFAULT_FAQS.map((f) => ({ id: f.id, question: f.question.ar, answer: f.answer.ar, ...Object.fromEntries(FAQ_LANGS.flatMap((l) => [[`question_${l}`, f.question[l]], [`answer_${l}`, f.answer[l]]])) }));
  }

  private static readonly DEFAULT_FAQS: ReadonlyArray<{ id: string; question: Record<FaqLang, string>; answer: Record<FaqLang, string> }> = [
    {
      id: '1',
      question: { ar: 'كيف أحجز موعد؟', en: 'How do I book an appointment?', ur: 'میں اپائنٹمنٹ کیسے بک کروں؟', hi: 'मैं अपॉइंटमेंट कैसे बुक करूँ?', bn: 'আমি কীভাবে অ্যাপয়েন্টমেন্ট বুক করব?', fil: 'Paano ako magpapa-book ng appointment?' },
      answer: { ar: 'يمكنك الحجز من خلال قسم العيادات', en: 'You can book from the clinics section.', ur: 'آپ کلینکس کے سیکشن سے بک کر سکتے ہیں۔', hi: 'आप क्लिनिक सेक्शन से बुक कर सकते हैं।', bn: 'আপনি ক্লিনিক বিভাগ থেকে বুক করতে পারেন।', fil: 'Maaari kang mag-book mula sa seksyon ng mga klinika.' },
    },
    {
      id: '2',
      question: { ar: 'هل التأمين مغطى؟', en: 'Is insurance covered?', ur: 'کیا انشورنس کور ہوتی ہے؟', hi: 'क्या बीमा कवर होता है?', bn: 'বিমা কি কভার করা হয়?', fil: 'Sakop ba ng insurance?' },
      answer: { ar: 'نعم، ندعم معظم شركات التأمين', en: 'Yes, we support most insurance companies.', ur: 'جی ہاں، ہم زیادہ تر انشورنس کمپنیوں کو سپورٹ کرتے ہیں۔', hi: 'हाँ, हम अधिकांश बीमा कंपनियों का समर्थन करते हैं।', bn: 'হ্যাঁ, আমরা বেশিরভাগ বিমা কোম্পানি সমর্থন করি।', fil: 'Oo, sinusuportahan namin ang karamihan ng mga kumpanya ng insurance.' },
    },
  ];

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
    await this.conn.collection('faqs').updateOne({ id: { $eq: id } }, { $set: { active: false } });
    return { ok: true };
  }

  async submitFeedback(user_id: string) {
    return { success: true, message: 'شكرًا لملاحظاتك!' };
  }
}
