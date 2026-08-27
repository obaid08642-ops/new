/**
 * Push Notification Module
 * - FCM v1 API (Firebase Admin SDK pattern)
 * - Expo Push API
 * - APNs direct HTTP/2 delivery (ES256 JWT — APNS_KEY_ID/TEAM_ID/AUTH_KEY/TOPIC)
 * - Web Push (VAPID) for future PWA support
 * - BullMQ for reliable delivery queue
 * - Multi-device support
 * - Retry logic
 */
import {
  Module, Injectable, Controller, Post, Get, Delete, Body, Param, UseGuards, Logger, OnModuleInit,
} from '@nestjs/common';
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtAuthGuard, CurrentUser, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Queue, Worker, QueueEvents } from 'bullmq';
import * as crypto from 'crypto';
import * as http2 from 'http2';
import { Cron, CronExpression } from '@nestjs/schedule';
import { redisUrlFromEnv } from '../redis/redis.service';


// ── Schema ────────────────────────────────────────────────────────────

@Schema({ timestamps: true })
export class PushToken {
  @Prop({ required: true, unique: true }) token: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ default: 'expo', enum: ['expo', 'fcm', 'apns', 'webpush'] }) provider: string;
  @Prop({ enum: ['ios', 'android', 'web'] }) platform: string;
  @Prop() device_id?: string;
  @Prop() device_name?: string;
  @Prop({ default: true }) active: boolean;
  @Prop() last_seen_at?: Date;
  @Prop({ default: 0 }) failure_count: number;
  @Prop() last_failure_reason?: string;
}
export type PushTokenDocument = PushToken & Document;
export const PushTokenSchema = SchemaFactory.createForClass(PushToken);
PushTokenSchema.index({ user_id: 1, active: 1 });

@Schema({ timestamps: true })
export class PushLog {
  @Prop({ required: true }) user_id: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) body: string;
  @Prop({ type: Object }) data?: Record<string, any>;
  @Prop({ default: 'pending', enum: ['pending', 'sent', 'failed', 'partial'] }) status: string;
  @Prop({ default: 0 }) sent_count: number;
  @Prop({ default: 0 }) failed_count: number;
  @Prop({ type: [String] }) errors?: string[];
  @Prop({ type: Object }) meta?: Record<string, any>;
}
export type PushLogDocument = PushLog & Document;
export const PushLogSchema = SchemaFactory.createForClass(PushLog);

/** Web Push (VAPID) browser subscriptions — future PWA/web-app support. */
@Schema({ timestamps: true })
export class WebPushSubscription {
  @Prop({ required: true, unique: true }) endpoint: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ type: Object, required: true }) keys: { p256dh: string; auth: string };
  @Prop() user_agent?: string;
  @Prop({ default: true }) active: boolean;
}
export type WebPushSubscriptionDocument = WebPushSubscription & Document;
export const WebPushSubscriptionSchema = SchemaFactory.createForClass(WebPushSubscription);
WebPushSubscriptionSchema.index({ user_id: 1, active: 1 });

/** Client-reported engagement events — powers open-rate / CTR analytics. */
@Schema({ timestamps: true })
export class PushEngagement {
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ required: true, enum: ['received', 'opened', 'clicked'] }) event: string;
  @Prop() notification_id?: string;
  @Prop() campaign_id?: string;
  @Prop({ type: Object }) data?: Record<string, any>;
}
export type PushEngagementDocument = PushEngagement & Document;
export const PushEngagementSchema = SchemaFactory.createForClass(PushEngagement);
PushEngagementSchema.index({ campaign_id: 1, event: 1 });

// ── Service ────────────────────────────────────────────────────────────

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger('PushService');
  private queue: Queue;
  private worker: Worker;
  private readonly EXPO_URL = 'https://exp.host/--/api/v2/push/send';
  private readonly FCM_URL = 'https://fcm.googleapis.com/v1/projects/';

  private fcmTokenCache: Record<string, { token: string; expiry: number }> = {};

  /** Firebase projects this backend can send to: primary (napd-plus) + secondary (patient-iOS project). */
  private fcmProjects(): { projectId: string; clientEmail: string; privateKey: string }[] {
    const out: any[] = [];
    if (process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
      out.push({ projectId: process.env.FCM_PROJECT_ID, clientEmail: process.env.FCM_CLIENT_EMAIL, privateKey: process.env.FCM_PRIVATE_KEY });
    }
    if (process.env.FCM_PROJECT_ID_2 && process.env.FCM_CLIENT_EMAIL_2 && process.env.FCM_PRIVATE_KEY_2) {
      out.push({ projectId: process.env.FCM_PROJECT_ID_2, clientEmail: process.env.FCM_CLIENT_EMAIL_2, privateKey: process.env.FCM_PRIVATE_KEY_2 });
    }
    return out;
  }

  async getFcmAccessToken(projectIdx = 0): Promise<string | null> {
    const proj = this.fcmProjects()[projectIdx];
    if (!proj) return null;
    const { projectId, clientEmail } = proj;
    let privateKey = proj.privateKey;

    const cached = this.fcmTokenCache[projectId];
    if (cached && Date.now() < cached.expiry) {
      return cached.token;
    }

    try {
      privateKey = privateKey.replace(/\\n/g, '\n');
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      };

      const base64Encode = (obj: any) =>
        Buffer.from(JSON.stringify(obj))
          .toString('base64url');

      const encodedHeader = base64Encode(header);
      const encodedPayload = base64Encode(payload);
      const signatureInput = `${encodedHeader}.${encodedPayload}`;

      const sign = crypto.createSign('RSA-SHA256');
      sign.update(signatureInput);
      const signature = sign.sign(privateKey, 'base64url');

      const assertion = `${signatureInput}.${signature}`;

      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
      });

      if (resp.ok) {
        const data: any = await resp.json();
        this.fcmTokenCache[projectId] = { token: data.access_token, expiry: Date.now() + (data.expires_in - 60) * 1000 };
        return data.access_token;
      } else {
        const errorText = await resp.text();
        this.logger.error(`FCM token fetch failed: ${resp.status} - ${errorText}`);
        return null;
      }
    } catch (e: any) {
      this.logger.error(`FCM token signature error: ${e.message}`);
      return null;
    }
  }

  constructor(
    @InjectModel('PushToken') private readonly tokens: Model<PushTokenDocument>,
    @InjectModel('PushLog') private readonly logs: Model<PushLogDocument>,
    @InjectModel('WebPushSubscription') private readonly webSubs: Model<WebPushSubscriptionDocument>,
    @InjectModel('PushEngagement') private readonly engagement: Model<PushEngagementDocument>,
  ) {}

  // ── APNs direct delivery (HTTP/2, ES256 provider-token JWT) ──────────────
  // Env: APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY (.p8 contents), APNS_TOPIC
  //      (= APNS_BUNDLE_ID), APNS_HOST (default production, sandbox override).
  private cachedApnsJwt: string | null = null;
  private cachedApnsJwtIat = 0;

  private apnsConfigured(): boolean {
    return !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_AUTH_KEY && (process.env.APNS_TOPIC || process.env.APNS_BUNDLE_ID));
  }

  private getApnsJwt(): string | null {
    if (!this.apnsConfigured()) return null;
    const now = Math.floor(Date.now() / 1000);
    // APNs provider tokens are valid 1h — refresh every 50 minutes
    if (this.cachedApnsJwt && now - this.cachedApnsJwtIat < 3000) return this.cachedApnsJwt;
    try {
      const key = process.env.APNS_AUTH_KEY!.replace(/\\n/g, '\n');
      const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const unsigned = `${b64({ alg: 'ES256', kid: process.env.APNS_KEY_ID })}.${b64({ iss: process.env.APNS_TEAM_ID, iat: now })}`;
      const signer = crypto.createSign('SHA256');
      signer.update(unsigned);
      const der = signer.sign({ key, dsaEncoding: 'ieee-p1363' });
      this.cachedApnsJwt = `${unsigned}.${Buffer.from(der).toString('base64url')}`;
      this.cachedApnsJwtIat = now;
      return this.cachedApnsJwt;
    } catch (e: any) {
      this.logger.error(`APNs JWT sign error: ${e.message}`);
      return null;
    }
  }

  private sendApns(token: string, title: string, body: string, data: any, priority: string): Promise<{ ok: boolean; status?: number; reason?: string }> {
    return new Promise((resolve) => {
      const jwt = this.getApnsJwt();
      if (!jwt) return resolve({ ok: false, reason: 'apns_not_configured' });
      const host = process.env.APNS_HOST || 'https://api.push.apple.com';
      let client: http2.ClientHttp2Session;
      try {
        client = http2.connect(host);
      } catch (e: any) {
        return resolve({ ok: false, reason: `apns_connect_${e.message}` });
      }
      client.on('error', () => { client.close(); resolve({ ok: false, reason: 'apns_session_error' }); });
      const payload = JSON.stringify({
        aps: {
          alert: { title, body },
          sound: data?.type === 'call' ? 'default' : 'default',
          badge: 1,
          'content-available': 1,
        },
        ...Object.keys(data || {}).reduce((acc: any, k) => { acc[k] = data[k]; return acc; }, {}),
      });
      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': process.env.APNS_TOPIC || process.env.APNS_BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': priority === 'high' ? '10' : '5',
        'content-type': 'application/json',
      });
      let status = 0;
      let respBody = '';
      req.on('response', (headers) => { status = headers[':status'] || 0; });
      req.on('data', (chunk) => { respBody += chunk; });
      req.on('end', () => {
        client.close();
        if (status === 200) resolve({ ok: true, status });
        else {
          let reason = `apns_${status}`;
          try { reason = JSON.parse(respBody)?.reason || reason; } catch {}
          resolve({ ok: false, status, reason });
        }
      });
      req.on('error', () => { client.close(); resolve({ ok: false, reason: 'apns_request_error' }); });
      req.end(payload);
    });
  }

  // ── Web Push (VAPID) ──────────────────────────────────────────────────────
  // Env: WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, WEB_PUSH_VAPID_SUBJECT
  private webPushLib: any = null;
  private webPushReady = false;

  private initWebPush(): boolean {
    if (this.webPushReady) return true;
    const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
    if (!pub || !priv) return false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.webPushLib = require('web-push');
      this.webPushLib.setVapidDetails(
        process.env.WEB_PUSH_VAPID_SUBJECT || 'mailto:support@nabdahplus.com',
        pub,
        priv,
      );
      this.webPushReady = true;
      return true;
    } catch (e: any) {
      this.logger.error(`web-push init failed: ${e.message}`);
      return false;
    }
  }

  private async deliverWebPush(userId: string, title: string, body: string, data: any, results: { sent: number; failed: number; errors: string[] }) {
    if (!this.initWebPush()) return;
    const subs = await this.webSubs.find({ user_id: userId, active: true }).lean();
    for (const sub of subs) {
      try {
        await this.webPushLib.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title, body, data, icon: '/icon-192.png', badge: '/badge-72.png' }),
          { TTL: 3600, urgency: data?.type === 'call' ? 'high' : 'normal' },
        );
        results.sent++;
      } catch (e: any) {
        results.failed++;
        if (e.statusCode === 404 || e.statusCode === 410) {
          await this.webSubs.updateOne({ endpoint: sub.endpoint }, { $set: { active: false } });
        } else {
          results.errors.push(`webpush_${e.statusCode || e.message}`);
        }
      }
    }
  }

  /** Client engagement events (received/opened/clicked) → campaign analytics */
  async trackEngagement(userId: string, body: { event: string; notification_id?: string; campaign_id?: string; data?: any }) {
    if (!['received', 'opened', 'clicked'].includes(body?.event)) return { ok: false };
    await this.engagement.create({
      user_id: userId,
      event: body.event,
      notification_id: body.notification_id,
      campaign_id: body.campaign_id,
      data: body.data || {},
    });
    return { ok: true };
  }

  /** Broadcast to many users — used by admin campaigns/broadcasts */
  async broadcastToUsers(userIds: string[], title: string, body: string, data: any = {}) {
    const results = { queued: 0 };
    for (const uid of userIds) {
      await this.queueNotification(uid, title, body, data);
      results.queued++;
    }
    return results;
  }

  onModuleInit() {
    try {
      const redisUrl = redisUrlFromEnv();
      const parsedUrl = new URL(redisUrl);
      const connection = {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port || '6379'),
        password: parsedUrl.password || undefined,
      };

      this.queue = new Queue('push_notifications', { connection });

      this.worker = new Worker('push_notifications', async (job) => {
        await this.deliverPush(job.data);
      }, {
        connection,
        concurrency: 5,
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Push job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('BullMQ push notification worker started');
    } catch (err: any) {
      this.logger.error(`Failed to initialize BullMQ push notifications queue: ${err.message}`);
    }
  }

  async register(user: any, body: { token: string; provider?: string; platform?: string; device_id?: string; device_name?: string }) {
    if (!body?.token) return { ok: false, reason: 'missing_token' };
    await this.tokens.findOneAndUpdate(
      { token: body.token },
      {
        $set: {
          user_id: user.id,
          token: body.token,
          provider: body.provider || 'expo',
          platform: body.platform,
          device_id: body.device_id,
          device_name: body.device_name,
          active: true,
          last_seen_at: new Date(),
          failure_count: 0,
        },
      },
      { upsert: true, new: true },
    );
    return { ok: true };
  }

  async unregister(userId: string, token: string) {
    await this.tokens.updateOne({ token, user_id: userId }, { $set: { active: false } });
    return { ok: true };
  }

  async getUserDevices(userId: string) {
    return this.tokens.find({ user_id: userId, active: true }, { _id: 0, __v: 0 }).lean();
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupStaleTokens() {
    this.logger.log('Starting stale push tokens cleanup cron job...');
    const result = await this.tokens.deleteMany({
      $or: [
        { active: false },
        { failure_count: { $gte: 10 } }
      ]
    });
    this.logger.log(`Cleanup complete. Deleted ${result.deletedCount} stale or inactive push tokens.`);
  }

  /** Queue a notification for reliable delivery */
  async queueNotification(userId: string, title: string, body: string, data: any = {}, priority: 'high' | 'normal' = 'high') {
    await this.queue.add('send', { userId, title, body, data, priority }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    });
  }

  /** Direct delivery (bypasses queue - use for critical notifications) */
  async sendToUser(userId: string, title: string, body: string, data: any = {}) {
    return this.deliverPush({ userId, title, body, data, priority: 'high' });
  }

  private async deliverPush(payload: { userId: string; title: string; body: string; data?: any; priority?: string }) {
    const { userId, title, body, data = {}, priority = 'high' } = payload;
    const tokenDocs = await this.tokens.find({ user_id: userId, active: true, failure_count: { $lt: 10 } }).lean();

    if (tokenDocs.length === 0) {
      this.logger.debug(`No active tokens for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    const expoTokens = tokenDocs.filter(t => t.provider === 'expo').map(t => t.token);
    const fcmTokens = tokenDocs.filter(t => t.provider === 'fcm').map(t => t.token);
    const apnsTokens = tokenDocs.filter(t => t.provider === 'apns').map(t => t.token);
    const results = { sent: 0, failed: 0, errors: [] as string[] };

    // ── APNs direct (native iOS tokens) ──────────────────────
    for (const token of apnsTokens) {
      const r = await this.sendApns(token, title, body, data, priority);
      if (r.ok) results.sent++;
      else {
        results.failed++;
        results.errors.push(r.reason || 'apns_failed');
        if (r.reason === 'BadDeviceToken' || r.reason === 'Unregistered') {
          await this.tokens.updateOne({ token }, { $set: { active: false } });
        } else {
          await this.tokens.updateOne({ token }, { $inc: { failure_count: 1 } });
        }
      }
    }

    // ── Web Push (VAPID browser subscriptions) ───────────────
    await this.deliverWebPush(userId, title, body, data, results);

    // ── Expo Push ────────────────────────────────────────────
    if (expoTokens.length > 0) {
      // Expo supports up to 100 notifications per request
      const chunks = this.chunkArray(expoTokens, 100);
      for (const chunk of chunks) {
        try {
          const messages = chunk.map(to => ({
            to,
            title,
            body,
            data,
            sound: 'default',
            priority,
            channelId: data?.type === 'call' ? 'calls' : 'default',
            categoryId: data?.type === 'call' ? 'call_actions' : data?.type === 'chat' ? 'chat_actions' : 'default',
            badge: 1,
          }));
          const resp = await fetch(this.EXPO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
            body: JSON.stringify(messages),
          });
          if (resp.ok) {
            const json: any = await resp.json();
            const tickets = json.data || [];
            for (let i = 0; i < tickets.length; i++) {
              if (tickets[i]?.status === 'ok') results.sent++;
              else {
                results.failed++;
                const err = tickets[i]?.details?.error;
                if (err === 'DeviceNotRegistered') {
                  await this.tokens.updateOne({ token: chunk[i] }, { $set: { active: false } });
                } else {
                  await this.tokens.updateOne({ token: chunk[i] }, { $inc: { failure_count: 1 } });
                }
              }
            }
          } else {
            results.failed += chunk.length;
            results.errors.push(`expo_http_${resp.status}`);
          }
        } catch (e: any) {
          results.failed += chunk.length;
          results.errors.push(`expo_${e.message}`);
          this.logger.error('Expo push error', e.message);
        }
      }
    }

    // ── FCM v1 with Legacy Fallback ──────────────────────────
    if (fcmTokens.length > 0) {
      const accessToken = await this.getFcmAccessToken(0);
      const projectId = process.env.FCM_PROJECT_ID;

      for (const token of fcmTokens) {
        try {
          let resp: Response;
          if (accessToken && projectId) {
            // Send via FCM v1 HTTP API
            resp = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: { title, body },
                  data: Object.keys(data).reduce((acc, k) => {
                    acc[k] = typeof data[k] === 'object' ? JSON.stringify(data[k]) : String(data[k]);
                    return acc;
                  }, {} as Record<string, string>),
                  android: {
                    priority: 'high',
                    notification: {
                      sound: 'default',
                      channel_id: data?.type === 'call' ? 'calls' : 'default',
                    },
                  },
                  apns: {
                    payload: {
                      aps: {
                        sound: 'default',
                        badge: 1,
                      },
                    },
                  },
                },
              }),
            });
            // Token belongs to the OTHER Firebase project (e.g. patient-iOS app) — retry with secondary credentials
            if (resp.status === 404 && this.fcmProjects().length > 1) {
              const altToken = await this.getFcmAccessToken(1);
              const altProject = this.fcmProjects()[1].projectId;
              if (altToken) {
                const payloadStr = JSON.stringify({
                  message: {
                    token,
                    notification: { title, body },
                    data: Object.keys(data).reduce((acc, k) => {
                      acc[k] = typeof data[k] === 'object' ? JSON.stringify(data[k]) : String(data[k]);
                      return acc;
                    }, {} as Record<string, string>),
                    android: { priority: 'high', notification: { sound: 'default', channel_id: data?.type === 'call' ? 'calls' : 'default' } },
                    apns: { payload: { aps: { sound: 'default', badge: 1 } } },
                  },
                });
                resp = await fetch(`https://fcm.googleapis.com/v1/projects/${altProject}/messages:send`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${altToken}`, 'Content-Type': 'application/json' },
                  body: payloadStr,
                });
              }
            }
          } else if (process.env.FCM_SERVER_KEY) {
            // Fallback: Send via Legacy FCM HTTP API
            resp = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                Authorization: `key=${process.env.FCM_SERVER_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: token,
                notification: { title, body },
                data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
                android: { priority: 'high', notification: { sound: 'default', channel_id: data?.type === 'call' ? 'calls' : 'default' } },
                apns: { payload: { aps: { sound: 'default', badge: 1 } } },
              }),
            });
          } else {
            results.failed++;
            results.errors.push('fcm_not_configured');
            continue;
          }

          if (resp.ok) {
            results.sent++;
          } else {
            results.failed++;
            const err: any = await resp.json().catch(() => ({}));
            const errCode = err?.error?.status || err?.error || '';
            if (errCode === 'UNREGISTERED' || errCode === 'NotRegistered') {
              await this.tokens.updateOne({ token }, { $set: { active: false } });
            } else {
              await this.tokens.updateOne({ token }, { $inc: { failure_count: 1 } });
            }
          }
        } catch (e: any) {
          results.failed++;
          results.errors.push(`fcm_${e.message}`);
        }
      }
    }

    // Log delivery
    await this.logs.create({
      user_id: userId,
      title,
      body,
      data,
      status: results.failed === 0 ? 'sent' : results.sent > 0 ? 'partial' : 'failed',
      sent_count: results.sent,
      failed_count: results.failed,
      errors: results.errors,
    }).catch(() => null);

    return results;
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
  }

  // ── Event listeners ──────────────────────────────────────────

  @OnEvent('booking.*')
  async onBooking(evt: any) {
    if (!evt?.patient_id) return;
    const msgs: Record<string, { t: string; b: string }> = {
      MATCHING: { t: 'جاري البحث', b: 'نبحث عن أفضل مزوّد لك...' },
      ASSIGNED: { t: 'تم إسناد المزوّد', b: `${evt.provider_name || 'المزوّد'} يعالج طلبك الآن` },
      CONFIRMED: { t: 'تم التأكيد', b: 'تم تأكيد حجزك بنجاح' },
      IN_PROGRESS: { t: 'بدأ التنفيذ', b: 'الخدمة قيد التنفيذ الآن' },
      COMPLETED: { t: 'مكتمل', b: 'تم إنجاز الخدمة بنجاح' },
      CANCELLED: { t: 'تم الإلغاء', b: 'تم إلغاء حجزك' },
    };
    const m = msgs[evt.universal_state] || msgs[evt.state];
    if (!m) return;
    await this.queueNotification(evt.patient_id, m.t, m.b, { kind: evt.kind, id: evt.id, type: 'booking' });
  }

  @OnEvent('chat.message_sent')
  async onChatMessage(evt: any) {
    if (!evt?.meta?.participant_ids) return;
    const recipients = (evt.meta.participant_ids as string[]).filter(id => id !== evt.actor_account_id);
    const senderName = evt.meta.sender_name || 'رسالة جديدة';
    for (const uid of recipients) {
      await this.queueNotification(uid, senderName, evt.meta.body || 'أرسل لك رسالة', { type: 'chat', thread_id: evt.meta.thread_id });
    }
  }

  @OnEvent('call.incoming')
  async onCallIncoming(evt: any) {
    if (!evt?.callee_id) return;
    await this.queueNotification(
      evt.callee_id,
      'مكالمة واردة',
      `${evt.caller_name || 'شخص ما'} يتصل بك`,
      { type: 'call', session_id: evt.session_id, call_type: evt.call_type, caller_id: evt.caller_id },
      'high',
    );
  }

  @OnEvent('call.missed')
  async onCallMissed(evt: any) {
    if (!evt?.callee_id) return;
    await this.queueNotification(
      evt.callee_id,
      'مكالمة فائتة',
      `لديك مكالمة فائتة من شخص ما`,
      { type: 'call_missed', session_id: evt.session_id },
      'normal',
    );
  }

  @OnEvent('payment.completed')
  async onPaymentCompleted(evt: any) {
    if (!evt?.patient_id) return;
    await this.queueNotification(evt.patient_id, 'تم الدفع بنجاح', `تم تأكيد دفع ${evt.amount} ريال`, { type: 'payment', booking_id: evt.booking_id });
  }

  @OnEvent('payment.failed')
  async onPaymentFailed(evt: any) {
    if (!evt?.patient_id) return;
    await this.queueNotification(evt.patient_id, 'فشل الدفع', 'تعذّر إتمام عملية الدفع، الرجاء المحاولة مرة أخرى', { type: 'payment_failed', booking_id: evt.booking_id });
  }

  @OnEvent('report.ready')
  async onReportReady(evt: any) {
    if (!evt?.patient_id) return;
    await this.queueNotification(evt.patient_id, 'التقرير جاهز', 'تقريرك الطبي أصبح جاهزاً للتنزيل', { type: 'report', booking_id: evt.booking_id });
  }
}

// ── Controller ──────────────────────────────────────────────────────────

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly svc: PushService) {}

  @Post('register')
  register(@CurrentUser() u: any, @Body() b: any) { return this.svc.register(u, b); }

  @Post('unregister')
  unregister(@CurrentUser() u: any, @Body() b: { token: string }) { return this.svc.unregister(u.id, b.token); }

  @Get('devices')
  devices(@CurrentUser() u: any) { return this.svc.getUserDevices(u.id); }

  @Post('test')
  test(@CurrentUser() u: any) { return this.svc.sendToUser(u.id, 'اختبار', 'إشعار تجريبي من نبض - يعمل بشكل صحيح!'); }

  /** Web Push (PWA) — register a browser subscription */
  @Post('web/subscribe')
  async webSubscribe(@CurrentUser() u: any, @Body() b: { endpoint: string; keys: { p256dh: string; auth: string }; user_agent?: string }) {
    if (!b?.endpoint || !b?.keys?.p256dh || !b?.keys?.auth) return { ok: false, reason: 'invalid_subscription' };
    await (this.svc as any).webSubs.findOneAndUpdate(
      { endpoint: b.endpoint },
      { $set: { endpoint: b.endpoint, user_id: u.id, keys: b.keys, user_agent: b.user_agent, active: true } },
      { upsert: true, new: true },
    );
    return { ok: true };
  }

  /** Web Push (PWA) — remove a browser subscription */
  @Post('web/unsubscribe')
  async webUnsubscribe(@CurrentUser() u: any, @Body() b: { endpoint: string }) {
    await (this.svc as any).webSubs.updateOne({ endpoint: b?.endpoint, user_id: u.id }, { $set: { active: false } });
    return { ok: true };
  }

  /** VAPID public key — safe to expose, needed by browsers to subscribe */
  @Get('web/vapid-key')
  vapidKey() { return { ok: true, public_key: process.env.WEB_PUSH_VAPID_PUBLIC_KEY || null }; }

  /** Client reports engagement: received/opened/clicked — powers CTR analytics */
  @Post('events')
  track(@CurrentUser() u: any, @Body() b: any) { return this.svc.trackEngagement(u.id, b); }

  @Post('admin/campaign')
  @Roles(UserRole.ADMIN)
  async sendCampaign(@Body() b: { title: string; body: string; target: string }) {
    // Real campaign delivery is handled by the Admin Notification Center
    // (modules/admin-notification-center) which resolves segments to users.
    return { ok: false, message: 'استخدم مركز الإشعارات الإداري /admin-notification-center/campaigns' };
  }
}

// ── Module ───────────────────────────────────────────────────────────

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PushToken', schema: PushTokenSchema },
      { name: 'PushLog', schema: PushLogSchema },
      { name: 'WebPushSubscription', schema: WebPushSubscriptionSchema },
      { name: 'PushEngagement', schema: PushEngagementSchema },
    ]),
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
