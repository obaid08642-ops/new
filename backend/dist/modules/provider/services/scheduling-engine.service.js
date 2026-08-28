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
exports.SchedulingEngineService = void 0;
const common_1 = require("@nestjs/common");
const requests_schema_1 = require("../schemas/requests.schema");
const providerscheduleslot_repository_1 = require("./repositories/providerscheduleslot.repository");
const providerrequest_repository_1 = require("./repositories/providerrequest.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(user) {
    if (!user || !(0, enums_1.isProviderRole)(user.role))
        throw new common_1.ForbiddenException('provider scope required');
    return user;
}
function parseHHMM(s) {
    if (!/^\d{2}:\d{2}$/.test(s))
        return -1;
    const [h, m] = s.split(':').map(Number);
    if (h < 0 || h > 23 || m < 0 || m > 59)
        return -1;
    return h * 60 + m;
}
let SchedulingEngineService = class SchedulingEngineService {
    constructor(slots, requests) {
        this.slots = slots;
        this.requests = requests;
    }
    async listSlots(user) {
        assertProvider(user);
        return this.slots.find({ provider_account_id: user.id }).sort({ day_of_week: 1, start_time: 1 }).lean();
    }
    async upsertSlot(user, body) {
        assertProvider(user);
        const dow = body?.day_of_week;
        if (dow == null || dow < 0 || dow > 6)
            throw new common_1.BadRequestException('day_of_week (0-6) is required');
        const s = parseHHMM(body.start_time);
        const e = parseHHMM(body.end_time);
        if (s < 0 || e < 0 || e <= s)
            throw new common_1.BadRequestException('invalid start_time/end_time (HH:MM, end > start)');
        if (body.id) {
            const u = await this.slots.findOneAndUpdate({ id: body.id, provider_account_id: user.id }, { ...body, provider_account_id: user.id }, { new: true });
            if (!u)
                throw new common_1.NotFoundException();
            return u.toObject();
        }
        const r = await this.slots.create({ ...body, provider_account_id: user.id });
        return r.toObject();
    }
    async deleteSlot(user, id) {
        assertProvider(user);
        const r = await this.slots.findOneAndDelete({ id, provider_account_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async checkAvailability(provider_account_id, desiredAt, duration_minutes = 30) {
        const d = new Date(desiredAt);
        const dow = d.getDay();
        const startMin = d.getHours() * 60 + d.getMinutes();
        const endMin = startMin + duration_minutes;
        const slot = await this.slots.findOne({ provider_account_id, day_of_week: dow, active: true }).lean();
        if (!slot)
            return { available: false, reason: 'no_weekly_slot_for_day', day_of_week: dow };
        const sStart = parseHHMM(slot.start_time);
        const sEnd = parseHHMM(slot.end_time);
        if (startMin < sStart || endMin > sEnd) {
            return { available: false, reason: 'outside_working_hours', slot };
        }
        const winStart = new Date(d.getTime() - duration_minutes * 60 * 1000);
        const winEnd = new Date(d.getTime() + duration_minutes * 60 * 1000);
        const overlapping = await this.requests.countDocuments({
            provider_account_id,
            status: { $in: [requests_schema_1.ProviderRequestStatus.ACCEPTED, requests_schema_1.ProviderRequestStatus.IN_PROGRESS] },
            scheduled_at: { $gte: winStart, $lte: winEnd },
        });
        const capacity = slot.capacity_per_slot || 1;
        if (overlapping >= capacity) {
            return { available: false, reason: 'capacity_full', current_load: overlapping, capacity };
        }
        return { available: true, slot, current_load: overlapping, capacity };
    }
    async getWorkload(provider_account_id) {
        return this.requests.countDocuments({
            provider_account_id,
            status: { $in: [requests_schema_1.ProviderRequestStatus.ACCEPTED, requests_schema_1.ProviderRequestStatus.IN_PROGRESS] },
        });
    }
    async isOnDuty(provider_account_id, at = new Date()) {
        const dow = at.getDay();
        const minutes = at.getHours() * 60 + at.getMinutes();
        const slot = await this.slots.findOne({ provider_account_id, day_of_week: dow, active: true }).lean();
        if (!slot)
            return false;
        const s = parseHHMM(slot.start_time);
        const e = parseHHMM(slot.end_time);
        return minutes >= s && minutes <= e;
    }
};
exports.SchedulingEngineService = SchedulingEngineService;
exports.SchedulingEngineService = SchedulingEngineService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderScheduleSlotRepository')),
    __param(1, (0, common_1.Inject)('ProviderRequestRepository')),
    __metadata("design:paramtypes", [providerscheduleslot_repository_1.ProviderScheduleSlotRepository,
        providerrequest_repository_1.ProviderRequestRepository])
], SchedulingEngineService);
//# sourceMappingURL=scheduling-engine.service.js.map