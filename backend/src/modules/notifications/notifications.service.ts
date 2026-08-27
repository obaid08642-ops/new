import { BadRequestException, Injectable, Logger, Inject } from '@nestjs/common';
import { I18nService } from '../i18n/i18n.service';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Notification, NotificationDocument } from '../../schemas/notification.schema';
import { NotificationPriority, NotificationType } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { NotificationRepository } from "./repositories/notification.repository";
import { initializeApp, getApps, cert } from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.module';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private logger = new Logger('Notifications');
  constructor(
    @Inject('NotificationRepository') private model: NotificationRepository,
    private events: EventEmitter2,
    private smsService: SmsService,
    private mail: MailService,
    @InjectQueue('notifications-delivery') private queue: Queue,
    private readonly i18n: I18nService,
  ) {}

  async create(data: {
    user_id?: string; role?: string;
    title_key?: string; body_key?: string;
    title?: string; body?: string; // ad-hoc admin broadcasts send raw text
    params?: any; type?: NotificationType; priority?: NotificationPriority;
    action?: any;
    scheduled_at?: Date | string; // M6/ER-8: scheduled delivery
  }) {
    const sched = data.scheduled_at ? new Date(data.scheduled_at) : null;
    const delay = sched ? sched.getTime() - Date.now() : 0;
    const titleKey = data.title_key || data.title;
    const bodyKey = data.body_key || data.body;
    if (!titleKey || !bodyKey) throw new BadRequestException('title/body (or title_key/body_key) are required');
    const n = await this.model.create({
      user_id: data.user_id,
      role: data.role,
      title_key: titleKey,
      body_key: bodyKey,
      params: data.params || {},
      type: data.type || NotificationType.INFO,
      priority: data.priority || NotificationPriority.NORMAL,
      action: data.action,
      scheduled_at: sched || undefined,
      status: delay > 5000 ? 'SCHEDULED' : 'PENDING',
    });
    this.events.emit(EVENTS.NOTIFICATION_CREATED, { id: n.id, user_id: n.user_id, role: n.role, title_key: n.title_key, body_key: n.body_key, priority: n.priority });

    // M6/ER-8: delivery via BullMQ (retry + delay); direct fallback if queue is down
    await this.enqueueDelivery(n.id, Math.max(delay, 0));
    return n.toObject();
  }

  private async enqueueDelivery(id: string, delayMs = 0) {
    try {
      await this.queue.add('deliver', { id }, {
        jobId: `deliver:${id}`, // E5-F5: BullMQ dedup — a second enqueue for the same notification is dropped
        delay: delayMs,
        attempts: 4,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
    } catch (e: any) {
      this.logger.error(`Delivery queue unavailable (${e.message}) — falling back to direct delivery`);
      await this.deliverById(id).catch((err: any) => this.logger.error(`Direct delivery failed: ${err.message}`));
    }
  }

  /** Processor entry: deliver + record per-channel status; throws when ALL channels failed (→ retry). */
  async deliverById(id: string) {
    const n: any = await this.model.findOne({ id });
    if (!n) { this.logger.warn(`deliverById: notification ${id} not found`); return; }
    const prev = n.delivery || {};
    const bump = (ch: string, ok: boolean, err?: string) => ({
      status: ok ? 'SENT' : 'FAILED',
      attempts: (prev[ch]?.attempts || 0) + 1,
      ...(err ? { last_error: String(err).slice(0, 300) } : {}),
      ...(ok ? { sent_at: new Date() } : {}),
    });

    const delivery: any = {};
    // Push
    try { const sent = await this.sendPush(n); delivery.push = bump('push', sent !== false); }
    catch (e: any) { delivery.push = bump('push', false, e.message); }
    // User-targeted channels
    if (n.user_id) {
      try {
        const user = (await this.model.db.model('User').findOne({ id: n.user_id }).lean()) as any;
        if (user?.phone) {
          try { await this.sendSms(n, user.phone); delivery.sms = bump('sms', true); }
          catch (e: any) { delivery.sms = bump('sms', false, e.message); }
          try { await this.sendWhatsApp(n, user.phone); delivery.whatsapp = bump('whatsapp', true); }
          catch (e: any) { delivery.whatsapp = bump('whatsapp', false, e.message); }
        }
        if (user?.email) {
          try { await this.sendEmail(n, user.email); delivery.email = bump('email', true); }
          catch (e: any) { delivery.email = bump('email', false, e.message); }
        }
      } catch (e: any) {
        this.logger.error('Failed resolving user channels', e.message);
      }
    }

    const vals = Object.values(delivery) as any[];
    const anySent = vals.some(v => v.status === 'SENT');
    const anyFailed = vals.some(v => v.status === 'FAILED');
    const status = vals.length === 0 ? 'SENT' : anySent && anyFailed ? 'PARTIAL' : anySent ? 'SENT' : 'FAILED';
    await this.model.updateOne({ id }, { $set: { delivery, status, sent_push: delivery.push?.status === 'SENT' } });
    if (status === 'FAILED') throw new Error(`notification ${id}: all channels failed`);
  }

  /** M6/ER-8: admin delivery analytics. */
  async deliveryStats() {
    const rows = await this.model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const by_status: any = {};
    for (const r of rows) by_status[r._id || 'UNKNOWN'] = r.count;
    return { by_status, total: rows.reduce((s: number, r: any) => s + r.count, 0) };
  }

  async broadcast(n: any) {
    // 1. Broadcast Push Notification
    await this.sendPush(n);

    // 2. Broadcast to user specific channels (SMS, Email, WhatsApp) if user_id is set
    if (n.user_id) {
      try {
        const user = (await this.model.db.model('User').findOne({ id: n.user_id }).lean()) as any;
        if (user) {
          if (user.phone) {
            await this.sendSms(n, user.phone);
            await this.sendWhatsApp(n, user.phone);
          }
          if (user.email) {
            await this.sendEmail(n, user.email);
          }
        }
      } catch (err) {
        this.logger.error('Failed to broadcast to multi-channel adapters', err);
      }
    }
  }

  /**
   * M6/ER-8: push payload carries the deep-link contract — every notification
   * opens its exact screen even when the app is terminated:
   *   data = { type, screen (action.route), params (action.payload), action }
   * Tokens are routed by type: Expo tokens → Expo Push API, native → FCM.
   * Returns true when at least one channel accepted the message.
   */
  async sendPush(n: any) {
    const dataPayload: any = {
      type: String(n.type || 'info'),
      action: JSON.stringify(n.action || {}),
    };
    if (n.action?.route) dataPayload.screen = String(n.action.route);
    if (n.action?.payload) dataPayload.params = JSON.stringify(n.action.payload);

    let sent = false;

    if (n.user_id) {
      // PushToken is the single source of truth (registered via /push/register
      // or /notifications/register-token). The old DeviceToken model never
      // existed as a schema — querying it threw MissingSchemaError.
      const userTokens = await this.model.db.model('PushToken').find({ user_id: n.user_id, active: true }).lean();
      const tokens = userTokens.map((t: any) => ({ token: t.token, provider: t.provider })).filter((t: any) => t.token);
      const expoTokens = tokens.filter((t: any) => t.provider === 'expo' || t.token.startsWith('ExponentPushToken')).map((t: any) => t.token);
      const fcmTokens = tokens.filter((t: any) => t.provider === 'fcm' && !t.token.startsWith('ExponentPushToken')).map((t: any) => t.token);

      if (expoTokens.length > 0) {
        sent = (await this.sendExpoPush(expoTokens, n, dataPayload)) || sent;
      }
      if (fcmTokens.length > 0) {
        sent = (await this.sendFcmPush(fcmTokens, n, dataPayload)) || sent;
      }
    } else if (n.role) {
      sent = (await this.sendFcmPush(null, n, dataPayload, n.role)) || sent;
    }
    return sent;
  }

  private async sendFcmPush(tokens: string[] | null, n: any, dataPayload: any, topic?: string): Promise<boolean> {
    const fbProjectId = process.env.FIREBASE_PROJECT_ID || process.env.FCM_PROJECT_ID;
    const fbClientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FCM_CLIENT_EMAIL;
    const fbPrivateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FCM_PRIVATE_KEY;
    if (!fbProjectId || !fbClientEmail || !fbPrivateKey) {
      this.logger.debug(`Push payload: ${n.title_key} → ${n.user_id || n.role}`);
      return false;
    }
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: fbProjectId,
          clientEmail: fbClientEmail,
          privateKey: fbPrivateKey?.replace(/\\n/g, '\n'),
        }),
      });
    }
    const payload = {
      notification: { title: n.title_key, body: n.body_key },
      data: dataPayload,
    };
    if (tokens && tokens.length > 0) {
      const res = await getMessaging().sendEachForMulticast({ tokens, ...payload });
      return res.successCount > 0;
    }
    if (topic) {
      await getMessaging().send({ topic, ...payload });
      return true;
    }
    return false;
  }

  private async sendExpoPush(tokens: string[], n: any, dataPayload: any): Promise<boolean> {
    try {
      const messages = tokens.map((to) => ({
        to,
        title: n.title_key,
        body: n.body_key,
        data: dataPayload,
        sound: n.priority === 'HIGH' || n.priority === 'CRITICAL' ? 'default' : undefined,
      }));
      const res = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
        headers: { 'Content-Type': 'application/json' },
      });
      const receipts = Array.isArray(res.data?.data) ? res.data.data : [];
      return receipts.some((r: any) => r.status === 'ok');
    } catch (e: any) {
      this.logger.error('Expo push failed', e.message);
      return false;
    }
  }

  async sendSms(n: any, phone: string) {
    await this.smsService.sendOtp(phone, n.title_key + ' - ' + n.body_key);
  }

  async sendEmail(n: any, email: string) {
    // Unified pipeline: Resend primary → Amazon SES automatic fallback (MailModule).
    try {
      const result = await this.mail.send(
        email,
        n.title_key,
        `<div dir="rtl" style="font-family: system-ui, sans-serif; text-align: right;"><h3>${n.title_key}</h3><p>${n.body_key}</p></div>`,
        n.body_key,
      );
      if (!result.ok) throw new Error(result.error || 'mail_failed');
    } catch (e) {
      this.logger.error('Failed to send Email', e.stack);
      throw e;
    }
  }

  async sendWhatsApp(n: any, phone: string) {
    if (!process.env.INFOBIP_API_KEY) {
      this.logger.debug(`WhatsApp queued to ${phone} for event: ${n.title_key}`);
      return;
    }
    try {
      await axios.post(`https://${process.env.INFOBIP_URL}/whatsapp/1/message/template`, {
        messages: [{
          from: process.env.INFOBIP_SENDER,
          to: phone,
          content: { templateName: n.title_key, templateData: { body: { placeholders: [n.body_key] } }, language: 'ar' }
        }]
      }, { headers: { Authorization: `App ${process.env.INFOBIP_API_KEY}` } });
    } catch(e) {
      this.logger.error('Failed to send WhatsApp', e.message);
    }
  }

  async listForUser(user: any) {
    const rows: any[] = await this.model.find(
      { $or: [{ user_id: user.id }, { role: user.role }, { role: 'all' }] },
      { _id: 0, __v: 0 },
    ).sort({ createdAt: -1 }).limit(200);
    // Resolve i18n keys to readable text; creators that stored plain Arabic pass through unchanged
    const lang = (user?.lang as any) || 'ar';
    return rows.map((r: any) => {
      const o = typeof r.toObject === 'function' ? r.toObject() : r;
      return {
        ...o,
        title: this.i18n.t(o.title_key, lang, o.params),
        body: this.i18n.t(o.body_key, lang, o.params),
        read: Array.isArray(o.read_by) ? o.read_by.includes(user.id) : false,
      };
    });
  }

  async markRead(id: string, user: any) {
    const result: any = await this.model.updateOne(
      { id, $or: [{ user_id: user.id }, { role: user.role }, { role: 'all' }] },
      { $addToSet: { read_by: user.id } },
    );
    const matched = result?.matchedCount ?? result?.nMatched;
    if (matched === 0) throw new NotFoundException('notification_not_found');
    return { ok: true };
  }

  async markAllRead(user: any) {
    await this.model.updateMany(
      { $or: [{ user_id: user.id }, { role: user.role }, { role: 'all' }] },
      { $addToSet: { read_by: user.id } },
    );
    return { ok: true };
  }

  // ============ EVENT HOOKS (auto-create notifications) ============

  /**
   * UNIFIED LIFECYCLE LISTENERS — the engine emits these for every domain.
   * Routes notifications to patient + provider + admin from one source.
   */
  @OnEvent('service.requested')
  async onServiceRequested(p: any) {
    const pid = p.patient_account_id || p.actor_account_id;
    if (pid) await this.create({ user_id: pid, title_key: 'notif.service.requested.title', body_key: 'notif.service.requested.body', type: NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
  }
  @OnEvent('service.matched')
  async onServiceMatched(p: any) {
    const pid = p.patient_account_id;
    if (pid) await this.create({ user_id: pid, title_key: 'notif.service.matched.title', body_key: 'notif.service.matched.body', type: NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
  }
  @OnEvent('service.assigned')
  async onServiceAssigned(p: any) {
    if (p.patient_account_id) await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.assigned.title', body_key: 'notif.service.assigned.body', type: NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
    // also notify the receiving provider
    await this.create({ role: 'provider', title_key: 'notif.new_job.title', body_key: 'notif.new_job.body', type: NotificationType.ORDER, priority: NotificationPriority.HIGH });
  }
  @OnEvent('service.confirmed')
  async onServiceConfirmed(p: any) {
    if (p.patient_account_id) await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.confirmed.title', body_key: 'notif.service.confirmed.body', type: NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
  }
  @OnEvent('service.started')
  async onServiceStarted(p: any) {
    if (p.patient_account_id) await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.started.title', body_key: 'notif.service.started.body', type: NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
  }
  @OnEvent('service.completed')
  async onServiceCompleted(p: any) {
    if (p.patient_account_id) await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.completed.title', body_key: 'notif.service.completed.body', type: NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
  }
  @OnEvent('service.cancelled')
  async onServiceCancelled(p: any) {
    if (p.patient_account_id) await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.cancelled.title', body_key: 'notif.service.cancelled.body', type: NotificationType.ORDER });
  }
  @OnEvent('service.rollback')
  async onServiceRollback(p: any) {
    await this.create({ role: 'admin', title_key: 'notif.service.rollback.title', body_key: 'notif.service.rollback.body', type: NotificationType.ALERT, priority: NotificationPriority.CRITICAL });
  }

  private routeKind(p: any): string {
    const k = p?.meta?.kind || p?.entity_type;
    if (!k) return 'pharmacy';
    if (['order', 'pharmacy'].includes(k)) return 'pharmacy';
    if (['lab_booking', 'lab'].includes(k)) return 'lab';
    if (['radiology_booking', 'radiology'].includes(k)) return 'radiology';
    if (['nursing_booking', 'nursing'].includes(k)) return 'nursing';
    if (['appointment', 'consultation'].includes(k)) return 'consultation';
    return 'pharmacy';
  }

  @OnEvent('order.created')
  async onOrderCreated(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.order_created.title', body_key: 'notif.order_created.body', type: NotificationType.ORDER, action: { route: `/orders/${p.order_id}` } });
  }
  @OnEvent('order.pharmacy_received')
  async onOrderPharm(p: any) {
    await this.create({ role: 'pharmacy', title_key: 'notif.new_order.title', body_key: 'notif.new_order.body', type: NotificationType.ORDER, priority: NotificationPriority.CRITICAL });
  }
  @OnEvent('order.accepted')
  async onOrderAccepted(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.order_accepted.title', body_key: 'notif.order_accepted.body', type: NotificationType.ORDER });
  }
  @OnEvent('order.rejected')
  async onOrderRejected(p: any) {
    await this.create({ role: 'admin', title_key: 'notif.order_rejected.title', body_key: 'notif.order_rejected.body', type: NotificationType.ORDER, priority: NotificationPriority.HIGH });
  }
  @OnEvent('order.delivered')
  async onOrderDelivered(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.order_delivered.title', body_key: 'notif.order_delivered.body', type: NotificationType.ORDER });
  }
  @OnEvent('order.escalated')
  async onOrderEscalated(p: any) {
    await this.create({ role: 'admin', title_key: 'notif.order_escalated.title', body_key: 'notif.order_escalated.body', type: NotificationType.ALERT, priority: NotificationPriority.CRITICAL });
  }
  @OnEvent('order.preparing')
  async onOrderPreparing(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.order_preparing.title', body_key: 'notif.order_preparing.body', type: NotificationType.ORDER, action: { route: `/orders/${p.order_id}/tracking` } });
  }
  @OnEvent('order.ready')
  async onOrderReady(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.order_ready.title', body_key: 'notif.order_ready.body', type: NotificationType.ORDER, priority: NotificationPriority.HIGH, action: { route: `/orders/${p.order_id}/tracking` } });
  }
  @OnEvent('order.assigned_to_delivery')
  async onOrderAssignedDelivery(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.order_driver_assigned.title', body_key: 'notif.order_driver_assigned.body', type: NotificationType.ORDER, action: { route: `/orders/${p.order_id}/tracking` } });
  }
  @OnEvent('order.out_for_delivery')
  async onOrderOutForDelivery(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.order_out_for_delivery.title', body_key: 'notif.order_out_for_delivery.body', type: NotificationType.ORDER, priority: NotificationPriority.HIGH, action: { route: `/orders/${p.order_id}/tracking` } });
  }
  @OnEvent('order.cancelled')
  async onOrderCancelled(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.order_cancelled.title', body_key: 'notif.order_cancelled.body', type: NotificationType.ORDER, priority: NotificationPriority.HIGH });
  }
  @OnEvent('order.partially_fulfilled')
  async onOrderPartial(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.order_partial.title', body_key: 'notif.order_partial.body', type: NotificationType.ORDER, action: { route: `/orders/${p.order_id}` } });
  }
  // ============ APPOINTMENT Lifecycle (EventBus payload shape: patient_account_id) ============
  @OnEvent('doctor_appointment.created')
  async onApptCreated(p: any) {
    const uid = p.patient_account_id || p.patient_id;
    if (!uid) return;
    await this.create({ user_id: uid, title_key: 'notif.appt_created.title', body_key: 'notif.appt_created.body', type: NotificationType.INFO, action: { route: `/consultations/appointments` } });
    // Notify the doctor about the new booking
    if (p.meta?.doctor_id) {
      await this.create({ user_id: p.meta.doctor_id, title_key: 'notif.appt_new_for_doctor.title', body_key: 'notif.appt_new_for_doctor.body', type: NotificationType.INFO, priority: NotificationPriority.HIGH });
    }
  }
  @OnEvent('doctor_appointment.confirmed')
  async onApptConfirmed(p: any) {
    const uid = p.patient_account_id || p.patient_id;
    if (!uid) return;
    await this.create({ user_id: uid, title_key: 'notif.appt_confirmed.title', body_key: 'notif.appt_confirmed.body', type: NotificationType.INFO, priority: NotificationPriority.HIGH, action: { route: `/consultations/appointments` } });
  }
  @OnEvent('doctor_appointment.cancelled')
  async onApptCancelled(p: any) {
    const uid = p.patient_account_id || p.patient_id;
    if (!uid) return;
    await this.create({ user_id: uid, title_key: 'notif.appt_cancelled.title', body_key: 'notif.appt_cancelled.body', type: NotificationType.INFO, priority: NotificationPriority.HIGH });
  }
  @OnEvent('doctor_appointment.completed')
  async onApptCompleted(p: any) {
    const uid = p.patient_account_id || p.patient_id;
    if (!uid) return;
    await this.create({ user_id: uid, title_key: 'notif.appt_completed.title', body_key: 'notif.appt_completed.body', type: NotificationType.INFO, action: { route: `/consultations/appointments` } });
  }

  // ============ HOME NURSING Lifecycle ============
  @OnEvent('homecare.booking_created')
  async onHomecareCreated(p: any) {
    if (!p.patient_id) return;
    await this.create({ user_id: p.patient_id, title_key: 'notif.homecare_created.title', body_key: 'notif.homecare_created.body', type: NotificationType.INFO });
  }
  @OnEvent('homecare.booking_state_changed')
  async onHomecareState(p: any) {
    if (!p.patient_id) return;
    const key = ({
      PROVIDER_ASSIGNED: 'assigned', IN_TRANSIT: 'transit', ARRIVED: 'arrived',
      CARE_IN_PROGRESS: 'care', COMPLETED: 'completed', CANCELLED: 'cancelled', NO_SHOW: 'no_show',
    } as any)[p.state] || 'state';
    await this.create({
      user_id: p.patient_id,
      title_key: `notif.homecare_${key}.title`,
      body_key: `notif.homecare_${key}.body`,
      type: NotificationType.INFO,
      priority: ['ARRIVED', 'COMPLETED', 'CANCELLED'].includes(p.state) ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
      action: { route: `/nursing/tracking/${p.booking_id}` },
    });
  }

  // ============ RADIOLOGY Lifecycle ============
  /** Radiology events may carry the patient's Mongo _id instead of the app UUID — resolve. */
  private async resolveUserId(raw: any): Promise<string | null> {
    if (!raw) return null;
    const s = String(raw);
    if (s.includes('-')) return s; // app-level UUID already
    try {
      const u: any = await this.model.db.model('User').findOne({ _id: s }, { id: 1 }).lean();
      return u?.id || null;
    } catch { return null; }
  }

  @OnEvent('radiology.new_booking')
  async onRadBooking(p: any) {
    const uid = await this.resolveUserId(p.patientId || p.patient_id);
    if (!uid) return;
    await this.create({ user_id: uid, title_key: 'notif.rad_booked.title', body_key: 'notif.rad_booked.body', type: NotificationType.INFO });
  }
  @OnEvent('radiology.state_changed')
  async onRadState(p: any) {
    const key = p.state === 'REPORT_READY' ? 'ready' : p.state === 'CANCELLED' ? 'cancelled' : 'state';
    if (key === 'state') return; // only meaningful transitions notify the patient
    const uid = await this.resolveUserId(p.patientId || p.patient_id);
    if (!uid) return;
    await this.create({
      user_id: uid,
      title_key: `notif.rad_${key}.title`,
      body_key: `notif.rad_${key}.body`,
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { route: `/diagnostics/results-history` },
    });
  }

  @OnEvent('emergency.triggered')
  async onEmergency(p: any) {
    await this.create({ role: 'admin', title_key: 'notif.emergency.title', body_key: 'notif.emergency.body', type: NotificationType.EMERGENCY, priority: NotificationPriority.CRITICAL });
  }
  @OnEvent('prescription.created')
  async onRx(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.prescription_new.title', body_key: 'notif.prescription_new.body', type: NotificationType.PRESCRIPTION });
  }
  @OnEvent('medicine.pending_review')
  async onMedPending(p: any) {
    await this.create({ role: 'admin', title_key: 'notif.medicine_pending.title', body_key: 'notif.medicine_pending.body', type: NotificationType.INFO });
  }
  @OnEvent('medication.missed')
  async onMissed(p: any) {
    if (p.patient_id) await this.create({ user_id: p.patient_id, title_key: 'notif.medication_missed.title', body_key: 'notif.medication_missed.body', type: NotificationType.MEDICATION, priority: NotificationPriority.HIGH });
  }

  // ============ LAB Lifecycle ============
  @OnEvent('lab.booking_created')
  async onLabBookingCreated(p: any) {
    if (!p.patient_id) return;
    await this.create({
      user_id: p.patient_id,
      title_key: 'notif.lab_booking_created.title',
      body_key: 'notif.lab_booking_created.body',
      params: { tracking_id: p.tracking_id },
      type: NotificationType.INFO,
      action: { route: `/labs/booking/view/${p.booking_id}` },
    });
  }
  @OnEvent('lab.booking_state_changed')
  async onLabBookingStateChanged(p: any) {
    if (!p.patient_id || !p.state || p.state === 'CREATED') return;
    const titleByState: Record<string, string> = {
      CONFIRMED: 'notif.lab_confirmed.title',
      SAMPLE_COLLECTED: 'notif.lab_sample_collected.title',
      PROCESSING: 'notif.lab_processing.title',
      IN_LAB: 'notif.lab_in_lab.title',
      RESULT_READY: 'notif.lab_result_ready.title',
      REPORTED: 'notif.lab_reported.title',
      CANCELLED: 'notif.lab_cancelled.title',
    };
    const bodyByState: Record<string, string> = {
      CONFIRMED: 'notif.lab_confirmed.body',
      SAMPLE_COLLECTED: 'notif.lab_sample_collected.body',
      PROCESSING: 'notif.lab_processing.body',
      IN_LAB: 'notif.lab_in_lab.body',
      RESULT_READY: 'notif.lab_result_ready.body',
      REPORTED: 'notif.lab_reported.body',
      CANCELLED: 'notif.lab_cancelled.body',
    };
    const tk = titleByState[p.state]; const bk = bodyByState[p.state];
    if (!tk) return;
    await this.create({
      user_id: p.patient_id, title_key: tk, body_key: bk,
      params: { tracking_id: p.tracking_id },
      type: NotificationType.INFO,
      priority: p.state === 'RESULT_READY' || p.state === 'REPORTED' ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
      action: { route: `/labs/booking/view/${p.booking_id}` },
    });
  }
  @OnEvent('lab.report_uploaded')
  async onLabReportUploaded(p: any) {
    if (!p.patient_id) return;
    await this.create({
      user_id: p.patient_id,
      title_key: 'notif.lab_result_ready.title',
      body_key: 'notif.lab_result_ready.body',
      params: { tracking_id: p.tracking_id },
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { route: `/labs/bookings/${p.booking_id}` },
    });
  }

  @OnEvent('lab.result_ready')
  async onLabResultReady(p: any) {
    if (!p.patient_id) return;
    await this.create({
      user_id: p.patient_id,
      title_key: p.critical ? 'notif.lab_result_critical.title' : 'notif.lab_result_ready.title',
      body_key: p.critical ? 'notif.lab_result_critical.body' : 'notif.lab_result_ready.body',
      params: { tracking_id: p.tracking_id },
      type: NotificationType.INFO,
      priority: p.critical ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
      action: { route: `/health/results/${p.result_id}` },
    });
  }

  // ============ RADIOLOGY Lifecycle ============
  @OnEvent('radiology.booking_created')
  async onRadBookingCreated(p: any) {
    if (!p.patient_id) return;
    await this.create({
      user_id: p.patient_id,
      title_key: 'notif.radiology_booking_created.title',
      body_key: 'notif.radiology_booking_created.body',
      params: { tracking_id: p.tracking_id },
      type: NotificationType.INFO,
      action: { route: `/radiology/booking/view/${p.booking_id}` },
    });
  }
  @OnEvent('radiology.booking_state_changed')
  async onRadBookingStateChanged(p: any) {
    if (!p.patient_id || !p.state || p.state === 'PENDING') return;
    const titleByState: Record<string, string> = {
      CONFIRMED: 'notif.radiology_confirmed.title',
      SCHEDULED: 'notif.radiology_scheduled.title',
      IN_PROGRESS: 'notif.radiology_in_progress.title',
      COMPLETED: 'notif.radiology_completed.title',
      REPORT_PUBLISHED: 'notif.radiology_report_published.title',
      CANCELLED: 'notif.radiology_cancelled.title',
    };
    const bodyByState: Record<string, string> = {
      CONFIRMED: 'notif.radiology_confirmed.body',
      SCHEDULED: 'notif.radiology_scheduled.body',
      IN_PROGRESS: 'notif.radiology_in_progress.body',
      COMPLETED: 'notif.radiology_completed.body',
      REPORT_PUBLISHED: 'notif.radiology_report_published.body',
      CANCELLED: 'notif.radiology_cancelled.body',
    };
    const tk = titleByState[p.state]; const bk = bodyByState[p.state];
    if (!tk) return;
    await this.create({
      user_id: p.patient_id, title_key: tk, body_key: bk,
      params: { tracking_id: p.tracking_id },
      type: NotificationType.INFO,
      priority: p.state === 'REPORT_PUBLISHED' ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
      action: { route: `/radiology/booking/view/${p.booking_id}` },
    });
  }
  @OnEvent('radiology.report_published')
  async onRadReportPublished(p: any) {
    if (!p.patient_id) return;
    await this.create({
      user_id: p.patient_id,
      title_key: p.critical ? 'notif.radiology_report_critical.title' : 'notif.radiology_report_published.title',
      body_key: p.critical ? 'notif.radiology_report_critical.body' : 'notif.radiology_report_published.body',
      type: NotificationType.INFO,
      priority: p.critical ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
      action: { route: `/health/results/${p.result_id}` },
    });
  }

  // ============ MEDICAL REPORTS ============
  @OnEvent('medical_report.created')
  async onMedReport(p: any) {
    if (!p.patient_id) return;
    await this.create({
      user_id: p.patient_id,
      title_key: p.critical ? 'notif.medical_report_critical.title' : 'notif.medical_report_new.title',
      body_key: p.critical ? 'notif.medical_report_critical.body' : 'notif.medical_report_new.body',
      params: { tracking_id: p.tracking_id },
      type: NotificationType.INFO,
      priority: p.critical ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
      action: { route: `/health/reports/${p.id}` },
    });
  }

  // ============ EPIC4/S20: Family scenarios ============
  @OnEvent('family.invite_accepted')
  async onFamilyInviteAccepted(p: any) {
    if (!p?.owner_id) return;
    await this.create({
      user_id: p.owner_id,
      title_key: 'notif.family_member_joined.title',
      body_key: 'notif.family_member_joined.body',
      type: NotificationType.INFO,
      action: { route: '/family/hub' },
    });
  }
  @OnEvent('family.permission_requested')
  async onFamilyPermissionRequested(p: any) {
    if (!p?.owner_id) return;
    await this.create({
      user_id: p.owner_id,
      title_key: 'notif.family_perm_requested.title',
      body_key: 'notif.family_perm_requested.body',
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { route: '/family/permission-request' },
    });
  }
  @OnEvent('family.permission_responded')
  async onFamilyPermissionResponded(p: any) {
    if (!p?.requester_id) return;
    const approved = p.decision === 'approved';
    await this.create({
      user_id: p.requester_id,
      title_key: approved ? 'notif.family_perm_approved.title' : 'notif.family_perm_rejected.title',
      body_key: approved ? 'notif.family_perm_approved.body' : 'notif.family_perm_rejected.body',
      type: NotificationType.INFO,
      action: { route: '/family/hub' },
    });
  }
  @OnEvent('family.permissions_updated')
  async onFamilyPermissionsUpdated(p: any) {
    if (!p?.member_id) return;
    await this.create({
      user_id: p.member_id,
      title_key: 'notif.family_perms_updated.title',
      body_key: 'notif.family_perms_updated.body',
      type: NotificationType.INFO,
      action: { route: '/family/hub' },
    });
  }

  // ============ EPIC4/S20: Referral scenarios ============
  @OnEvent('referral.converted')
  async onReferralConverted(p: any) {
    if (!p?.user_id) return;
    await this.create({
      user_id: p.user_id,
      title_key: 'notif.referral_converted.title',
      body_key: 'notif.referral_converted.body',
      type: NotificationType.PROMO,
      action: { route: '/loyalty/referrals' },
    });
  }
  @OnEvent('referral.welcome_bonus')
  async onReferralWelcome(p: any) {
    if (!p?.user_id) return;
    await this.create({
      user_id: p.user_id,
      title_key: 'notif.referral_welcome.title',
      body_key: 'notif.referral_welcome.body',
      type: NotificationType.PROMO,
      action: { route: '/loyalty/hub' },
    });
  }

  // ============ EPIC4/S20: Points / loyalty scenarios ============
  @OnEvent('loyalty.points_awarded')
  async onPointsAwarded(p: any) {
    if (!p?.user_id || !p?.points) return;
    if (p.tier_changed && p.new_tier) {
      await this.create({
        user_id: p.user_id,
        title_key: 'notif.tier_upgraded.title',
        body_key: 'notif.tier_upgraded.body',
        params: { tier: p.new_tier },
        type: NotificationType.PROMO,
        priority: NotificationPriority.HIGH,
        action: { route: '/loyalty/hub' },
      });
      return; // one meaningful notification beats two noisy ones
    }
    if (p.reason === 'challenge_completed') {
      await this.create({
        user_id: p.user_id,
        title_key: 'notif.challenge_completed.title',
        body_key: 'notif.challenge_completed.body',
        params: { points: p.points },
        type: NotificationType.PROMO,
        action: { route: '/loyalty/challenges' },
      });
    }
    // Routine per-action points are intentionally silent — the user sees them
    // in the loyalty hub; push-spamming every +10 would be terrible UX.
  }

  // ============ EPIC4/S20: Community scenarios ============
  @OnEvent('community.comment_added')
  async onCommunityComment(p: any) {
    if (!p?.post_author_id) return;
    await this.create({
      user_id: p.post_author_id,
      title_key: 'notif.community_reply.title',
      body_key: 'notif.community_reply.body',
      type: NotificationType.INFO,
      action: { route: `/community/post-detail?id=${p.post_id}` },
    });
  }

  // ============ EPIC4/S20: AI scenarios ============
  @OnEvent('ai.triage_completed')
  async onAiTriageCompleted(p: any) {
    if (!p?.patient_id || p.patient_id === 'guest') return;
    if (p.urgency !== 'emergency' && p.urgency !== 'urgent') return; // only flag concerning triages
    await this.create({
      user_id: p.patient_id,
      title_key: p.urgency === 'emergency' ? 'notif.ai_triage_emergency.title' : 'notif.ai_triage_urgent.title',
      body_key: p.urgency === 'emergency' ? 'notif.ai_triage_emergency.body' : 'notif.ai_triage_urgent.body',
      type: NotificationType.ALERT,
      priority: p.urgency === 'emergency' ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
      action: { route: '/ai/symptom-timeline' },
    });
  }

  // ============ EPIC5/S3: Insurance decisions (approval / rejection) ============
  @OnEvent('insurance.decided')
  async onInsuranceDecided(p: any) {
    if (!p?.patient_id) return;
    const approved = ['approved', 'partially_approved', 'partial_approval', 'APPROVED'].includes(p.state);
    await this.create({
      user_id: p.patient_id,
      title_key: approved ? 'notif.insurance_approved.title' : 'notif.insurance_rejected.title',
      body_key: approved ? 'notif.insurance_approved.body' : 'notif.insurance_rejected.body',
      params: approved && p.copay_amount != null ? { amount: p.copay_amount } : {},
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { route: '/insurance/hub' },
    });
  }

  // ============ EPIC5/S3: Finance — payout approved / refund rejected ============
  @OnEvent('finance.operation.executed')
  async onFinanceOperationExecuted(p: any) {
    const providerId = p?.payload?.provider_account_id || p?.payload?.provider_id;
    if (!providerId) return; // only provider-facing ops (payouts) notify here
    await this.create({
      user_id: providerId,
      title_key: 'notif.payout_approved.title',
      body_key: 'notif.payout_approved.body',
      params: p?.payload?.amount != null ? { amount: p.payload.amount } : {},
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { route: '/provider/payouts' },
    });
  }
  @OnEvent('finance.operation.rejected')
  async onFinanceOperationRejected(p: any) {
    const pid = p?.payload?.patient_id;
    if (!pid) return;
    await this.create({
      user_id: pid,
      title_key: 'notif.refund_rejected.title',
      body_key: 'notif.refund_rejected.body',
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { route: '/returns/hub' },
    });
  }

  // ============ EPIC5/S3: Payment received (in-app record; push already via push.module) ============
  @OnEvent('payment.completed')
  async onPaymentCompletedInApp(p: any) {
    if (!p?.patient_id) return;
    await this.create({
      user_id: p.patient_id,
      title_key: 'notif.payment_received.title',
      body_key: 'notif.payment_received.body',
      params: p.amount != null ? { amount: p.amount } : {},
      type: NotificationType.INFO,
      action: { route: '/orders' },
    });
  }
}
