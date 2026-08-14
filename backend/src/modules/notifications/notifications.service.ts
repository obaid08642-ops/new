// @ts-nocheck
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Notification, NotificationDocument } from '../../schemas/notification.schema';
import { NotificationPriority, NotificationType } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { NotificationRepository } from "./repositories/notification.repository";
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { SmsService } from '../sms/sms.service';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private logger = new Logger('Notifications');
  constructor(
    @Inject('NotificationRepository') private model: NotificationRepository,
    private events: EventEmitter2,
    private smsService: SmsService,
  ) {}

  async create(data: {
    user_id?: string; role?: string;
    title_key: string; body_key: string;
    params?: any; type?: NotificationType; priority?: NotificationPriority;
    action?: any;
  }) {
    const n = await this.model.create({
      user_id: data.user_id,
      role: data.role,
      title_key: data.title_key,
      body_key: data.body_key,
      params: data.params || {},
      type: data.type || NotificationType.INFO,
      priority: data.priority || NotificationPriority.NORMAL,
      action: data.action,
    });
    this.events.emit(EVENTS.NOTIFICATION_CREATED, { id: n.id, user_id: n.user_id, role: n.role, title_key: n.title_key, body_key: n.body_key, priority: n.priority });
    
    // Broadcast notification to multiple adapters (Push, SMS, Email, WhatsApp)
    await this.broadcast(n);
    return n.toObject();
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

  async sendPush(n: any) {
    if (!process.env.FIREBASE_PROJECT_ID) {
      this.logger.debug(`Push payload: ${n.title_key} → ${n.user_id || n.role}`);
      return;
    }
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }
      
      const payload = {
        notification: { title: n.title_key, body: n.body_key },
        data: { action: JSON.stringify(n.action || {}) }
      };

      if (n.user_id) {
        const userTokens = await this.model.db.model('DeviceToken').find({ user_id: n.user_id }).lean();
        const tokens = userTokens.map((t: any) => t.token);
        if (tokens.length > 0) {
          await admin.messaging().sendEachForMulticast({ tokens, ...payload });
        }
      } else if (n.role) {
        await admin.messaging().send({ topic: n.role, ...payload });
      }
    } catch (e) {
      this.logger.error('Failed to send Firebase Push', e.stack);
    }
  }

  async sendSms(n: any, phone: string) {
    await this.smsService.sendOtp(phone, n.title_key + ' - ' + n.body_key);
  }

  async sendEmail(n: any, email: string) {
    if (!process.env.SMTP_HOST) {
      this.logger.debug(`Email queued to ${email} for event: ${n.title_key}`);
      return;
    }
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Nabdah Plus" <no-reply@nabdah.com>',
        to: email,
        subject: n.title_key,
        text: n.body_key,
      });
    } catch (e) {
      this.logger.error('Failed to send Email', e.stack);
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
    return this.model.find(
      { $or: [{ user_id: user.id }, { role: user.role }, { role: 'all' }] },
      { _id: 0, __v: 0 },
    ).sort({ createdAt: -1 }).limit(200);
  }

  async markRead(id: string, user: any) {
    await this.model.updateOne({ id }, { $addToSet: { read_by: user.id } });
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
}
