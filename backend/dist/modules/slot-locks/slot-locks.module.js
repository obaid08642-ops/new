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
exports.SlotLocksModule = exports.SlotLocksController = exports.SlotLocksService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const slot_lock_schema_1 = require("../../schemas/slot-lock.schema");
const auth_guard_1 = require("../../common/auth.guard");
const LOCK_TTL_MS = 10 * 60 * 1000;
let SlotLocksService = class SlotLocksService {
    constructor(locks) {
        this.locks = locks;
    }
    async reserve(user, body) {
        if (!body.provider_id || !body.slot_start)
            throw new common_1.BadRequestException('missing_fields');
        const start = new Date(body.slot_start);
        const end = body.slot_end ? new Date(body.slot_end) : new Date(start.getTime() + 30 * 60 * 1000);
        await this.locks.deleteMany({ status: 'held', expires_at: { $lt: new Date() } });
        const conflict = await this.locks.findOne({
            provider_id: body.provider_id,
            status: { $in: ['held', 'confirmed'] },
            slot_start: { $lt: end },
            slot_end: { $gt: start },
        });
        if (conflict && conflict.patient_id !== user.id)
            throw new common_1.ConflictException('slot_taken');
        if (conflict && conflict.patient_id === user.id)
            return conflict.toObject ? conflict.toObject() : conflict;
        const expires_at = new Date(Date.now() + LOCK_TTL_MS);
        const lock = await this.locks.create({ provider_id: body.provider_id, patient_id: user.id, booking_kind: body.booking_kind, slot_start: start, slot_end: end, status: 'held', expires_at });
        return { ...lock.toObject(), ttl_ms: LOCK_TTL_MS };
    }
    async confirm(user, lockId, booking_id) {
        const l = await this.locks.findOne({ id: lockId, patient_id: user.id });
        if (!l)
            throw new common_1.BadRequestException('lock_not_found');
        if (l.status !== 'held')
            throw new common_1.BadRequestException('lock_not_holdable');
        l.status = 'confirmed';
        l.booking_id = booking_id;
        l.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        await l.save();
        return l.toObject();
    }
    async release(user, lockId) {
        const l = await this.locks.findOne({ id: lockId, patient_id: user.id });
        if (!l)
            return { ok: true };
        l.status = 'released';
        l.expires_at = new Date();
        await l.save();
        return { ok: true };
    }
    async mine(user) { return this.locks.find({ patient_id: user.id, status: { $in: ['held', 'confirmed'] } }).lean(); }
};
exports.SlotLocksService = SlotLocksService;
exports.SlotLocksService = SlotLocksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('SlotLock')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], SlotLocksService);
let SlotLocksController = class SlotLocksController {
    constructor(svc) {
        this.svc = svc;
    }
    reserve(u, b) { return this.svc.reserve(u, b); }
    confirm(u, id, b) { return this.svc.confirm(u, id, b.booking_id); }
    release(u, id) { return this.svc.release(u, id); }
    mine(u) { return this.svc.mine(u); }
};
exports.SlotLocksController = SlotLocksController;
__decorate([
    (0, common_1.Post)('reserve'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SlotLocksController.prototype, "reserve", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], SlotLocksController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)(':id/release'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SlotLocksController.prototype, "release", null);
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SlotLocksController.prototype, "mine", null);
exports.SlotLocksController = SlotLocksController = __decorate([
    (0, common_1.Controller)('slot-locks'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [SlotLocksService])
], SlotLocksController);
let SlotLocksModule = class SlotLocksModule {
};
exports.SlotLocksModule = SlotLocksModule;
exports.SlotLocksModule = SlotLocksModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: 'SlotLock', schema: slot_lock_schema_1.SlotLockSchema }])],
        controllers: [SlotLocksController],
        providers: [SlotLocksService],
        exports: [SlotLocksService],
    })
], SlotLocksModule);
//# sourceMappingURL=slot-locks.module.js.map