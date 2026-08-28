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
exports.ServiceCatalogModule = exports.ServiceCatalogController = exports.ServiceCatalogService = exports.ProviderScheduleSchema = exports.ProviderSchedule = exports.ServiceOwnershipSchema = exports.ServiceOwnership = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const event_bus_service_1 = require("../events/event-bus.service");
const mongoose_3 = require("@nestjs/mongoose");
const mongoose_4 = require("mongoose");
const uuid_1 = require("uuid");
let ServiceOwnership = class ServiceOwnership extends mongoose_4.Document {
};
exports.ServiceOwnership = ServiceOwnership;
__decorate([
    (0, mongoose_3.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ServiceOwnership.prototype, "id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ServiceOwnership.prototype, "account_id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ServiceOwnership.prototype, "entity_type", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ServiceOwnership.prototype, "entity_id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ServiceOwnership.prototype, "approved", void 0);
exports.ServiceOwnership = ServiceOwnership = __decorate([
    (0, mongoose_3.Schema)({ timestamps: true, collection: 'service_ownership' })
], ServiceOwnership);
exports.ServiceOwnershipSchema = mongoose_3.SchemaFactory.createForClass(ServiceOwnership);
exports.ServiceOwnershipSchema.index({ account_id: 1, entity_type: 1 });
let ProviderSchedule = class ProviderSchedule extends mongoose_4.Document {
};
exports.ProviderSchedule = ProviderSchedule;
__decorate([
    (0, mongoose_3.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderSchedule.prototype, "id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderSchedule.prototype, "account_id", void 0);
__decorate([
    (0, mongoose_3.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderSchedule.prototype, "entity_type", void 0);
__decorate([
    (0, mongoose_3.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], ProviderSchedule.prototype, "weekly", void 0);
__decorate([
    (0, mongoose_3.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], ProviderSchedule.prototype, "blocked_dates", void 0);
__decorate([
    (0, mongoose_3.Prop)({ default: 30 }),
    __metadata("design:type", Number)
], ProviderSchedule.prototype, "slot_minutes", void 0);
__decorate([
    (0, mongoose_3.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], ProviderSchedule.prototype, "max_per_slot", void 0);
__decorate([
    (0, mongoose_3.Prop)({ default: 10 }),
    __metadata("design:type", Number)
], ProviderSchedule.prototype, "coverage_radius_km", void 0);
__decorate([
    (0, mongoose_3.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ProviderSchedule.prototype, "is_online", void 0);
exports.ProviderSchedule = ProviderSchedule = __decorate([
    (0, mongoose_3.Schema)({ timestamps: true, collection: 'provider_schedules' })
], ProviderSchedule);
exports.ProviderScheduleSchema = mongoose_3.SchemaFactory.createForClass(ProviderSchedule);
exports.ProviderScheduleSchema.index({ account_id: 1, entity_type: 1 }, { unique: true });
const DEFAULT_WEEKLY = {
    sun: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
    mon: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
    tue: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
    wed: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
    thu: [{ start: '09:00', end: '14:00' }],
};
function dayKey(d) { return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()]; }
function fromHM(date, hm) { const [h, m] = hm.split(':').map(Number); const r = new Date(date); r.setHours(h, m, 0, 0); return r; }
function toHM(d) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
let ServiceCatalogService = class ServiceCatalogService {
    constructor(labs, rads, own, sched, bus) {
        this.labs = labs;
        this.rads = rads;
        this.own = own;
        this.sched = sched;
        this.bus = bus;
    }
    assertProvider(user) {
        if (!['lab', 'hospital', 'radiology', 'pharmacy', 'admin', 'provider', 'doctor'].includes(user.role))
            throw new common_1.ForbiddenException();
    }
    async myCatalog(user, entity_type) {
        this.assertProvider(user);
        const ownerships = await this.own.find({ account_id: user.id, entity_type }, { _id: 0, __v: 0 }).lean();
        const ids = ownerships.map(o => o.entity_id);
        const Model = entity_type === 'lab' ? this.labs : this.rads;
        const services = ids.length ? await Model.find({ id: { $in: ids } }, { _id: 0, __v: 0 }).lean() : [];
        return services.map((s) => ({ ...s, owned: true, approved: ownerships.find(o => o.entity_id === s.id)?.approved !== false }));
    }
    async createService(user, entity_type, data) {
        this.assertProvider(user);
        if (!data.name_ar)
            throw new common_1.BadRequestException('name_ar required');
        const Model = entity_type === 'lab' ? this.labs : this.rads;
        const doc = await Model.create({
            ...data,
            name_en: data.name_en || data.name_ar,
            price: Number(data.price) || 0,
            active: data.active !== false,
            unavailable: !!data.unavailable,
        });
        await this.own.create({ account_id: user.id, entity_type, entity_id: doc.id, approved: user.role === 'admin' });
        this.bus.emit({ type: 'catalog.service_created', entity_type: 'service', entity_id: doc.id, actor_account_id: user.id, actor_role: user.role, meta: { kind: entity_type } }).catch(() => null);
        return doc.toObject();
    }
    async updateService(user, entity_type, id, patch) {
        this.assertProvider(user);
        const own = await this.own.findOne({ entity_id: id, entity_type });
        if (user.role !== 'admin' && (!own || own.account_id !== user.id))
            throw new common_1.ForbiddenException();
        const Model = entity_type === 'lab' ? this.labs : this.rads;
        const r = await Model.findOneAndUpdate({ id }, { $set: patch }, { new: true });
        if (!r)
            throw new common_1.NotFoundException();
        this.bus.emit({ type: 'catalog.service_updated', entity_type: 'service', entity_id: id, actor_account_id: user.id, actor_role: user.role, meta: { kind: entity_type, fields: Object.keys(patch) } }).catch(() => null);
        return r.toObject();
    }
    async toggleService(user, entity_type, id, active) {
        return this.updateService(user, entity_type, id, { active });
    }
    async deleteService(user, entity_type, id) {
        this.assertProvider(user);
        const own = await this.own.findOne({ entity_id: id, entity_type });
        if (user.role !== 'admin' && (!own || own.account_id !== user.id))
            throw new common_1.ForbiddenException();
        const Model = entity_type === 'lab' ? this.labs : this.rads;
        await Model.deleteOne({ id });
        await this.own.deleteMany({ entity_id: id, entity_type });
        this.bus.emit({ type: 'catalog.service_deleted', entity_type: 'service', entity_id: id, actor_account_id: user.id, actor_role: user.role, meta: { kind: entity_type } }).catch(() => null);
        return { ok: true };
    }
    async adminListAll(entity_type, q) {
        const Model = entity_type === 'lab' ? this.labs : this.rads;
        const filter = {};
        if (q.search)
            filter.$or = [{ name_ar: { $regex: q.search, $options: 'i' } }, { name_en: { $regex: q.search, $options: 'i' } }];
        const services = await Model.find(filter, { _id: 0, __v: 0 }).limit(500).lean();
        const ownMap = {};
        for (const o of await this.own.find({ entity_type, entity_id: { $in: services.map((s) => s.id) } }).lean())
            ownMap[o.entity_id] = o;
        return services.map((s) => ({ ...s, ownership: ownMap[s.id] || null }));
    }
    async adminApproveService(entity_type, entity_id, approve, user) {
        const o = await this.own.findOneAndUpdate({ entity_type, entity_id }, { $set: { approved: approve } }, { new: true });
        const Model = entity_type === 'lab' ? this.labs : this.rads;
        await Model.updateOne({ id: entity_id }, { $set: { active: approve } });
        this.bus.emit({ type: approve ? 'catalog.service_approved' : 'catalog.service_disabled', entity_type: 'service', entity_id, actor_account_id: user.id, actor_role: 'admin', meta: { kind: entity_type } }).catch(() => null);
        return { ok: true, ownership: o };
    }
    async getSchedule(user, entity_type) {
        this.assertProvider(user);
        let s = await this.sched.findOne({ account_id: user.id, entity_type }).lean();
        if (!s) {
            const created = await this.sched.create({ account_id: user.id, entity_type, weekly: DEFAULT_WEEKLY });
            s = created.toObject();
        }
        return s;
    }
    async upsertSchedule(user, entity_type, data) {
        this.assertProvider(user);
        const $set = {};
        for (const k of ['weekly', 'blocked_dates', 'slot_minutes', 'max_per_slot', 'coverage_radius_km', 'is_online'])
            if (data[k] !== undefined)
                $set[k] = data[k];
        const r = await this.sched.findOneAndUpdate({ account_id: user.id, entity_type }, { $set }, { new: true, upsert: true });
        this.bus.emit({ type: 'provider.schedule_updated', entity_type: 'provider_schedule', entity_id: r.id, actor_account_id: user.id, actor_role: user.role, meta: { entity_type } }).catch(() => null);
        return r.toObject();
    }
    async availableSlots(account_id, entity_type, date, bookedCounter) {
        let s = await this.sched.findOne({ account_id, entity_type }).lean();
        if (!s)
            s = { weekly: DEFAULT_WEEKLY, blocked_dates: [], slot_minutes: 30, max_per_slot: 1 };
        const day = new Date(date);
        if (s.blocked_dates?.includes(date))
            return [];
        const blocks = (s.weekly || DEFAULT_WEEKLY)[dayKey(day)] || [];
        const dur = s.slot_minutes || 30;
        const out = [];
        for (const b of blocks) {
            let cur = fromHM(day, b.start);
            const end = fromHM(day, b.end);
            while (cur < end) {
                const next = new Date(cur.getTime() + dur * 60000);
                if (next > end)
                    break;
                const inBr = (b.breaks || []).some((br) => toHM(cur) >= br.start && toHM(cur) < br.end);
                if (!inBr && cur.getTime() > Date.now()) {
                    const iso = cur.toISOString();
                    const booked = bookedCounter ? await bookedCounter(iso) : 0;
                    out.push({ time: iso, available: booked < (s.max_per_slot || 1) });
                }
                cur = next;
            }
        }
        return out;
    }
};
exports.ServiceCatalogService = ServiceCatalogService;
exports.ServiceCatalogService = ServiceCatalogService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('LabService')),
    __param(1, (0, mongoose_1.InjectModel)('RadiologyService')),
    __param(2, (0, mongoose_1.InjectModel)('ServiceOwnership')),
    __param(3, (0, mongoose_1.InjectModel)('ProviderSchedule')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        event_bus_service_1.EventBusService])
], ServiceCatalogService);
let ServiceCatalogController = class ServiceCatalogController {
    constructor(svc) {
        this.svc = svc;
    }
    mine(t, u) { return this.svc.myCatalog(u, t); }
    create(t, b, u) { return this.svc.createService(u, t, b); }
    update(t, id, b, u) { return this.svc.updateService(u, t, id, b); }
    toggle(t, id, b, u) { return this.svc.toggleService(u, t, id, !!b.active); }
    del(t, id, u) { return this.svc.deleteService(u, t, id); }
    sched(e, u) { return this.svc.getSchedule(u, e); }
    setSched(e, b, u) { return this.svc.upsertSchedule(u, e, b); }
    adminAll(t, q) { return this.svc.adminListAll(t, q); }
    approve(t, id, b, u) { return this.svc.adminApproveService(t, id, b.approve !== false, u); }
};
exports.ServiceCatalogController = ServiceCatalogController;
__decorate([
    (0, common_1.Get)('mine/:type'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ServiceCatalogController.prototype, "mine", null);
__decorate([
    (0, common_1.Post)('mine/:type'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ServiceCatalogController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('mine/:type/:id'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], ServiceCatalogController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('mine/:type/:id/toggle'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], ServiceCatalogController.prototype, "toggle", null);
__decorate([
    (0, common_1.Delete)('mine/:type/:id'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ServiceCatalogController.prototype, "del", null);
__decorate([
    (0, common_1.Get)('schedule/:entity'),
    __param(0, (0, common_1.Param)('entity')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ServiceCatalogController.prototype, "sched", null);
__decorate([
    (0, common_1.Patch)('schedule/:entity'),
    __param(0, (0, common_1.Param)('entity')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ServiceCatalogController.prototype, "setSched", null);
__decorate([
    (0, common_1.Get)('admin/:type'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ServiceCatalogController.prototype, "adminAll", null);
__decorate([
    (0, common_1.Post)('admin/:type/:id/approve'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], ServiceCatalogController.prototype, "approve", null);
exports.ServiceCatalogController = ServiceCatalogController = __decorate([
    (0, common_1.Controller)('service-catalog'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ServiceCatalogService])
], ServiceCatalogController);
let ServiceCatalogModule = class ServiceCatalogModule {
};
exports.ServiceCatalogModule = ServiceCatalogModule;
exports.ServiceCatalogModule = ServiceCatalogModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'LabService', schema: lab_schema_1.LabServiceSchema },
                { name: 'RadiologyService', schema: radiology_schema_1.RadiologyServiceSchema },
                { name: 'ServiceOwnership', schema: exports.ServiceOwnershipSchema },
                { name: 'ProviderSchedule', schema: exports.ProviderScheduleSchema },
            ])],
        controllers: [ServiceCatalogController],
        providers: [ServiceCatalogService],
        exports: [ServiceCatalogService, mongoose_1.MongooseModule],
    })
], ServiceCatalogModule);
//# sourceMappingURL=service-catalog.module.js.map