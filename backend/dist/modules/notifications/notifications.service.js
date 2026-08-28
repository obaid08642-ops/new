"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const i18n_service_1 = require("../i18n/i18n.service");
const common_2 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const enums_1 = require("../../common/enums");
const events_1 = require("../../common/events");
const notification_repository_1 = require("./repositories/notification.repository");
const firebase_admin_1 = require("firebase-admin");
const messaging_1 = require("firebase-admin/messaging");
const sms_service_1 = require("../sms/sms.service");
const mail_module_1 = require("../mail/mail.module");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const axios_1 = __importDefault(require("axios"));
let NotificationsService = class NotificationsService {
    constructor(model, events, smsService, mail, queue, i18n) {
        this.model = model;
        this.events = events;
        this.smsService = smsService;
        this.mail = mail;
        this.queue = queue;
        this.i18n = i18n;
        this.logger = new common_1.Logger('Notifications');
    }
    async create(data) {
        const sched = data.scheduled_at ? new Date(data.scheduled_at) : null;
        const delay = sched ? sched.getTime() - Date.now() : 0;
        const titleKey = data.title_key || data.title;
        const bodyKey = data.body_key || data.body;
        if (!titleKey || !bodyKey)
            throw new common_1.BadRequestException('title/body (or title_key/body_key) are required');
        const n = await this.model.create({
            user_id: data.user_id,
            role: data.role,
            title_key: titleKey,
            body_key: bodyKey,
            params: data.params || {},
            type: data.type || enums_1.NotificationType.INFO,
            priority: data.priority || enums_1.NotificationPriority.NORMAL,
            action: data.action,
            scheduled_at: sched || undefined,
            status: delay > 5000 ? 'SCHEDULED' : 'PENDING',
        });
        this.events.emit(events_1.EVENTS.NOTIFICATION_CREATED, { id: n.id, user_id: n.user_id, role: n.role, title_key: n.title_key, body_key: n.body_key, priority: n.priority });
        await this.enqueueDelivery(n.id, Math.max(delay, 0));
        return n.toObject();
    }
    async enqueueDelivery(id, delayMs = 0) {
        try {
            await this.queue.add('deliver', { id }, {
                jobId: `deliver:${id}`,
                delay: delayMs,
                attempts: 4,
                backoff: { type: 'exponential', delay: 30000 },
                removeOnComplete: 100,
                removeOnFail: 500,
            });
        }
        catch (e) {
            this.logger.error(`Delivery queue unavailable (${e.message}) — falling back to direct delivery`);
            await this.deliverById(id).catch((err) => this.logger.error(`Direct delivery failed: ${err.message}`));
        }
    }
    async deliverById(id) {
        const n = await this.model.findOne({ id });
        if (!n) {
            this.logger.warn(`deliverById: notification ${id} not found`);
            return;
        }
        const prev = n.delivery || {};
        const bump = (ch, ok, err) => ({
            status: ok ? 'SENT' : 'FAILED',
            attempts: (prev[ch]?.attempts || 0) + 1,
            ...(err ? { last_error: String(err).slice(0, 300) } : {}),
            ...(ok ? { sent_at: new Date() } : {}),
        });
        const delivery = {};
        try {
            const sent = await this.sendPush(n);
            delivery.push = bump('push', sent !== false);
        }
        catch (e) {
            delivery.push = bump('push', false, e.message);
        }
        if (n.user_id) {
            try {
                const user = (await this.model.db.model('User').findOne({ id: n.user_id }).lean());
                if (user?.phone) {
                    try {
                        await this.sendSms(n, user.phone);
                        delivery.sms = bump('sms', true);
                    }
                    catch (e) {
                        delivery.sms = bump('sms', false, e.message);
                    }
                    try {
                        await this.sendWhatsApp(n, user.phone);
                        delivery.whatsapp = bump('whatsapp', true);
                    }
                    catch (e) {
                        delivery.whatsapp = bump('whatsapp', false, e.message);
                    }
                }
                if (user?.email) {
                    try {
                        await this.sendEmail(n, user.email);
                        delivery.email = bump('email', true);
                    }
                    catch (e) {
                        delivery.email = bump('email', false, e.message);
                    }
                }
            }
            catch (e) {
                this.logger.error('Failed resolving user channels', e.message);
            }
        }
        const vals = Object.values(delivery);
        const anySent = vals.some(v => v.status === 'SENT');
        const anyFailed = vals.some(v => v.status === 'FAILED');
        const status = vals.length === 0 ? 'SENT' : anySent && anyFailed ? 'PARTIAL' : anySent ? 'SENT' : 'FAILED';
        await this.model.updateOne({ id }, { $set: { delivery, status, sent_push: delivery.push?.status === 'SENT' } });
        if (status === 'FAILED')
            throw new Error(`notification ${id}: all channels failed`);
    }
    async deliveryStats() {
        const rows = await this.model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        const by_status = {};
        for (const r of rows)
            by_status[r._id || 'UNKNOWN'] = r.count;
        return { by_status, total: rows.reduce((s, r) => s + r.count, 0) };
    }
    async broadcast(n) {
        await this.sendPush(n);
        if (n.user_id) {
            try {
                const user = (await this.model.db.model('User').findOne({ id: n.user_id }).lean());
                if (user) {
                    if (user.phone) {
                        await this.sendSms(n, user.phone);
                        await this.sendWhatsApp(n, user.phone);
                    }
                    if (user.email) {
                        await this.sendEmail(n, user.email);
                    }
                }
            }
            catch (err) {
                this.logger.error('Failed to broadcast to multi-channel adapters', err);
            }
        }
    }
    async sendPush(n) {
        const dataPayload = {
            type: String(n.type || 'info'),
            action: JSON.stringify(n.action || {}),
        };
        if (n.action?.route)
            dataPayload.screen = String(n.action.route);
        if (n.action?.payload)
            dataPayload.params = JSON.stringify(n.action.payload);
        let sent = false;
        if (n.user_id) {
            const userTokens = await this.model.db.model('PushToken').find({ user_id: n.user_id, active: true }).lean();
            const tokens = userTokens.map((t) => ({ token: t.token, provider: t.provider })).filter((t) => t.token);
            const expoTokens = tokens.filter((t) => t.provider === 'expo' || t.token.startsWith('ExponentPushToken')).map((t) => t.token);
            const fcmTokens = tokens.filter((t) => t.provider === 'fcm' && !t.token.startsWith('ExponentPushToken')).map((t) => t.token);
            if (expoTokens.length > 0) {
                sent = (await this.sendExpoPush(expoTokens, n, dataPayload)) || sent;
            }
            if (fcmTokens.length > 0) {
                sent = (await this.sendFcmPush(fcmTokens, n, dataPayload)) || sent;
            }
        }
        else if (n.role) {
            sent = (await this.sendFcmPush(null, n, dataPayload, n.role)) || sent;
        }
        return sent;
    }
    async sendFcmPush(tokens, n, dataPayload, topic) {
        const fbProjectId = process.env.FIREBASE_PROJECT_ID || process.env.FCM_PROJECT_ID;
        const fbClientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FCM_CLIENT_EMAIL;
        const fbPrivateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FCM_PRIVATE_KEY;
        if (!fbProjectId || !fbClientEmail || !fbPrivateKey) {
            this.logger.debug(`Push payload: ${n.title_key} → ${n.user_id || n.role}`);
            return false;
        }
        if ((0, firebase_admin_1.getApps)().length === 0) {
            (0, firebase_admin_1.initializeApp)({
                credential: (0, firebase_admin_1.cert)({
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
            const res = await (0, messaging_1.getMessaging)().sendEachForMulticast({ tokens, ...payload });
            return res.successCount > 0;
        }
        if (topic) {
            await (0, messaging_1.getMessaging)().send({ topic, ...payload });
            return true;
        }
        return false;
    }
    async sendExpoPush(tokens, n, dataPayload) {
        try {
            const messages = tokens.map((to) => ({
                to,
                title: n.title_key,
                body: n.body_key,
                data: dataPayload,
                sound: n.priority === 'HIGH' || n.priority === 'CRITICAL' ? 'default' : undefined,
            }));
            const res = await axios_1.default.post('https://exp.host/--/api/v2/push/send', messages, {
                headers: { 'Content-Type': 'application/json' },
            });
            const receipts = Array.isArray(res.data?.data) ? res.data.data : [];
            return receipts.some((r) => r.status === 'ok');
        }
        catch (e) {
            this.logger.error('Expo push failed', e.message);
            return false;
        }
    }
    async sendSms(n, phone) {
        await this.smsService.sendOtp(phone, n.title_key + ' - ' + n.body_key);
    }
    async sendEmail(n, email) {
        try {
            const result = await this.mail.send(email, n.title_key, `<div dir="rtl" style="font-family: system-ui, sans-serif; text-align: right;"><h3>${n.title_key}</h3><p>${n.body_key}</p></div>`, n.body_key);
            if (!result.ok)
                throw new Error(result.error || 'mail_failed');
        }
        catch (e) {
            this.logger.error('Failed to send Email', e.stack);
            throw e;
        }
    }
    async sendWhatsApp(n, phone) {
        if (!process.env.INFOBIP_API_KEY) {
            this.logger.debug(`WhatsApp queued to ${phone} for event: ${n.title_key}`);
            return;
        }
        try {
            await axios_1.default.post(`https://${process.env.INFOBIP_URL}/whatsapp/1/message/template`, {
                messages: [{
                        from: process.env.INFOBIP_SENDER,
                        to: phone,
                        content: { templateName: n.title_key, templateData: { body: { placeholders: [n.body_key] } }, language: 'ar' }
                    }]
            }, { headers: { Authorization: `App ${process.env.INFOBIP_API_KEY}` } });
        }
        catch (e) {
            this.logger.error('Failed to send WhatsApp', e.message);
        }
    }
    async listForUser(user) {
        const rows = await this.model.find({ $or: [{ user_id: user.id }, { role: user.role }, { role: 'all' }] }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
        const lang = user?.lang || 'ar';
        return rows.map((r) => {
            const o = typeof r.toObject === 'function' ? r.toObject() : r;
            return {
                ...o,
                title: this.i18n.t(o.title_key, lang, o.params),
                body: this.i18n.t(o.body_key, lang, o.params),
                read: Array.isArray(o.read_by) ? o.read_by.includes(user.id) : false,
            };
        });
    }
    async markRead(id, user) {
        const result = await this.model.updateOne({ id, $or: [{ user_id: user.id }, { role: user.role }, { role: 'all' }] }, { $addToSet: { read_by: user.id } });
        const matched = result?.matchedCount ?? result?.nMatched;
        if (matched === 0)
            throw new common_2.NotFoundException('notification_not_found');
        return { ok: true };
    }
    async markAllRead(user) {
        await this.model.updateMany({ $or: [{ user_id: user.id }, { role: user.role }, { role: 'all' }] }, { $addToSet: { read_by: user.id } });
        return { ok: true };
    }
    async onServiceRequested(p) {
        const pid = p.patient_account_id || p.actor_account_id;
        if (pid)
            await this.create({ user_id: pid, title_key: 'notif.service.requested.title', body_key: 'notif.service.requested.body', type: enums_1.NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
    }
    async onServiceMatched(p) {
        const pid = p.patient_account_id;
        if (pid)
            await this.create({ user_id: pid, title_key: 'notif.service.matched.title', body_key: 'notif.service.matched.body', type: enums_1.NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
    }
    async onServiceAssigned(p) {
        if (p.patient_account_id)
            await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.assigned.title', body_key: 'notif.service.assigned.body', type: enums_1.NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
        await this.create({ role: 'provider', title_key: 'notif.new_job.title', body_key: 'notif.new_job.body', type: enums_1.NotificationType.ORDER, priority: enums_1.NotificationPriority.HIGH });
    }
    async onServiceConfirmed(p) {
        if (p.patient_account_id)
            await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.confirmed.title', body_key: 'notif.service.confirmed.body', type: enums_1.NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
    }
    async onServiceStarted(p) {
        if (p.patient_account_id)
            await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.started.title', body_key: 'notif.service.started.body', type: enums_1.NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
    }
    async onServiceCompleted(p) {
        if (p.patient_account_id)
            await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.completed.title', body_key: 'notif.service.completed.body', type: enums_1.NotificationType.ORDER, action: { route: `/tracking/${this.routeKind(p)}/${p.entity_id}` } });
    }
    async onServiceCancelled(p) {
        if (p.patient_account_id)
            await this.create({ user_id: p.patient_account_id, title_key: 'notif.service.cancelled.title', body_key: 'notif.service.cancelled.body', type: enums_1.NotificationType.ORDER });
    }
    async onServiceRollback(p) {
        await this.create({ role: 'admin', title_key: 'notif.service.rollback.title', body_key: 'notif.service.rollback.body', type: enums_1.NotificationType.ALERT, priority: enums_1.NotificationPriority.CRITICAL });
    }
    routeKind(p) {
        const k = p?.meta?.kind || p?.entity_type;
        if (!k)
            return 'pharmacy';
        if (['order', 'pharmacy'].includes(k))
            return 'pharmacy';
        if (['lab_booking', 'lab'].includes(k))
            return 'lab';
        if (['radiology_booking', 'radiology'].includes(k))
            return 'radiology';
        if (['nursing_booking', 'nursing'].includes(k))
            return 'nursing';
        if (['appointment', 'consultation'].includes(k))
            return 'consultation';
        return 'pharmacy';
    }
    async onOrderCreated(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.order_created.title', body_key: 'notif.order_created.body', type: enums_1.NotificationType.ORDER, action: { route: `/orders/${p.order_id}` } });
    }
    async onOrderPharm(p) {
        await this.create({ role: 'pharmacy', title_key: 'notif.new_order.title', body_key: 'notif.new_order.body', type: enums_1.NotificationType.ORDER, priority: enums_1.NotificationPriority.CRITICAL });
    }
    async onOrderAccepted(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.order_accepted.title', body_key: 'notif.order_accepted.body', type: enums_1.NotificationType.ORDER });
    }
    async onOrderRejected(p) {
        await this.create({ role: 'admin', title_key: 'notif.order_rejected.title', body_key: 'notif.order_rejected.body', type: enums_1.NotificationType.ORDER, priority: enums_1.NotificationPriority.HIGH });
    }
    async onOrderDelivered(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.order_delivered.title', body_key: 'notif.order_delivered.body', type: enums_1.NotificationType.ORDER });
    }
    async onOrderEscalated(p) {
        await this.create({ role: 'admin', title_key: 'notif.order_escalated.title', body_key: 'notif.order_escalated.body', type: enums_1.NotificationType.ALERT, priority: enums_1.NotificationPriority.CRITICAL });
    }
    async onOrderPreparing(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.order_preparing.title', body_key: 'notif.order_preparing.body', type: enums_1.NotificationType.ORDER, action: { route: `/orders/${p.order_id}/tracking` } });
    }
    async onOrderReady(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.order_ready.title', body_key: 'notif.order_ready.body', type: enums_1.NotificationType.ORDER, priority: enums_1.NotificationPriority.HIGH, action: { route: `/orders/${p.order_id}/tracking` } });
    }
    async onOrderAssignedDelivery(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.order_driver_assigned.title', body_key: 'notif.order_driver_assigned.body', type: enums_1.NotificationType.ORDER, action: { route: `/orders/${p.order_id}/tracking` } });
    }
    async onOrderOutForDelivery(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.order_out_for_delivery.title', body_key: 'notif.order_out_for_delivery.body', type: enums_1.NotificationType.ORDER, priority: enums_1.NotificationPriority.HIGH, action: { route: `/orders/${p.order_id}/tracking` } });
    }
    async onOrderCancelled(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.order_cancelled.title', body_key: 'notif.order_cancelled.body', type: enums_1.NotificationType.ORDER, priority: enums_1.NotificationPriority.HIGH });
    }
    async onOrderPartial(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.order_partial.title', body_key: 'notif.order_partial.body', type: enums_1.NotificationType.ORDER, action: { route: `/orders/${p.order_id}` } });
    }
    async onApptCreated(p) {
        const uid = p.patient_account_id || p.patient_id;
        if (!uid)
            return;
        await this.create({ user_id: uid, title_key: 'notif.appt_created.title', body_key: 'notif.appt_created.body', type: enums_1.NotificationType.INFO, action: { route: `/consultations/appointments` } });
        if (p.meta?.doctor_id) {
            await this.create({ user_id: p.meta.doctor_id, title_key: 'notif.appt_new_for_doctor.title', body_key: 'notif.appt_new_for_doctor.body', type: enums_1.NotificationType.INFO, priority: enums_1.NotificationPriority.HIGH });
        }
    }
    async onApptConfirmed(p) {
        const uid = p.patient_account_id || p.patient_id;
        if (!uid)
            return;
        await this.create({ user_id: uid, title_key: 'notif.appt_confirmed.title', body_key: 'notif.appt_confirmed.body', type: enums_1.NotificationType.INFO, priority: enums_1.NotificationPriority.HIGH, action: { route: `/consultations/appointments` } });
    }
    async onApptCancelled(p) {
        const uid = p.patient_account_id || p.patient_id;
        if (!uid)
            return;
        await this.create({ user_id: uid, title_key: 'notif.appt_cancelled.title', body_key: 'notif.appt_cancelled.body', type: enums_1.NotificationType.INFO, priority: enums_1.NotificationPriority.HIGH });
    }
    async onApptCompleted(p) {
        const uid = p.patient_account_id || p.patient_id;
        if (!uid)
            return;
        await this.create({ user_id: uid, title_key: 'notif.appt_completed.title', body_key: 'notif.appt_completed.body', type: enums_1.NotificationType.INFO, action: { route: `/consultations/appointments` } });
    }
    async onHomecareCreated(p) {
        if (!p.patient_id)
            return;
        await this.create({ user_id: p.patient_id, title_key: 'notif.homecare_created.title', body_key: 'notif.homecare_created.body', type: enums_1.NotificationType.INFO });
    }
    async onHomecareState(p) {
        if (!p.patient_id)
            return;
        const key = {
            PROVIDER_ASSIGNED: 'assigned', IN_TRANSIT: 'transit', ARRIVED: 'arrived',
            CARE_IN_PROGRESS: 'care', COMPLETED: 'completed', CANCELLED: 'cancelled', NO_SHOW: 'no_show',
        }[p.state] || 'state';
        await this.create({
            user_id: p.patient_id,
            title_key: `notif.homecare_${key}.title`,
            body_key: `notif.homecare_${key}.body`,
            type: enums_1.NotificationType.INFO,
            priority: ['ARRIVED', 'COMPLETED', 'CANCELLED'].includes(p.state) ? enums_1.NotificationPriority.HIGH : enums_1.NotificationPriority.NORMAL,
            action: { route: `/nursing/tracking/${p.booking_id}` },
        });
    }
    async resolveUserId(raw) {
        if (!raw)
            return null;
        const s = String(raw);
        if (s.includes('-'))
            return s;
        try {
            const u = await this.model.db.model('User').findOne({ _id: s }, { id: 1 }).lean();
            return u?.id || null;
        }
        catch {
            return null;
        }
    }
    async onRadBooking(p) {
        const uid = await this.resolveUserId(p.patientId || p.patient_id);
        if (!uid)
            return;
        await this.create({ user_id: uid, title_key: 'notif.rad_booked.title', body_key: 'notif.rad_booked.body', type: enums_1.NotificationType.INFO });
    }
    async onRadState(p) {
        const key = p.state === 'REPORT_READY' ? 'ready' : p.state === 'CANCELLED' ? 'cancelled' : 'state';
        if (key === 'state')
            return;
        const uid = await this.resolveUserId(p.patientId || p.patient_id);
        if (!uid)
            return;
        await this.create({
            user_id: uid,
            title_key: `notif.rad_${key}.title`,
            body_key: `notif.rad_${key}.body`,
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.HIGH,
            action: { route: `/diagnostics/results-history` },
        });
    }
    async onEmergency(p) {
        await this.create({ role: 'admin', title_key: 'notif.emergency.title', body_key: 'notif.emergency.body', type: enums_1.NotificationType.EMERGENCY, priority: enums_1.NotificationPriority.CRITICAL });
    }
    async onRx(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.prescription_new.title', body_key: 'notif.prescription_new.body', type: enums_1.NotificationType.PRESCRIPTION });
    }
    async onMedPending(p) {
        await this.create({ role: 'admin', title_key: 'notif.medicine_pending.title', body_key: 'notif.medicine_pending.body', type: enums_1.NotificationType.INFO });
    }
    async onMissed(p) {
        if (p.patient_id)
            await this.create({ user_id: p.patient_id, title_key: 'notif.medication_missed.title', body_key: 'notif.medication_missed.body', type: enums_1.NotificationType.MEDICATION, priority: enums_1.NotificationPriority.HIGH });
    }
    async onLabBookingCreated(p) {
        if (!p.patient_id)
            return;
        await this.create({
            user_id: p.patient_id,
            title_key: 'notif.lab_booking_created.title',
            body_key: 'notif.lab_booking_created.body',
            params: { tracking_id: p.tracking_id },
            type: enums_1.NotificationType.INFO,
            action: { route: `/labs/booking/view/${p.booking_id}` },
        });
    }
    async onLabBookingStateChanged(p) {
        if (!p.patient_id || !p.state || p.state === 'CREATED')
            return;
        const titleByState = {
            CONFIRMED: 'notif.lab_confirmed.title',
            SAMPLE_COLLECTED: 'notif.lab_sample_collected.title',
            PROCESSING: 'notif.lab_processing.title',
            IN_LAB: 'notif.lab_in_lab.title',
            RESULT_READY: 'notif.lab_result_ready.title',
            REPORTED: 'notif.lab_reported.title',
            CANCELLED: 'notif.lab_cancelled.title',
        };
        const bodyByState = {
            CONFIRMED: 'notif.lab_confirmed.body',
            SAMPLE_COLLECTED: 'notif.lab_sample_collected.body',
            PROCESSING: 'notif.lab_processing.body',
            IN_LAB: 'notif.lab_in_lab.body',
            RESULT_READY: 'notif.lab_result_ready.body',
            REPORTED: 'notif.lab_reported.body',
            CANCELLED: 'notif.lab_cancelled.body',
        };
        const tk = titleByState[p.state];
        const bk = bodyByState[p.state];
        if (!tk)
            return;
        await this.create({
            user_id: p.patient_id, title_key: tk, body_key: bk,
            params: { tracking_id: p.tracking_id },
            type: enums_1.NotificationType.INFO,
            priority: p.state === 'RESULT_READY' || p.state === 'REPORTED' ? enums_1.NotificationPriority.HIGH : enums_1.NotificationPriority.NORMAL,
            action: { route: `/labs/booking/view/${p.booking_id}` },
        });
    }
    async onLabReportUploaded(p) {
        if (!p.patient_id)
            return;
        await this.create({
            user_id: p.patient_id,
            title_key: 'notif.lab_result_ready.title',
            body_key: 'notif.lab_result_ready.body',
            params: { tracking_id: p.tracking_id },
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.HIGH,
            action: { route: `/labs/bookings/${p.booking_id}` },
        });
    }
    async onLabResultReady(p) {
        if (!p.patient_id)
            return;
        await this.create({
            user_id: p.patient_id,
            title_key: p.critical ? 'notif.lab_result_critical.title' : 'notif.lab_result_ready.title',
            body_key: p.critical ? 'notif.lab_result_critical.body' : 'notif.lab_result_ready.body',
            params: { tracking_id: p.tracking_id },
            type: enums_1.NotificationType.INFO,
            priority: p.critical ? enums_1.NotificationPriority.CRITICAL : enums_1.NotificationPriority.HIGH,
            action: { route: `/health/results/${p.result_id}` },
        });
    }
    async onRadBookingCreated(p) {
        if (!p.patient_id)
            return;
        await this.create({
            user_id: p.patient_id,
            title_key: 'notif.radiology_booking_created.title',
            body_key: 'notif.radiology_booking_created.body',
            params: { tracking_id: p.tracking_id },
            type: enums_1.NotificationType.INFO,
            action: { route: `/radiology/booking/view/${p.booking_id}` },
        });
    }
    async onRadBookingStateChanged(p) {
        if (!p.patient_id || !p.state || p.state === 'PENDING')
            return;
        const titleByState = {
            CONFIRMED: 'notif.radiology_confirmed.title',
            SCHEDULED: 'notif.radiology_scheduled.title',
            IN_PROGRESS: 'notif.radiology_in_progress.title',
            COMPLETED: 'notif.radiology_completed.title',
            REPORT_PUBLISHED: 'notif.radiology_report_published.title',
            CANCELLED: 'notif.radiology_cancelled.title',
        };
        const bodyByState = {
            CONFIRMED: 'notif.radiology_confirmed.body',
            SCHEDULED: 'notif.radiology_scheduled.body',
            IN_PROGRESS: 'notif.radiology_in_progress.body',
            COMPLETED: 'notif.radiology_completed.body',
            REPORT_PUBLISHED: 'notif.radiology_report_published.body',
            CANCELLED: 'notif.radiology_cancelled.body',
        };
        const tk = titleByState[p.state];
        const bk = bodyByState[p.state];
        if (!tk)
            return;
        await this.create({
            user_id: p.patient_id, title_key: tk, body_key: bk,
            params: { tracking_id: p.tracking_id },
            type: enums_1.NotificationType.INFO,
            priority: p.state === 'REPORT_PUBLISHED' ? enums_1.NotificationPriority.HIGH : enums_1.NotificationPriority.NORMAL,
            action: { route: `/radiology/booking/view/${p.booking_id}` },
        });
    }
    async onRadReportPublished(p) {
        if (!p.patient_id)
            return;
        await this.create({
            user_id: p.patient_id,
            title_key: p.critical ? 'notif.radiology_report_critical.title' : 'notif.radiology_report_published.title',
            body_key: p.critical ? 'notif.radiology_report_critical.body' : 'notif.radiology_report_published.body',
            type: enums_1.NotificationType.INFO,
            priority: p.critical ? enums_1.NotificationPriority.CRITICAL : enums_1.NotificationPriority.HIGH,
            action: { route: `/health/results/${p.result_id}` },
        });
    }
    async onMedReport(p) {
        if (!p.patient_id)
            return;
        await this.create({
            user_id: p.patient_id,
            title_key: p.critical ? 'notif.medical_report_critical.title' : 'notif.medical_report_new.title',
            body_key: p.critical ? 'notif.medical_report_critical.body' : 'notif.medical_report_new.body',
            params: { tracking_id: p.tracking_id },
            type: enums_1.NotificationType.INFO,
            priority: p.critical ? enums_1.NotificationPriority.CRITICAL : enums_1.NotificationPriority.HIGH,
            action: { route: `/health/reports/${p.id}` },
        });
    }
    async onFamilyInviteAccepted(p) {
        if (!p?.owner_id)
            return;
        await this.create({
            user_id: p.owner_id,
            title_key: 'notif.family_member_joined.title',
            body_key: 'notif.family_member_joined.body',
            type: enums_1.NotificationType.INFO,
            action: { route: '/family/hub' },
        });
    }
    async onFamilyPermissionRequested(p) {
        if (!p?.owner_id)
            return;
        await this.create({
            user_id: p.owner_id,
            title_key: 'notif.family_perm_requested.title',
            body_key: 'notif.family_perm_requested.body',
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.HIGH,
            action: { route: '/family/permission-request' },
        });
    }
    async onFamilyPermissionResponded(p) {
        if (!p?.requester_id)
            return;
        const approved = p.decision === 'approved';
        await this.create({
            user_id: p.requester_id,
            title_key: approved ? 'notif.family_perm_approved.title' : 'notif.family_perm_rejected.title',
            body_key: approved ? 'notif.family_perm_approved.body' : 'notif.family_perm_rejected.body',
            type: enums_1.NotificationType.INFO,
            action: { route: '/family/hub' },
        });
    }
    async onFamilyPermissionsUpdated(p) {
        if (!p?.member_id)
            return;
        await this.create({
            user_id: p.member_id,
            title_key: 'notif.family_perms_updated.title',
            body_key: 'notif.family_perms_updated.body',
            type: enums_1.NotificationType.INFO,
            action: { route: '/family/hub' },
        });
    }
    async onReferralConverted(p) {
        if (!p?.user_id)
            return;
        await this.create({
            user_id: p.user_id,
            title_key: 'notif.referral_converted.title',
            body_key: 'notif.referral_converted.body',
            type: enums_1.NotificationType.PROMO,
            action: { route: '/loyalty/referrals' },
        });
    }
    async onReferralWelcome(p) {
        if (!p?.user_id)
            return;
        await this.create({
            user_id: p.user_id,
            title_key: 'notif.referral_welcome.title',
            body_key: 'notif.referral_welcome.body',
            type: enums_1.NotificationType.PROMO,
            action: { route: '/loyalty/hub' },
        });
    }
    async onPointsAwarded(p) {
        if (!p?.user_id || !p?.points)
            return;
        if (p.tier_changed && p.new_tier) {
            await this.create({
                user_id: p.user_id,
                title_key: 'notif.tier_upgraded.title',
                body_key: 'notif.tier_upgraded.body',
                params: { tier: p.new_tier },
                type: enums_1.NotificationType.PROMO,
                priority: enums_1.NotificationPriority.HIGH,
                action: { route: '/loyalty/hub' },
            });
            return;
        }
        if (p.reason === 'challenge_completed') {
            await this.create({
                user_id: p.user_id,
                title_key: 'notif.challenge_completed.title',
                body_key: 'notif.challenge_completed.body',
                params: { points: p.points },
                type: enums_1.NotificationType.PROMO,
                action: { route: '/loyalty/challenges' },
            });
        }
    }
    async onCommunityComment(p) {
        if (!p?.post_author_id)
            return;
        await this.create({
            user_id: p.post_author_id,
            title_key: 'notif.community_reply.title',
            body_key: 'notif.community_reply.body',
            type: enums_1.NotificationType.INFO,
            action: { route: `/community/post-detail?id=${p.post_id}` },
        });
    }
    async onAiTriageCompleted(p) {
        if (!p?.patient_id || p.patient_id === 'guest')
            return;
        if (p.urgency !== 'emergency' && p.urgency !== 'urgent')
            return;
        await this.create({
            user_id: p.patient_id,
            title_key: p.urgency === 'emergency' ? 'notif.ai_triage_emergency.title' : 'notif.ai_triage_urgent.title',
            body_key: p.urgency === 'emergency' ? 'notif.ai_triage_emergency.body' : 'notif.ai_triage_urgent.body',
            type: enums_1.NotificationType.ALERT,
            priority: p.urgency === 'emergency' ? enums_1.NotificationPriority.CRITICAL : enums_1.NotificationPriority.HIGH,
            action: { route: '/ai/symptom-timeline' },
        });
    }
    async onInsuranceDecided(p) {
        if (!p?.patient_id)
            return;
        const approved = ['approved', 'partially_approved', 'partial_approval', 'APPROVED'].includes(p.state);
        await this.create({
            user_id: p.patient_id,
            title_key: approved ? 'notif.insurance_approved.title' : 'notif.insurance_rejected.title',
            body_key: approved ? 'notif.insurance_approved.body' : 'notif.insurance_rejected.body',
            params: approved && p.copay_amount != null ? { amount: p.copay_amount } : {},
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.HIGH,
            action: { route: '/insurance/hub' },
        });
    }
    async onFinanceOperationExecuted(p) {
        const providerId = p?.payload?.provider_account_id || p?.payload?.provider_id;
        if (!providerId)
            return;
        await this.create({
            user_id: providerId,
            title_key: 'notif.payout_approved.title',
            body_key: 'notif.payout_approved.body',
            params: p?.payload?.amount != null ? { amount: p.payload.amount } : {},
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.HIGH,
            action: { route: '/wallet/hub' },
        });
    }
    async onFinanceOperationRejected(p) {
        const pid = p?.payload?.patient_id;
        if (!pid)
            return;
        await this.create({
            user_id: pid,
            title_key: 'notif.refund_rejected.title',
            body_key: 'notif.refund_rejected.body',
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.HIGH,
            action: { route: '/returns/hub' },
        });
    }
    async onPaymentCompletedInApp(p) {
        if (!p?.patient_id)
            return;
        await this.create({
            user_id: p.patient_id,
            title_key: 'notif.payment_received.title',
            body_key: 'notif.payment_received.body',
            params: p.amount != null ? { amount: p.amount } : {},
            type: enums_1.NotificationType.INFO,
            action: { route: '/wallet/hub' },
        });
    }
};
exports.NotificationsService = NotificationsService;
__decorate([
    (0, event_emitter_1.OnEvent)('service.requested'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onServiceRequested", null);
__decorate([
    (0, event_emitter_1.OnEvent)('service.matched'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onServiceMatched", null);
__decorate([
    (0, event_emitter_1.OnEvent)('service.assigned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onServiceAssigned", null);
__decorate([
    (0, event_emitter_1.OnEvent)('service.confirmed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onServiceConfirmed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('service.started'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onServiceStarted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('service.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onServiceCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('service.cancelled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onServiceCancelled", null);
__decorate([
    (0, event_emitter_1.OnEvent)('service.rollback'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onServiceRollback", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.pharmacy_received'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderPharm", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.accepted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderAccepted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.rejected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderRejected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.delivered'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderDelivered", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.escalated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderEscalated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.preparing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderPreparing", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderReady", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.assigned_to_delivery'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderAssignedDelivery", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.out_for_delivery'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderOutForDelivery", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.cancelled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderCancelled", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.partially_fulfilled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onOrderPartial", null);
__decorate([
    (0, event_emitter_1.OnEvent)('doctor_appointment.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onApptCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('doctor_appointment.confirmed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onApptConfirmed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('doctor_appointment.cancelled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onApptCancelled", null);
__decorate([
    (0, event_emitter_1.OnEvent)('doctor_appointment.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onApptCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('homecare.booking_created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onHomecareCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('homecare.booking_state_changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onHomecareState", null);
__decorate([
    (0, event_emitter_1.OnEvent)('radiology.new_booking'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onRadBooking", null);
__decorate([
    (0, event_emitter_1.OnEvent)('radiology.state_changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onRadState", null);
__decorate([
    (0, event_emitter_1.OnEvent)('emergency.triggered'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onEmergency", null);
__decorate([
    (0, event_emitter_1.OnEvent)('prescription.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onRx", null);
__decorate([
    (0, event_emitter_1.OnEvent)('medicine.pending_review'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onMedPending", null);
__decorate([
    (0, event_emitter_1.OnEvent)('medication.missed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onMissed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('lab.booking_created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onLabBookingCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('lab.booking_state_changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onLabBookingStateChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('lab.report_uploaded'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onLabReportUploaded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('lab.result_ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onLabResultReady", null);
__decorate([
    (0, event_emitter_1.OnEvent)('radiology.booking_created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onRadBookingCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('radiology.booking_state_changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onRadBookingStateChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('radiology.report_published'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onRadReportPublished", null);
__decorate([
    (0, event_emitter_1.OnEvent)('medical_report.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onMedReport", null);
__decorate([
    (0, event_emitter_1.OnEvent)('family.invite_accepted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onFamilyInviteAccepted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('family.permission_requested'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onFamilyPermissionRequested", null);
__decorate([
    (0, event_emitter_1.OnEvent)('family.permission_responded'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onFamilyPermissionResponded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('family.permissions_updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onFamilyPermissionsUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('referral.converted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onReferralConverted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('referral.welcome_bonus'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onReferralWelcome", null);
__decorate([
    (0, event_emitter_1.OnEvent)('loyalty.points_awarded'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onPointsAwarded", null);
__decorate([
    (0, event_emitter_1.OnEvent)('community.comment_added'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onCommunityComment", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.triage_completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onAiTriageCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('insurance.decided'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onInsuranceDecided", null);
__decorate([
    (0, event_emitter_1.OnEvent)('finance.operation.executed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onFinanceOperationExecuted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('finance.operation.rejected'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onFinanceOperationRejected", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onPaymentCompletedInApp", null);
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('NotificationRepository')),
    __param(4, (0, bullmq_1.InjectQueue)('notifications-delivery')),
    __metadata("design:paramtypes", [notification_repository_1.NotificationRepository,
        event_emitter_1.EventEmitter2,
        sms_service_1.SmsService,
        mail_module_1.MailService,
        bullmq_2.Queue,
        i18n_service_1.I18nService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map