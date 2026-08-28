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
exports.MaternityService = void 0;
const common_1 = require("@nestjs/common");
const maternityprofile_repository_1 = require("./repositories/maternityprofile.repository");
let MaternityService = class MaternityService {
    constructor(model) {
        this.model = model;
    }
    calculateCurrentWeek(dueDate) {
        if (!dueDate || Number.isNaN(dueDate.getTime()))
            return null;
        const lmp = new Date(dueDate.getTime() - 280 * 24 * 60 * 60 * 1000);
        const days = Math.floor((Date.now() - lmp.getTime()) / (24 * 60 * 60 * 1000));
        if (days < 0 || days > 294)
            return null;
        return Math.max(1, Math.min(42, Math.ceil(days / 7)));
    }
    parseDate(value, field) {
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime()))
            throw new common_1.BadRequestException(`invalid ${field}`);
        return date;
    }
    integerInRange(value, field, min, max) {
        const number = Number(value);
        if (!Number.isInteger(number) || number < min || number > max)
            throw new common_1.BadRequestException(`${field} must be an integer between ${min} and ${max}`);
        return number;
    }
    requireProfile(profile) {
        if (!profile)
            throw new common_1.NotFoundException('Maternity profile not found');
        return profile;
    }
    getContent() {
        return { pregnant_links: [], planning_links: [], weekly_tips: [], planning_tips: [] };
    }
    async getProfile(userId) {
        const profile = await this.model.findOne({ patient_id: userId });
        if (!profile)
            return { patient_id: userId, profile_ready: false, tracking_mode: null };
        const week = profile.is_pregnant ? this.calculateCurrentWeek(profile.due_date) : null;
        if (week !== null && profile.current_week !== week) {
            profile.current_week = week;
            await profile.save();
        }
        const source = profile.toObject();
        return { ...source, current_week: week, profile_ready: Boolean(source.is_pregnant ? source.due_date : source.last_period_date && source.cycle_length), tracking_mode: source.is_pregnant ? 'pregnancy' : 'cycle', estimate_notice: 'Dates and fertile-window information are estimates based on your entries, not medical diagnosis or contraception.' };
    }
    async updateProfile(userId, updateData) {
        let profile = await this.model.findOne({ patient_id: userId });
        if (typeof updateData?.is_pregnant !== 'boolean')
            throw new common_1.BadRequestException('is_pregnant is required');
        const fields = { is_pregnant: updateData.is_pregnant };
        if (updateData.is_pregnant) {
            let dueDate;
            if (updateData.due_date)
                dueDate = this.parseDate(updateData.due_date, 'due_date');
            else if (updateData.lmp_date) {
                const lmp = this.parseDate(updateData.lmp_date, 'lmp_date');
                dueDate = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
                fields.last_period_date = lmp;
            }
            else if (profile?.due_date)
                dueDate = profile.due_date;
            else
                throw new common_1.BadRequestException('due_date or lmp_date is required for pregnancy tracking');
            const week = this.calculateCurrentWeek(dueDate);
            if (week === null)
                throw new common_1.BadRequestException('pregnancy date is outside the supported estimate range');
            fields.due_date = dueDate;
            fields.current_week = week;
        }
        else {
            const lastPeriod = updateData.last_period_date ? this.parseDate(updateData.last_period_date, 'last_period_date') : profile?.last_period_date;
            const cycleLength = updateData.cycle_length !== undefined ? this.integerInRange(updateData.cycle_length, 'cycle_length', 15, 90) : profile?.cycle_length;
            if (!lastPeriod || !cycleLength)
                throw new common_1.BadRequestException('last_period_date and cycle_length are required for cycle tracking');
            fields.last_period_date = lastPeriod;
            fields.cycle_length = cycleLength;
            fields.current_week = undefined;
            fields.due_date = undefined;
            if (updateData.prev_period_date)
                fields.prev_period_date = this.parseDate(updateData.prev_period_date, 'prev_period_date');
            if (updateData.is_regular !== undefined) {
                if (typeof updateData.is_regular !== 'boolean')
                    throw new common_1.BadRequestException('is_regular must be boolean');
                fields.is_regular = updateData.is_regular;
            }
        }
        if (profile) {
            Object.assign(profile, fields);
            await profile.save();
        }
        else {
            profile = await this.model.create({ patient_id: userId, checkups: [], ...fields });
        }
        return this.getProfile(userId);
    }
    async logKick(userId, count, durationSeconds) {
        const profile = this.requireProfile(await this.model.findOne({ patient_id: userId }));
        if (!profile.is_pregnant)
            throw new common_1.BadRequestException('kick logging requires pregnancy tracking');
        profile.kicks_log.push({
            id: undefined,
            count: this.integerInRange(count, 'count', 1, 200),
            duration_seconds: this.integerInRange(durationSeconds, 'duration_seconds', 1, 86400),
            date: new Date(),
        });
        await profile.save();
        return profile.toObject();
    }
    async logContraction(userId, intervalSeconds, durationSeconds) {
        const profile = this.requireProfile(await this.model.findOne({ patient_id: userId }));
        if (!profile.is_pregnant)
            throw new common_1.BadRequestException('contraction logging requires pregnancy tracking');
        profile.contractions_log.push({
            id: undefined,
            interval_seconds: this.integerInRange(intervalSeconds, 'interval_seconds', 1, 86400),
            duration_seconds: this.integerInRange(durationSeconds, 'duration_seconds', 1, 7200),
            date: new Date(),
        });
        await profile.save();
        return profile.toObject();
    }
    async toggleCheckup(userId, checkupWeek) {
        const profile = this.requireProfile(await this.model.findOne({ patient_id: userId }));
        const checkup = profile.checkups.find(c => c.week === checkupWeek);
        if (!checkup)
            throw new common_1.NotFoundException(`Checkup for week ${checkupWeek} not found`);
        checkup.done = !checkup.done;
        await profile.save();
        return profile.toObject();
    }
    async logInfantGrowth(userId, data) {
        const profile = this.requireProfile(await this.model.findOne({ patient_id: userId }));
        data.month = this.integerInRange(data.month, 'month', 0, 240);
        if (data.weight_kg !== undefined && (!Number.isFinite(data.weight_kg) || data.weight_kg <= 0 || data.weight_kg > 100))
            throw new common_1.BadRequestException('invalid infant weight');
        if (data.height_cm !== undefined && (!Number.isFinite(data.height_cm) || data.height_cm <= 0 || data.height_cm > 250))
            throw new common_1.BadRequestException('invalid infant height');
        if (data.head_circ_cm !== undefined && (!Number.isFinite(data.head_circ_cm) || data.head_circ_cm <= 0 || data.head_circ_cm > 100))
            throw new common_1.BadRequestException('invalid infant head circumference');
        const existingIndex = profile.infant_growth.findIndex(g => g.month === data.month);
        if (existingIndex >= 0) {
            if (data.weight_kg)
                profile.infant_growth[existingIndex].weight_kg = data.weight_kg;
            if (data.height_cm)
                profile.infant_growth[existingIndex].height_cm = data.height_cm;
            if (data.head_circ_cm)
                profile.infant_growth[existingIndex].head_circ_cm = data.head_circ_cm;
        }
        else {
            profile.infant_growth.push({
                id: undefined,
                month: data.month,
                weight_kg: data.weight_kg,
                height_cm: data.height_cm,
                head_circ_cm: data.head_circ_cm,
                date: new Date(),
            });
        }
        await profile.save();
        return profile.toObject();
    }
};
exports.MaternityService = MaternityService;
exports.MaternityService = MaternityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('MaternityProfileRepository')),
    __metadata("design:paramtypes", [maternityprofile_repository_1.MaternityProfileRepository])
], MaternityService);
//# sourceMappingURL=maternity.service.js.map