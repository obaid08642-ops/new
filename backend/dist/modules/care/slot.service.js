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
exports.SlotService = void 0;
const common_1 = require("@nestjs/common");
const appointment_repository_1 = require("./repositories/appointment.repository");
let SlotService = class SlotService {
    constructor(apptModel) {
        this.apptModel = apptModel;
        this.DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    }
    async slotsForDate(doctor, dateStr, service_type, duration_minutes = 30) {
        if (!doctor.consultation_modes?.includes(service_type)) {
            return { date: dateStr, service_type, slots: [], reason: 'service_not_supported' };
        }
        const date = new Date(dateStr + 'T00:00:00Z');
        if (isNaN(date.getTime()))
            return { date: dateStr, service_type, slots: [], reason: 'invalid_date' };
        const dayKey = this.DAY_KEYS[date.getUTCDay()];
        const wh = (doctor.working_hours || []).find((w) => w.day === dayKey || w.day === 'all');
        if (!wh || wh.closed) {
            return { date: dateStr, service_type, slots: [], reason: 'closed' };
        }
        const [oh, om] = wh.open.split(':').map(Number);
        const [ch, cm] = wh.close.split(':').map(Number);
        const baseDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const openTs = new Date(baseDate.getTime() + oh * 3600_000 + om * 60_000);
        let closeTs = new Date(baseDate.getTime() + ch * 3600_000 + cm * 60_000);
        if (closeTs.getTime() <= openTs.getTime())
            closeTs = new Date(closeTs.getTime() + 24 * 3600_000);
        const slots = [];
        const now = Date.now();
        for (let t = openTs.getTime(); t + duration_minutes * 60_000 <= closeTs.getTime(); t += duration_minutes * 60_000) {
            const start = new Date(t);
            const end = new Date(t + duration_minutes * 60_000);
            if (start.getTime() < now + 15 * 60_000)
                continue;
            const slotId = start.toISOString();
            slots.push({
                id: slotId,
                start: slotId,
                end: end.toISOString(),
                label: slotId.substring(11, 16),
                available: true,
            });
        }
        if (slots.length === 0)
            return { date: dateStr, service_type, slots: [], reason: 'no_slots' };
        const startOfDay = new Date(baseDate.getTime());
        const endOfDay = new Date(baseDate.getTime() + 24 * 3600_000);
        const booked = await this.apptModel.find({
            doctor_id: doctor.id,
            slot_start: { $gte: startOfDay, $lt: endOfDay },
            status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
        }).select({ slot_start: 1 }).lean();
        const bookedSet = new Set(booked.map((b) => new Date(b.slot_start).toISOString()));
        for (const s of slots) {
            if (bookedSet.has(s.start))
                s.available = false;
        }
        return { date: dateStr, service_type, slots };
    }
    async hasSlotsToday(doctor) {
        const today = new Date().toISOString().substring(0, 10);
        const mode = (doctor.consultation_modes && doctor.consultation_modes[0]);
        if (!mode)
            return false;
        const r = await this.slotsForDate(doctor, today, mode);
        return r.slots.some((s) => s.available);
    }
    async nextAvailable(doctor) {
        const mode = (doctor.consultation_modes && doctor.consultation_modes[0]);
        if (!mode)
            return null;
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(today.getTime() + i * 24 * 3600_000);
            const dateStr = d.toISOString().substring(0, 10);
            const r = await this.slotsForDate(doctor, dateStr, mode);
            const slot = r.slots.find((s) => s.available);
            if (slot)
                return slot.start;
        }
        return null;
    }
};
exports.SlotService = SlotService;
exports.SlotService = SlotService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('AppointmentRepository')),
    __metadata("design:paramtypes", [appointment_repository_1.AppointmentRepository])
], SlotService);
//# sourceMappingURL=slot.service.js.map