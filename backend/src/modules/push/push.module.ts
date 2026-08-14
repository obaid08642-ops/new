/**
 * Push Notification Module
 * - FCM v1 API (Firebase Admin SDK pattern)
 * - Expo Push API
 * - BullMQ for reliable delivery queue
 * - Multi-device support
 * - Retry logic
 */
import {
  Module, Injectable, Controller, Post, Get, Delete, Body, Param, UseGuards, Logger, OnModuleInit,
  ServiceUnavailableException, NotImplementedException,
} from '@nestjs/common';
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtAuthGuard, CurrentUser, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Queue, Worker, QueueEvents } from 'bullmq';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';


// ── Schema ────────────────────────────────────────────────────────────

@Schema({ timestamps: true })
export class PushToken {
  @Prop({ required: true, unique: true }) token: string;
  @Prop({ required: true, index: true }) user_id: string;
  @Prop({ default: 'expo', enum: ['expo', 'fcm', 'apns'] }) provider: string;
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

// ── Service ────────────────────────────────────────────────────────────

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger('PushService');
  private queue: Queue;
  private worker: Worker;
  private readonly EXPO_URL = 'https://exp.host/--/api/v2/push/send';
  private readonly FCM_URL = 'https://fcm.googleapis.com/v1/projects/';

  private cachedFcmToken: string | null = null;
  private cachedFcmTokenExpiry = 0;

  async getFcmAccessToken(): Promise<string | null> {
    const projectId = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    let privateKey = process.env.FCM_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    if (this.cachedFcmToken && Date.now() < this.cachedFcmTokenExpiry) {
      return this.cachedFcmToken;
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
        this.cachedFcmToken = data.access_token;
        this.cachedFcmTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
        return this.cachedFcmToken;
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
  ) {}

  onModuleInit() {
    try {
      const redisUrl = process.env.REDIS_URL?.trim();
      if (!redisUrl) {
        this.logger.warn('Push queue disabled because REDIS_URL is not configured');
        return;
      }
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
    if (!this.queue) throw new ServiceUnavailableException('push_queue_unavailable');
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
    const results = { sent: 0, failed: 0, errors: [] as string[] };

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
      const accessToken = await this.getFcmAccessToken();
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
      CONFIRMED: { t: 'تم التأكيد ✅', b: 'تم تأكيد حجزك بنجاح' },
      IN_PROGRESS: { t: 'بدأ التنفيذ ⏳', b: 'الخدمة قيد التنفيذ الآن' },
      COMPLETED: { t: 'مكتمل ✨', b: 'تم إنجاز الخدمة بنجاح' },
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
      'مكالمة واردة 📞',
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
      'مكالمة فائتة 📞',
      `لديك مكالمة فائتة من شخص ما`,
      { type: 'call_missed', session_id: evt.session_id },
      'normal',
    );
  }

  @OnEvent('payment.completed')
  async onPaymentCompleted(evt: any) {
    if (!evt?.patient_id) return;
    await this.queueNotification(evt.patient_id, 'تم الدفع بنجاح ✅', `تم تأكيد دفع ${evt.amount} ريال`, { type: 'payment', booking_id: evt.booking_id });
  }

  @OnEvent('payment.failed')
  async onPaymentFailed(evt: any) {
    if (!evt?.patient_id) return;
    await this.queueNotification(evt.patient_id, 'فشل الدفع ❌', 'تعذّر إتمام عملية الدفع، الرجاء المحاولة مرة أخرى', { type: 'payment_failed', booking_id: evt.booking_id });
  }

  @OnEvent('report.ready')
  async onReportReady(evt: any) {
    if (!evt?.patient_id) return;
    await this.queueNotification(evt.patient_id, 'التقرير جاهز 📊', 'تقريرك الطبي أصبح جاهزاً للتنزيل', { type: 'report', booking_id: evt.booking_id });
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

  @Post('admin/campaign')
  @Roles(UserRole.ADMIN)
  async sendCampaign(@Body() b: { title: string; body: string; target: string }) {
    void b;
    throw new NotImplementedException('Campaign delivery is unavailable until an auditable audience and delivery workflow is implemented.');
  }
}

// ── Module ───────────────────────────────────────────────────────────

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PushToken', schema: PushTokenSchema },
      { name: 'PushLog', schema: PushLogSchema },
    ]),
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
