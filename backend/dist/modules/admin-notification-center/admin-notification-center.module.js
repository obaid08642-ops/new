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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminNotificationCenterModule = exports.AdminNotificationCenterController = exports.AdminNotificationCenterService = exports.CampaignSchema = exports.Campaign = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const mongoose_3 = require("mongoose");
const schedule_1 = require("@nestjs/schedule");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const push_module_1 = require("../push/push.module");
const segments_engine_1 = require("../admin-enterprise/segments.engine");
let Campaign = class Campaign {
};
exports.Campaign = Campaign;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Campaign.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Campaign.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Campaign.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Campaign.prototype, "body", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Campaign.prototype, "segment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Campaign.prototype, "deep_link", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Campaign.prototype, "scheduled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'draft', enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'], index: true }),
    __metadata("design:type", String)
], Campaign.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Campaign.prototype, "stats", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Campaign.prototype, "sent_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Campaign.prototype, "created_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Campaign.prototype, "last_error", void 0);
exports.Campaign = Campaign = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Campaign);
exports.CampaignSchema = mongoose_1.SchemaFactory.createForClass(Campaign);
let AdminNotificationCenterService = class AdminNotificationCenterService {
    constructor(conn, push) {
        this.conn = conn;
        this.push = push;
        this.logger = new common_1.Logger('AdminNotificationCenter');
    }
    get campaigns() { return this.conn.collection('campaigns'); }
    get users() { return this.conn.collection('users'); }
    get engagements() { return this.conn.collection('pushengagements'); }
    get pushLogs() { return this.conn.collection('pushlogs'); }
    validateCampaignInput(body) {
        const title = String(body?.title || '').trim();
        const message = String(body?.body || '').trim();
        const segment = String(body?.segment || '').trim();
        if (!title || !message || !segment)
            throw new common_1.BadRequestException('title, body, segment are required');
        if (title.length > 140 || message.length > 2000)
            throw new common_1.BadRequestException('notification content exceeds permitted length');
        const allowedSegments = new Set(['all', 'patients', 'providers', 'role:pharmacy', 'role:doctor', 'role:lab', 'role:radiology', 'role:nurse', 'role:driver']);
        if (!allowedSegments.has(segment) && !/^user:[A-Za-z0-9_-]{1,128}$/.test(segment) && !/^segment:[A-Za-z0-9_-]{1,128}$/.test(segment)) {
            throw new common_1.BadRequestException('unsupported notification segment');
        }
        if (!segment.startsWith('user:') && body?.audience_confirmed !== true) {
            throw new common_1.BadRequestException('audience confirmation required');
        }
        const route = body?.deep_link?.route;
        if (route && (typeof route !== 'string' || !route.startsWith('/') || route.includes('//') || route.includes('..') || route.length > 160)) {
            throw new common_1.BadRequestException('unsafe deep link route');
        }
        if (body?.scheduled_at) {
            const scheduled = new Date(body.scheduled_at);
            if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now() || scheduled.getTime() > Date.now() + 31 * 24 * 3600 * 1000) {
                throw new common_1.BadRequestException('scheduled time must be within the next 31 days');
            }
        }
        const variants = Array.isArray(body?.variants) ? body.variants.map((item, index) => ({
            id: String(item?.id || String.fromCharCode(65 + index)).slice(0, 20),
            title: String(item?.title || '').trim(),
            body: String(item?.body || '').trim(),
        })).filter((item) => item.title && item.body) : [];
        if (variants.length > 2)
            throw new common_1.BadRequestException('campaign_supports_at_most_two_variants');
        if (variants.some((item) => item.title.length > 140 || item.body.length > 2000))
            throw new common_1.BadRequestException('notification content exceeds permitted length');
        return { title, message, segment, variants };
    }
    async resolveSegment(segment) {
        if (!segment || segment === 'all') {
            const rows = await this.users.find({}, { projection: { id: 1, _id: 0 } }).limit(100000).toArray();
            return rows.map((u) => u.id).filter(Boolean);
        }
        if (segment === 'patients')
            return this.usersByRole('patient');
        if (segment === 'providers') {
            const roles = ['provider', 'doctor', 'pharmacy', 'lab', 'radiology', 'nurse', 'driver'];
            const rows = await this.users.find({ role: { $in: roles } }, { projection: { id: 1, _id: 0 } }).limit(100000).toArray();
            return rows.map((u) => u.id).filter(Boolean);
        }
        if (segment.startsWith('role:'))
            return this.usersByRole(segment.slice(5));
        if (segment.startsWith('segment:')) {
            const id = segment.slice('segment:'.length);
            const saved = await this.conn.collection('segments').findOne({ id });
            if (!saved)
                throw new common_1.NotFoundException('saved_segment_not_found');
            const rows = await this.users.find((0, segments_engine_1.compileSegment)(saved.definition), { projection: { id: 1, _id: 0 } }).limit(100000).toArray();
            return rows.map((u) => u.id).filter(Boolean);
        }
        if (segment.startsWith('user:')) {
            const id = segment.slice(5);
            const user = await this.users.findOne({ id }, { projection: { id: 1, _id: 0 } });
            if (!user?.id)
                throw new common_1.NotFoundException('target user not found');
            return [user.id];
        }
        throw new common_1.BadRequestException(`Unknown segment: ${segment}`);
    }
    async usersByRole(role) {
        const rows = await this.users.find({ role }, { projection: { id: 1, _id: 0 } }).limit(100000).toArray();
        return rows.map((u) => u.id).filter(Boolean);
    }
    async segmentCounts() {
        const roles = await this.users.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).toArray();
        const by_role = {};
        let total = 0;
        for (const r of roles) {
            by_role[r._id || 'unknown'] = r.count;
            total += r.count;
        }
        return {
            all: total,
            patients: by_role['patient'] || 0,
            providers: ['provider', 'doctor', 'pharmacy', 'lab', 'radiology', 'nurse', 'driver'].reduce((s, r) => s + (by_role[r] || 0), 0),
            by_role,
        };
    }
    async createCampaign(adminId, body) {
        const { title, message, segment, variants } = this.validateCampaignInput(body);
        const id = `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const scheduled = body.scheduled_at ? new Date(body.scheduled_at) : null;
        const doc = {
            id,
            name: String(body.name || title).slice(0, 140),
            title,
            body: message,
            segment,
            deep_link: body.deep_link || null,
            variants,
            scheduled_at: scheduled || undefined,
            status: scheduled && scheduled.getTime() > Date.now() ? 'scheduled' : 'draft',
            stats: {},
            created_by: adminId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.campaigns.insertOne(doc);
        return { ok: true, campaign: doc };
    }
    async listCampaigns(page = 1, limit = 20) {
        const skip = (Math.max(page, 1) - 1) * Math.min(limit, 100);
        const [items, total] = await Promise.all([
            this.campaigns.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(Math.min(limit, 100)).toArray(),
            this.campaigns.countDocuments({}),
        ]);
        return { data: items, total, page, total_pages: Math.ceil(total / Math.min(limit, 100)) };
    }
    async getCampaign(id) {
        const c = await this.campaigns.findOne({ id }, { projection: { _id: 0 } });
        if (!c)
            throw new common_1.NotFoundException('Campaign not found');
        const engagement = await this.campaignEngagementStats(id);
        return { ...c, engagement };
    }
    async campaignEngagementStats(campaignId) {
        const rows = await this.engagements.aggregate([
            { $match: { campaign_id: campaignId } },
            { $group: { _id: '$event', count: { $sum: 1 } } },
        ]).toArray();
        const by = {};
        for (const r of rows)
            by[r._id] = r.count;
        return { received: by['received'] || 0, opened: by['opened'] || 0, clicked: by['clicked'] || 0 };
    }
    async sendCampaign(id) {
        const c = await this.campaigns.findOne({ id });
        if (!c)
            throw new common_1.NotFoundException('Campaign not found');
        if (c.status === 'sent' || c.status === 'sending')
            return { ok: false, reason: `already_${c.status}` };
        await this.campaigns.updateOne({ id }, { $set: { status: 'sending', updatedAt: new Date() } });
        try {
            const userIds = await this.resolveSegment(c.segment);
            if (userIds.length === 0)
                throw new common_1.BadRequestException('campaign audience is empty');
            const data = { type: 'campaign', campaign_id: id };
            if (c.deep_link?.route) {
                data.screen = c.deep_link.route;
                if (c.deep_link.params)
                    data.params = c.deep_link.params;
            }
            let queued = 0;
            const variants = Array.isArray(c.variants) && c.variants.length ? c.variants : [{ id: 'A', title: c.title, body: c.body }];
            const variantStats = {};
            for (const uid of userIds) {
                const hash = [...String(uid)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
                const variant = variants[hash % variants.length];
                await this.push.queueNotification(uid, variant.title, variant.body, { ...data, ab_variant: variant.id }, 'normal');
                variantStats[variant.id] = (variantStats[variant.id] || 0) + 1;
                queued++;
            }
            await this.campaigns.updateOne({ id }, {
                $set: { status: 'sent', sent_at: new Date(), stats: { targeted: userIds.length, sent: queued, failed: 0, variants: variantStats }, updatedAt: new Date() },
            });
            this.logger.log(`Campaign ${id} sent to ${queued} users (segment=${c.segment})`);
            return { ok: true, targeted: userIds.length, queued };
        }
        catch (e) {
            await this.campaigns.updateOne({ id }, { $set: { status: 'failed', last_error: e.message, updatedAt: new Date() } });
            throw e;
        }
    }
    async cancelCampaign(id) {
        const r = await this.campaigns.updateOne({ id, status: { $in: ['draft', 'scheduled'] } }, { $set: { status: 'cancelled', updatedAt: new Date() } });
        if (r.matchedCount === 0)
            throw new common_1.BadRequestException('Only draft/scheduled campaigns can be cancelled');
        return { ok: true };
    }
    async broadcast(adminId, body) {
        const created = await this.createCampaign(adminId, { ...body, name: body.name || `broadcast_${Date.now()}` });
        const id = created.campaign.id;
        return this.sendCampaign(id);
    }
    async runScheduledCampaigns() {
        const due = await this.campaigns.find({
            status: 'scheduled',
            scheduled_at: { $lte: new Date() },
        }).limit(10).toArray();
        for (const c of due) {
            await this.sendCampaign(c.id).catch((e) => this.logger.error(`Scheduled campaign ${c.id} failed: ${e.message}`));
        }
    }
    async appointmentReminders() {
        const now = Date.now();
        const in24h = new Date(now + 24 * 3600 * 1000);
        const in23h = new Date(now + 23 * 3600 * 1000);
        const appts = await this.conn.collection('appointments').find({
            slot_start: { $gte: in23h, $lt: in24h },
            status: { $in: ['PENDING', 'CONFIRMED'] },
            reminder_24h_sent: { $ne: true },
        }).limit(500).toArray();
        for (const a of appts) {
            const pid = a.patient_id || a.patient_account_id;
            if (!pid)
                continue;
            let doctorName = '';
            if (a.doctor_id) {
                const prov = await this.conn.collection('provider_profiles').findOne({ $or: [{ id: a.doctor_id }, { user_id: a.doctor_user_id }] }, { projection: { name: 1, name_ar: 1 } });
                doctorName = prov?.name_ar || prov?.name || '';
            }
            await this.push.queueNotification(pid, 'تذكير بموعدك', `لديك موعد غداً ${doctorName ? `مع ${doctorName}` : ''}. لا تنسَ الحضور.`, { type: 'reminder', screen: '/consultations/appointments', appointment_id: a.id }, 'normal');
            await this.conn.collection('appointments').updateOne({ _id: a._id }, { $set: { reminder_24h_sent: true } });
        }
        if (appts.length)
            this.logger.log(`Sent ${appts.length} appointment reminders`);
    }
    async retargetIncompleteOrders() {
        const cooldown = new Date(Date.now() - 48 * 3600 * 1000);
        const staleSince = new Date(Date.now() - 24 * 3600 * 1000);
        const carts = await this.conn.collection('carts').find({
            updatedAt: { $lt: staleSince },
            $or: [{ retargeted_at: null }, { retargeted_at: { $lt: cooldown } }],
        }).limit(300).toArray();
        let sent = 0;
        for (const cart of carts) {
            const uid = cart.user_id || cart.patient_id;
            if (!uid)
                continue;
            await this.push.queueNotification(uid, 'سلتك بانتظارك 🛒', 'لديك أدوية في السلة لم تكمل طلبها — أكمل الطلب الآن ويصلك بسرعة.', { type: 'retarget', screen: '/pharmacy/cart', campaign_id: 'auto_retarget_cart' }, 'normal');
            await this.conn.collection('carts').updateOne({ _id: cart._id }, { $set: { retargeted_at: new Date() } });
            sent++;
        }
        const unpaid = await this.conn.collection('orders').find({
            status: { $in: ['PENDING_PAYMENT', 'CREATED', 'PENDING'] },
            createdAt: { $lt: staleSince },
            $or: [{ retargeted_at: null }, { retargeted_at: { $lt: cooldown } }],
        }).limit(300).toArray();
        for (const o of unpaid) {
            const uid = o.patient_id || o.user_id;
            if (!uid)
                continue;
            await this.push.queueNotification(uid, 'طلبك غير مكتمل', 'طلبك لم يكتمل — اضغط هنا لإتمام الدفع والتوصيل.', { type: 'retarget', screen: '/pharmacy/order-tracking', params: { orderId: o.id }, campaign_id: 'auto_retarget_order' }, 'normal');
            await this.conn.collection('orders').updateOne({ _id: o._id }, { $set: { retargeted_at: new Date() } });
            sent++;
        }
        if (sent)
            this.logger.log(`Retargeting: ${sent} reminders queued`);
    }
    async overviewStats() {
        const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        const delivery = await this.pushLogs.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: null, sent: { $sum: '$sent_count' }, failed: { $sum: '$failed_count' }, notifications: { $sum: 1 } } },
        ]).toArray();
        const d = delivery[0] || { sent: 0, failed: 0, notifications: 0 };
        const engagement = await this.engagements.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$event', count: { $sum: 1 } } },
        ]).toArray();
        const ev = {};
        for (const r of engagement)
            ev[r._id] = r.count;
        const delivered = d.sent || 0;
        const opened = ev['opened'] || 0;
        const clicked = ev['clicked'] || 0;
        return {
            window_days: 30,
            notifications_created: d.notifications,
            delivered,
            failed: d.failed || 0,
            delivery_rate: delivered + d.failed > 0 ? +(delivered / (delivered + d.failed) * 100).toFixed(1) : null,
            opened,
            clicked,
            open_rate: delivered > 0 ? +(opened / delivered * 100).toFixed(1) : null,
            ctr: opened > 0 ? +(clicked / opened * 100).toFixed(1) : null,
        };
    }
};
exports.AdminNotificationCenterService = AdminNotificationCenterService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminNotificationCenterService.prototype, "runScheduledCampaigns", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminNotificationCenterService.prototype, "appointmentReminders", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_6_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminNotificationCenterService.prototype, "retargetIncompleteOrders", null);
exports.AdminNotificationCenterService = AdminNotificationCenterService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_2.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_3.Connection,
        push_module_1.PushService])
], AdminNotificationCenterService);
let AdminNotificationCenterController = class AdminNotificationCenterController {
    constructor(svc) {
        this.svc = svc;
    }
    segments() { return this.svc.segmentCounts(); }
    statsOverview() { return this.svc.overviewStats(); }
    broadcast(admin, body) { return this.svc.broadcast(String(admin?.id), body); }
    createCampaign(admin, body) { return this.svc.createCampaign(String(admin?.id), body); }
    listCampaigns(page, limit) {
        return this.svc.listCampaigns(parseInt(page || '1'), parseInt(limit || '20'));
    }
    getCampaign(id) { return this.svc.getCampaign(id); }
    sendCampaign(id) { return this.svc.sendCampaign(id); }
    cancelCampaign(id) { return this.svc.cancelCampaign(id); }
    retarget() { return this.svc.retargetIncompleteOrders(); }
};
exports.AdminNotificationCenterController = AdminNotificationCenterController;
__decorate([
    (0, common_1.Get)('segments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminNotificationCenterController.prototype, "segments", null);
__decorate([
    (0, common_1.Get)('stats/overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminNotificationCenterController.prototype, "statsOverview", null);
__decorate([
    (0, common_1.Post)('broadcasts'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminNotificationCenterController.prototype, "broadcast", null);
__decorate([
    (0, common_1.Post)('campaigns'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminNotificationCenterController.prototype, "createCampaign", null);
__decorate([
    (0, common_1.Get)('campaigns'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminNotificationCenterController.prototype, "listCampaigns", null);
__decorate([
    (0, common_1.Get)('campaigns/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminNotificationCenterController.prototype, "getCampaign", null);
__decorate([
    (0, common_1.Post)('campaigns/:id/send'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminNotificationCenterController.prototype, "sendCampaign", null);
__decorate([
    (0, common_1.Delete)('campaigns/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminNotificationCenterController.prototype, "cancelCampaign", null);
__decorate([
    (0, common_1.Post)('retarget/run'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminNotificationCenterController.prototype, "retarget", null);
exports.AdminNotificationCenterController = AdminNotificationCenterController = __decorate([
    (0, common_1.Controller)('admin/notification-center'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [AdminNotificationCenterService])
], AdminNotificationCenterController);
let AdminNotificationCenterModule = class AdminNotificationCenterModule {
};
exports.AdminNotificationCenterModule = AdminNotificationCenterModule;
exports.AdminNotificationCenterModule = AdminNotificationCenterModule = __decorate([
    (0, common_1.Module)({
        imports: [push_module_1.PushModule],
        controllers: [AdminNotificationCenterController],
        providers: [AdminNotificationCenterService],
        exports: [AdminNotificationCenterService],
    })
], AdminNotificationCenterModule);
//# sourceMappingURL=admin-notification-center.module.js.map