"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushModule = exports.PushController = exports.PushService = exports.PushEngagementSchema = exports.PushEngagement = exports.WebPushSubscriptionSchema = exports.WebPushSubscription = exports.PushLogSchema = exports.PushLog = exports.PushTokenSchema = exports.PushToken = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const bullmq_1 = require("bullmq");
const crypto = __importStar(require("crypto"));
const http2 = __importStar(require("http2"));
const schedule_1 = require("@nestjs/schedule");
const redis_service_1 = require("../redis/redis.service");
let PushToken = class PushToken {
};
exports.PushToken = PushToken;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], PushToken.prototype, "token", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PushToken.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'expo', enum: ['expo', 'fcm', 'apns', 'webpush'] }),
    __metadata("design:type", String)
], PushToken.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['ios', 'android', 'web'] }),
    __metadata("design:type", String)
], PushToken.prototype, "platform", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PushToken.prototype, "device_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PushToken.prototype, "device_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PushToken.prototype, "active", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PushToken.prototype, "last_seen_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PushToken.prototype, "failure_count", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PushToken.prototype, "last_failure_reason", void 0);
exports.PushToken = PushToken = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], PushToken);
exports.PushTokenSchema = mongoose_1.SchemaFactory.createForClass(PushToken);
exports.PushTokenSchema.index({ user_id: 1, active: 1 });
let PushLog = class PushLog {
};
exports.PushLog = PushLog;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PushLog.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PushLog.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PushLog.prototype, "body", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PushLog.prototype, "data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', enum: ['pending', 'sent', 'failed', 'partial'] }),
    __metadata("design:type", String)
], PushLog.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PushLog.prototype, "sent_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PushLog.prototype, "failed_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String] }),
    __metadata("design:type", Array)
], PushLog.prototype, "errors", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PushLog.prototype, "meta", void 0);
exports.PushLog = PushLog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], PushLog);
exports.PushLogSchema = mongoose_1.SchemaFactory.createForClass(PushLog);
let WebPushSubscription = class WebPushSubscription {
};
exports.WebPushSubscription = WebPushSubscription;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], WebPushSubscription.prototype, "endpoint", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], WebPushSubscription.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], WebPushSubscription.prototype, "keys", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], WebPushSubscription.prototype, "user_agent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], WebPushSubscription.prototype, "active", void 0);
exports.WebPushSubscription = WebPushSubscription = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], WebPushSubscription);
exports.WebPushSubscriptionSchema = mongoose_1.SchemaFactory.createForClass(WebPushSubscription);
exports.WebPushSubscriptionSchema.index({ user_id: 1, active: 1 });
let PushEngagement = class PushEngagement {
};
exports.PushEngagement = PushEngagement;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PushEngagement.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['received', 'opened', 'clicked'] }),
    __metadata("design:type", String)
], PushEngagement.prototype, "event", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PushEngagement.prototype, "notification_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PushEngagement.prototype, "campaign_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PushEngagement.prototype, "data", void 0);
exports.PushEngagement = PushEngagement = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], PushEngagement);
exports.PushEngagementSchema = mongoose_1.SchemaFactory.createForClass(PushEngagement);
exports.PushEngagementSchema.index({ campaign_id: 1, event: 1 });
let PushService = class PushService {
    fcmProjects() {
        const out = [];
        if (process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
            out.push({ projectId: process.env.FCM_PROJECT_ID, clientEmail: process.env.FCM_CLIENT_EMAIL, privateKey: process.env.FCM_PRIVATE_KEY });
        }
        if (process.env.FCM_PROJECT_ID_2 && process.env.FCM_CLIENT_EMAIL_2 && process.env.FCM_PRIVATE_KEY_2) {
            out.push({ projectId: process.env.FCM_PROJECT_ID_2, clientEmail: process.env.FCM_CLIENT_EMAIL_2, privateKey: process.env.FCM_PRIVATE_KEY_2 });
        }
        return out;
    }
    async getFcmAccessToken(projectIdx = 0) {
        const proj = this.fcmProjects()[projectIdx];
        if (!proj)
            return null;
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
            const base64Encode = (obj) => Buffer.from(JSON.stringify(obj))
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
                const data = await resp.json();
                this.fcmTokenCache[projectId] = { token: data.access_token, expiry: Date.now() + (data.expires_in - 60) * 1000 };
                return data.access_token;
            }
            else {
                const errorText = await resp.text();
                this.logger.error(`FCM token fetch failed: ${resp.status} - ${errorText}`);
                return null;
            }
        }
        catch (e) {
            this.logger.error(`FCM token signature error: ${e.message}`);
            return null;
        }
    }
    constructor(tokens, logs, webSubs, engagement) {
        this.tokens = tokens;
        this.logs = logs;
        this.webSubs = webSubs;
        this.engagement = engagement;
        this.logger = new common_1.Logger('PushService');
        this.EXPO_URL = 'https://exp.host/--/api/v2/push/send';
        this.FCM_URL = 'https://fcm.googleapis.com/v1/projects/';
        this.fcmTokenCache = {};
        this.cachedApnsJwt = null;
        this.cachedApnsJwtIat = 0;
        this.webPushLib = null;
        this.webPushReady = false;
    }
    apnsConfigured() {
        return !!(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_AUTH_KEY && (process.env.APNS_TOPIC || process.env.APNS_BUNDLE_ID));
    }
    getApnsJwt() {
        if (!this.apnsConfigured())
            return null;
        const now = Math.floor(Date.now() / 1000);
        if (this.cachedApnsJwt && now - this.cachedApnsJwtIat < 3000)
            return this.cachedApnsJwt;
        try {
            const key = process.env.APNS_AUTH_KEY.replace(/\\n/g, '\n');
            const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
            const unsigned = `${b64({ alg: 'ES256', kid: process.env.APNS_KEY_ID })}.${b64({ iss: process.env.APNS_TEAM_ID, iat: now })}`;
            const signer = crypto.createSign('SHA256');
            signer.update(unsigned);
            const der = signer.sign({ key, dsaEncoding: 'ieee-p1363' });
            this.cachedApnsJwt = `${unsigned}.${Buffer.from(der).toString('base64url')}`;
            this.cachedApnsJwtIat = now;
            return this.cachedApnsJwt;
        }
        catch (e) {
            this.logger.error(`APNs JWT sign error: ${e.message}`);
            return null;
        }
    }
    sendApns(token, title, body, data, priority) {
        return new Promise((resolve) => {
            const jwt = this.getApnsJwt();
            if (!jwt)
                return resolve({ ok: false, reason: 'apns_not_configured' });
            const host = process.env.APNS_HOST || 'https://api.push.apple.com';
            let client;
            try {
                client = http2.connect(host);
            }
            catch (e) {
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
                ...Object.keys(data || {}).reduce((acc, k) => { acc[k] = data[k]; return acc; }, {}),
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
                if (status === 200)
                    resolve({ ok: true, status });
                else {
                    let reason = `apns_${status}`;
                    try {
                        reason = JSON.parse(respBody)?.reason || reason;
                    }
                    catch { }
                    resolve({ ok: false, status, reason });
                }
            });
            req.on('error', () => { client.close(); resolve({ ok: false, reason: 'apns_request_error' }); });
            req.end(payload);
        });
    }
    initWebPush() {
        if (this.webPushReady)
            return true;
        const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
        const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
        if (!pub || !priv)
            return false;
        try {
            this.webPushLib = require('web-push');
            this.webPushLib.setVapidDetails(process.env.WEB_PUSH_VAPID_SUBJECT || 'mailto:support@nabdahplus.com', pub, priv);
            this.webPushReady = true;
            return true;
        }
        catch (e) {
            this.logger.error(`web-push init failed: ${e.message}`);
            return false;
        }
    }
    async deliverWebPush(userId, title, body, data, results) {
        if (!this.initWebPush())
            return;
        const subs = await this.webSubs.find({ user_id: userId, active: true }).lean();
        for (const sub of subs) {
            try {
                await this.webPushLib.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ title, body, data, icon: '/icon-192.png', badge: '/badge-72.png' }), { TTL: 3600, urgency: data?.type === 'call' ? 'high' : 'normal' });
                results.sent++;
            }
            catch (e) {
                results.failed++;
                if (e.statusCode === 404 || e.statusCode === 410) {
                    await this.webSubs.updateOne({ endpoint: sub.endpoint }, { $set: { active: false } });
                }
                else {
                    results.errors.push(`webpush_${e.statusCode || e.message}`);
                }
            }
        }
    }
    async trackEngagement(userId, body) {
        if (!['received', 'opened', 'clicked'].includes(body?.event))
            return { ok: false };
        await this.engagement.create({
            user_id: userId,
            event: body.event,
            notification_id: body.notification_id,
            campaign_id: body.campaign_id,
            data: body.data || {},
        });
        return { ok: true };
    }
    async broadcastToUsers(userIds, title, body, data = {}) {
        const results = { queued: 0 };
        for (const uid of userIds) {
            await this.queueNotification(uid, title, body, data);
            results.queued++;
        }
        return results;
    }
    onModuleInit() {
        try {
            const redisUrl = (0, redis_service_1.redisUrlFromEnv)();
            const parsedUrl = new URL(redisUrl);
            const connection = {
                host: parsedUrl.hostname,
                port: parseInt(parsedUrl.port || '6379'),
                password: parsedUrl.password || undefined,
            };
            this.queue = new bullmq_1.Queue('push_notifications', { connection });
            this.worker = new bullmq_1.Worker('push_notifications', async (job) => {
                await this.deliverPush(job.data);
            }, {
                connection,
                concurrency: 5,
            });
            this.worker.on('failed', (job, err) => {
                this.logger.error(`Push job ${job?.id} failed: ${err.message}`);
            });
            this.logger.log('BullMQ push notification worker started');
        }
        catch (err) {
            this.logger.error(`Failed to initialize BullMQ push notifications queue: ${err.message}`);
        }
    }
    async register(user, body) {
        if (!body?.token)
            return { ok: false, reason: 'missing_token' };
        await this.tokens.findOneAndUpdate({ token: body.token }, {
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
        }, { upsert: true, new: true });
        return { ok: true };
    }
    async unregister(userId, token) {
        await this.tokens.updateOne({ token, user_id: userId }, { $set: { active: false } });
        return { ok: true };
    }
    async getUserDevices(userId) {
        return this.tokens.find({ user_id: userId, active: true }, { _id: 0, __v: 0 }).lean();
    }
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
    async queueNotification(userId, title, body, data = {}, priority = 'high') {
        await this.queue.add('send', { userId, title, body, data, priority }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
        });
    }
    async sendToUser(userId, title, body, data = {}) {
        return this.deliverPush({ userId, title, body, data, priority: 'high' });
    }
    async deliverPush(payload) {
        const { userId, title, body, data = {}, priority = 'high' } = payload;
        const tokenDocs = await this.tokens.find({ user_id: userId, active: true, failure_count: { $lt: 10 } }).lean();
        if (tokenDocs.length === 0) {
            this.logger.debug(`No active tokens for user ${userId}`);
            return { sent: 0, failed: 0 };
        }
        const expoTokens = tokenDocs.filter(t => t.provider === 'expo').map(t => t.token);
        const fcmTokens = tokenDocs.filter(t => t.provider === 'fcm').map(t => t.token);
        const apnsTokens = tokenDocs.filter(t => t.provider === 'apns').map(t => t.token);
        const results = { sent: 0, failed: 0, errors: [] };
        for (const token of apnsTokens) {
            const r = await this.sendApns(token, title, body, data, priority);
            if (r.ok)
                results.sent++;
            else {
                results.failed++;
                results.errors.push(r.reason || 'apns_failed');
                if (r.reason === 'BadDeviceToken' || r.reason === 'Unregistered') {
                    await this.tokens.updateOne({ token }, { $set: { active: false } });
                }
                else {
                    await this.tokens.updateOne({ token }, { $inc: { failure_count: 1 } });
                }
            }
        }
        await this.deliverWebPush(userId, title, body, data, results);
        if (expoTokens.length > 0) {
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
                        const json = await resp.json();
                        const tickets = json.data || [];
                        for (let i = 0; i < tickets.length; i++) {
                            if (tickets[i]?.status === 'ok')
                                results.sent++;
                            else {
                                results.failed++;
                                const err = tickets[i]?.details?.error;
                                if (err === 'DeviceNotRegistered') {
                                    await this.tokens.updateOne({ token: chunk[i] }, { $set: { active: false } });
                                }
                                else {
                                    await this.tokens.updateOne({ token: chunk[i] }, { $inc: { failure_count: 1 } });
                                }
                            }
                        }
                    }
                    else {
                        results.failed += chunk.length;
                        results.errors.push(`expo_http_${resp.status}`);
                    }
                }
                catch (e) {
                    results.failed += chunk.length;
                    results.errors.push(`expo_${e.message}`);
                    this.logger.error('Expo push error', e.message);
                }
            }
        }
        if (fcmTokens.length > 0) {
            const accessToken = await this.getFcmAccessToken(0);
            const projectId = process.env.FCM_PROJECT_ID;
            for (const token of fcmTokens) {
                try {
                    let resp;
                    if (accessToken && projectId) {
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
                                    }, {}),
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
                                        }, {}),
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
                    }
                    else if (process.env.FCM_SERVER_KEY) {
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
                    }
                    else {
                        results.failed++;
                        results.errors.push('fcm_not_configured');
                        continue;
                    }
                    if (resp.ok) {
                        results.sent++;
                    }
                    else {
                        results.failed++;
                        const err = await resp.json().catch(() => ({}));
                        const errCode = err?.error?.status || err?.error || '';
                        if (errCode === 'UNREGISTERED' || errCode === 'NotRegistered') {
                            await this.tokens.updateOne({ token }, { $set: { active: false } });
                        }
                        else {
                            await this.tokens.updateOne({ token }, { $inc: { failure_count: 1 } });
                        }
                    }
                }
                catch (e) {
                    results.failed++;
                    results.errors.push(`fcm_${e.message}`);
                }
            }
        }
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
    chunkArray(arr, size) {
        return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
    }
    async onBooking(evt) {
        if (!evt?.patient_id)
            return;
        const msgs = {
            MATCHING: { t: 'جاري البحث', b: 'نبحث عن أفضل مزوّد لك...' },
            ASSIGNED: { t: 'تم إسناد المزوّد', b: `${evt.provider_name || 'المزوّد'} يعالج طلبك الآن` },
            CONFIRMED: { t: 'تم التأكيد', b: 'تم تأكيد حجزك بنجاح' },
            IN_PROGRESS: { t: 'بدأ التنفيذ', b: 'الخدمة قيد التنفيذ الآن' },
            COMPLETED: { t: 'مكتمل', b: 'تم إنجاز الخدمة بنجاح' },
            CANCELLED: { t: 'تم الإلغاء', b: 'تم إلغاء حجزك' },
        };
        const m = msgs[evt.universal_state] || msgs[evt.state];
        if (!m)
            return;
        await this.queueNotification(evt.patient_id, m.t, m.b, { kind: evt.kind, id: evt.id, type: 'booking' });
    }
    async onChatMessage(evt) {
        if (!evt?.meta?.participant_ids)
            return;
        const recipients = evt.meta.participant_ids.filter(id => id !== evt.actor_account_id);
        const senderName = evt.meta.sender_name || 'رسالة جديدة';
        for (const uid of recipients) {
            await this.queueNotification(uid, senderName, evt.meta.body || 'أرسل لك رسالة', { type: 'chat', thread_id: evt.meta.thread_id });
        }
    }
    async onCallIncoming(evt) {
        if (!evt?.callee_id)
            return;
        await this.queueNotification(evt.callee_id, 'مكالمة واردة', `${evt.caller_name || 'شخص ما'} يتصل بك`, { type: 'call', session_id: evt.session_id, call_type: evt.call_type, caller_id: evt.caller_id }, 'high');
    }
    async onCallMissed(evt) {
        if (!evt?.callee_id)
            return;
        await this.queueNotification(evt.callee_id, 'مكالمة فائتة', `لديك مكالمة فائتة من شخص ما`, { type: 'call_missed', session_id: evt.session_id }, 'normal');
    }
    async onPaymentCompleted(evt) {
        if (!evt?.patient_id)
            return;
        await this.queueNotification(evt.patient_id, 'تم الدفع بنجاح', `تم تأكيد دفع ${evt.amount} ريال`, { type: 'payment', booking_id: evt.booking_id });
    }
    async onPaymentFailed(evt) {
        if (!evt?.patient_id)
            return;
        await this.queueNotification(evt.patient_id, 'فشل الدفع', 'تعذّر إتمام عملية الدفع، الرجاء المحاولة مرة أخرى', { type: 'payment_failed', booking_id: evt.booking_id });
    }
    async onReportReady(evt) {
        if (!evt?.patient_id)
            return;
        await this.queueNotification(evt.patient_id, 'التقرير جاهز', 'تقريرك الطبي أصبح جاهزاً للتنزيل', { type: 'report', booking_id: evt.booking_id });
    }
};
exports.PushService = PushService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PushService.prototype, "cleanupStaleTokens", null);
__decorate([
    (0, event_emitter_1.OnEvent)('booking.*'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushService.prototype, "onBooking", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chat.message_sent'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushService.prototype, "onChatMessage", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.incoming'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushService.prototype, "onCallIncoming", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.missed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushService.prototype, "onCallMissed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushService.prototype, "onPaymentCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushService.prototype, "onPaymentFailed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('report.ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushService.prototype, "onReportReady", null);
exports.PushService = PushService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('PushToken')),
    __param(1, (0, mongoose_1.InjectModel)('PushLog')),
    __param(2, (0, mongoose_1.InjectModel)('WebPushSubscription')),
    __param(3, (0, mongoose_1.InjectModel)('PushEngagement')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], PushService);
let PushController = class PushController {
    constructor(svc) {
        this.svc = svc;
    }
    register(u, b) { return this.svc.register(u, b); }
    unregister(u, b) { return this.svc.unregister(u.id, b.token); }
    devices(u) { return this.svc.getUserDevices(u.id); }
    test(u) { return this.svc.sendToUser(u.id, 'اختبار', 'إشعار تجريبي من نبض - يعمل بشكل صحيح!'); }
    async webSubscribe(u, b) {
        if (!b?.endpoint || !b?.keys?.p256dh || !b?.keys?.auth)
            return { ok: false, reason: 'invalid_subscription' };
        await this.svc.webSubs.findOneAndUpdate({ endpoint: b.endpoint }, { $set: { endpoint: b.endpoint, user_id: u.id, keys: b.keys, user_agent: b.user_agent, active: true } }, { upsert: true, new: true });
        return { ok: true };
    }
    async webUnsubscribe(u, b) {
        await this.svc.webSubs.updateOne({ endpoint: b?.endpoint, user_id: u.id }, { $set: { active: false } });
        return { ok: true };
    }
    vapidKey() { return { ok: true, public_key: process.env.WEB_PUSH_VAPID_PUBLIC_KEY || null }; }
    track(u, b) { return this.svc.trackEngagement(u.id, b); }
    async sendCampaign(b) {
        return { ok: false, message: 'استخدم مركز الإشعارات الإداري /admin-notification-center/campaigns' };
    }
};
exports.PushController = PushController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('unregister'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "unregister", null);
__decorate([
    (0, common_1.Get)('devices'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "devices", null);
__decorate([
    (0, common_1.Post)('test'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "test", null);
__decorate([
    (0, common_1.Post)('web/subscribe'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "webSubscribe", null);
__decorate([
    (0, common_1.Post)('web/unsubscribe'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "webUnsubscribe", null);
__decorate([
    (0, common_1.Get)('web/vapid-key'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PushController.prototype, "vapidKey", null);
__decorate([
    (0, common_1.Post)('events'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PushController.prototype, "track", null);
__decorate([
    (0, common_1.Post)('admin/campaign'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushController.prototype, "sendCampaign", null);
exports.PushController = PushController = __decorate([
    (0, common_1.Controller)('push'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [PushService])
], PushController);
let PushModule = class PushModule {
};
exports.PushModule = PushModule;
exports.PushModule = PushModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'PushToken', schema: exports.PushTokenSchema },
                { name: 'PushLog', schema: exports.PushLogSchema },
                { name: 'WebPushSubscription', schema: exports.WebPushSubscriptionSchema },
                { name: 'PushEngagement', schema: exports.PushEngagementSchema },
            ]),
        ],
        controllers: [PushController],
        providers: [PushService],
        exports: [PushService],
    })
], PushModule);
//# sourceMappingURL=push.module.js.map