import { Injectable, NotFoundException, BadRequestException, Inject, Logger, Optional } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupportRequest, SupportStatus, SupportCategory, PatientSettings } from '../../schemas/support.schema';
import { SupportRequestRepository } from "./repositories/supportrequest.repository";
import { PatientSettingsRepository } from "./repositories/patientsettings.repository";
import { AiGatewayService, stripPii } from '../ai/ai-gateway.service';

interface CreateSupportDto {
  subject: string;
  message: string;
  category?: string;
  priority?: string;
  attachments?: any[];
  linked_order_id?: string;
  linked_booking_id?: string;
  callback_requested?: boolean;
  callback_phone?: string;
  callback_preferred_time?: Date;
}

interface TicketSlaConfig {
  firstResponseHours: number;
  resolutionHours: number;
}

const DEFAULT_SLA: Record<string, TicketSlaConfig> = {
  urgent: { firstResponseHours: 1, resolutionHours: 4 },
  high: { firstResponseHours: 4, resolutionHours: 24 },
  medium: { firstResponseHours: 8, resolutionHours: 48 },
  low: { firstResponseHours: 24, resolutionHours: 72 },
};

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @Inject('SupportRequestRepository') private readonly req: SupportRequestRepository,
    @Inject('PatientSettingsRepository') private readonly settings: PatientSettingsRepository,
    @InjectConnection() private readonly conn: Connection,
    // @Optional so manual `new SupportService(req, settings, conn)` construction
    // (specs, scripts) keeps working — aiAssist degrades to the static fallback.
    @Optional() private readonly ai?: AiGatewayService,
  ) {}

  // SUPPORT
  async create(user: any, body: CreateSupportDto): Promise<SupportRequest> {
    if (!body.subject || !body.message) throw new BadRequestException('subject and message required');
    
    const raw = String(body.category || 'GENERAL').trim().toUpperCase();
    const category = (Object.values(SupportCategory).includes(raw as SupportCategory) ? raw : SupportCategory.GENERAL) as SupportCategory;
    const priority = body.priority || 'medium';
    const sla = DEFAULT_SLA[priority] || DEFAULT_SLA.medium;

    const r = await this.req.create({
      user_id: user.id,
      user_name: user.full_name,
      user_phone: user.phone,
      category,
      subject: body.subject.trim(),
      message: body.message.trim(),
      attachments: body.attachments || [],
      source_role: user.role || 'patient',
      priority,
      thread: [{ by: user.id, role: user.role || 'patient', message: body.message.trim(), at: new Date() }],
      // SLA tracking
      sla_first_response_due: new Date(Date.now() + sla.firstResponseHours * 3600 * 1000),
      sla_resolution_due: new Date(Date.now() + sla.resolutionHours * 3600 * 1000),
      // Order/booking linkage
      linked_order_id: body.linked_order_id,
      linked_booking_id: body.linked_booking_id,
      // Callback request
      callback_requested: body.callback_requested || false,
      callback_phone: body.callback_phone,
      callback_preferred_time: body.callback_preferred_time ? new Date(body.callback_preferred_time) : undefined,
      callback_status: body.callback_requested ? 'pending' : 'none',
    });
    return r.toObject();
  }

  async mine(user: any) {
    return this.req.find({ user_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(80);
  }

  async getOne(user: any, id: string): Promise<SupportRequest> {
    const r = await this.req.findOne({ id }, { _id: 0, __v: 0 });
    if (!r) throw new NotFoundException();
    if (r.user_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    return r;
  }

  async reply(user: any, id: string, message: string): Promise<SupportRequest> {
    if (!message?.trim()) throw new BadRequestException('message required');
    const r = await this.req.findOne({ id });
    if (!r) throw new NotFoundException();
    if (r.user_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    r.thread.push({ by: user.id, role: user.role || 'patient', message: message.trim(), at: new Date() });
    // Clear SLA first response if this is first agent reply
    if (r.sla_first_response_due && !r.first_agent_reply_at) {
      r.first_agent_reply_at = new Date();
    }
    await r.save();
    return r.toObject();
  }

  // AI Assistant — real gateway (Phase 0.2, closes the 13.R21 TODO).
  // Flow: keyword handoff → gateway answer (+ low-confidence handoff) → static
  // fallback on gateway failure (no ticket unless keywords matched).
  static readonly AI_FALLBACK =
    'للحصول على مساعدة فورية، يرجى إنشاء تذكرة دعم أو التواصل معنا عبر الرقم 920000000.';

  private static readonly HANDOFF_KEYWORDS = [
    'human', 'agent', 'representative', 'speak to someone', 'talk to human',
    'ممثل', 'بشري', 'موظف',
  ];

  // Gateway has no confidence score — these substrings mark an uncertain /
  // deferring answer that must hand off to a human instead of being served raw.
  private static readonly UNCERTAIN_PATTERNS = [
    "i don't know", "i'm not sure", 'i am not sure', 'not sure', 'uncertain',
    'cannot help', "can't help", 'unable to help', "don't have enough",
    'contact support', 'human agent', 'speak to a', 'talk to a human',
    'لا أعرف', 'لست متأكد', 'غير متأكد', 'لا أستطيع المساعدة',
    'تواصل مع الدعم', 'ممثل بشري', 'موظف خدمة',
  ];

  private static looksUncertain(answer: string): boolean {
    const t = answer.toLowerCase();
    return SupportService.UNCERTAIN_PATTERNS.some((p) => t.includes(p));
  }

  private async createHandoffTicket(user: any, query: string) {
    return this.create(user, {
      subject: `AI Handoff: ${query.slice(0, 100)}`,
      message: query,
      category: 'AI_HANDOFF',
      priority: 'high',
    });
  }

  async aiAssist(user: any, body: { query: string; context?: any }): Promise<{ answer: string; handoff?: boolean; ticket_id?: string }> {
    const rawQuery = String(body?.query || '').trim();
    if (!rawQuery) throw new BadRequestException('query_required');

    // (1) Keyword handoff — kept from the pre-gateway behaviour.
    if (SupportService.HANDOFF_KEYWORDS.some((kw) => rawQuery.toLowerCase().includes(kw))) {
      const ticket = await this.createHandoffTicket(user, rawQuery);
      return { answer: 'جاري تحويلك لممثل بشري...', handoff: true, ticket_id: ticket.id };
    }

    // (2) Gateway answer. PII is stripped before the prompt leaves the process
    // (the gateway strips again — belt and suspenders; the ticket keeps the
    // original query so the human agent has full context).
    try {
      if (!this.ai) throw new Error('ai_gateway_unavailable');
      const safeQuery = stripPii(rawQuery);
      const safeContext = body?.context ? stripPii(JSON.stringify(body.context).slice(0, 1000)) : '';
      const isArabic = /[\u0600-\u06FF]/.test(rawQuery);
      const prompt =
        'You are a helpful health-app support assistant. Answer the user question ' +
        'briefly (max 4 sentences), no diagnosis, no prescriptions. ' +
        (isArabic
          ? 'Answer in Arabic (Modern Standard Arabic).'
          : 'Answer in the same language as the question (default English).') +
        `\n\nUser question: ${safeQuery}` +
        (safeContext ? `\nAdditional context: ${safeContext}` : '');
      const res = await this.ai.generate({ prompt, feature: 'supportAssist' });
      const answer = String(res?.text || '').trim();
      if (!answer) throw new Error('ai_empty_response');

      // (3) Low-confidence / deferring gateway answer → handoff with ticket.
      if (SupportService.looksUncertain(answer)) {
        const ticket = await this.createHandoffTicket(user, rawQuery);
        return { answer, handoff: true, ticket_id: ticket.id };
      }
      return { answer };
    } catch (e) {
      // (4) Gateway failure → static fallback, NO ticket (keywords already
      // handled above, so keyword tickets still exist on this path).
      this.logger.warn(`aiAssist gateway fallback: ${String((e as any)?.message || e).slice(0, 120)}`);
      return { answer: SupportService.AI_FALLBACK };
    }
  }

  // Callback / "Call me back" feature
  async requestCallback(user: any, body: { phone: string; preferred_time?: Date; reason?: string }): Promise<SupportRequest> {
    if (!body.phone) throw new BadRequestException('phone_required');
    return this.create(user, {
      subject: 'طلب معاودة اتصال',
      message: body.reason || 'العميل يطلب معاودة اتصال',
      category: 'CALLBACK',
      priority: 'high',
      callback_requested: true,
      callback_phone: body.phone,
      callback_preferred_time: body.preferred_time,
    });
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

  // SLA monitoring cron - runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async checkSlaBreaches(): Promise<void> {
    const now = new Date();
    const breached = await this.req.find({
      status: { $nin: [SupportStatus.RESOLVED, SupportStatus.CLOSED] },
      $or: [
        { sla_first_response_due: { $lt: now }, first_agent_reply_at: { $exists: false } },
        { sla_resolution_due: { $lt: now } },
      ],
    });

    for (const ticket of breached) {
      // TODO: Send alert to admin
      this.logger.warn(`SLA breach detected for ticket ${ticket.id} (user: ${ticket.user_id})`);
      // Could escalate, reassign, or notify admin
    }
  }

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
