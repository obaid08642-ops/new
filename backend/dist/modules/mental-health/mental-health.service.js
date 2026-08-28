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
exports.MentalHealthService = void 0;
const common_1 = require("@nestjs/common");
const mental_health_schema_1 = require("../../schemas/mental-health.schema");
const moodentry_repository_1 = require("./repositories/moodentry.repository");
const meditationsession_repository_1 = require("./repositories/meditationsession.repository");
const breathingsession_repository_1 = require("./repositories/breathingsession.repository");
const crisiscontact_repository_1 = require("./repositories/crisiscontact.repository");
const MAX_HISTORY_DAYS = 365;
const MAX_MOOD_TAGS = 8;
const MAX_MOOD_TAG_LENGTH = 32;
const MAX_NOTE_LENGTH = 500;
let MentalHealthService = class MentalHealthService {
    constructor(moodModel, meditationModel, breathingModel, crisisModel) {
        this.moodModel = moodModel;
        this.meditationModel = meditationModel;
        this.breathingModel = breathingModel;
        this.crisisModel = crisisModel;
    }
    requirePatientId(userId) {
        if (typeof userId !== 'string' || !userId.trim() || userId === 'guest') {
            throw new common_1.BadRequestException('هوية المريض مطلوبة / Patient identity is required');
        }
    }
    parseEventDate(value, field) {
        const parsed = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() + 5 * 60 * 1000) {
            throw new common_1.BadRequestException(`${field} غير صالح / ${field} is invalid`);
        }
        return parsed;
    }
    optionalScale(value, field) {
        if (value === undefined || value === null)
            return undefined;
        const numberValue = typeof value === 'number' ? value : Number(value);
        if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > 5) {
            throw new common_1.BadRequestException(`${field} يجب أن يكون عدداً صحيحاً من 1 إلى 5 / ${field} must be an integer from 1 to 5`);
        }
        return numberValue;
    }
    normaliseMoodInput(data) {
        if (!data || !Object.values(mental_health_schema_1.MoodValue).includes(data.mood)) {
            throw new common_1.BadRequestException('قيمة المزاج مطلوبة وغير صالحة / A valid mood value is required');
        }
        const payload = {
            mood: data.mood,
            logged_at: data.logged_at === undefined ? new Date() : this.parseEventDate(data.logged_at, 'logged_at'),
        };
        const energyLevel = this.optionalScale(data.energy_level, 'energy_level');
        const stressLevel = this.optionalScale(data.stress_level, 'stress_level');
        if (energyLevel !== undefined)
            payload.energy_level = energyLevel;
        if (stressLevel !== undefined)
            payload.stress_level = stressLevel;
        if (data.sleep_hours !== undefined && data.sleep_hours !== null) {
            const sleepHours = typeof data.sleep_hours === 'number' ? data.sleep_hours : Number(data.sleep_hours);
            if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24) {
                throw new common_1.BadRequestException('sleep_hours يجب أن يكون بين 0 و24 / sleep_hours must be between 0 and 24');
            }
            payload.sleep_hours = sleepHours;
        }
        if (data.notes !== undefined && data.notes !== null) {
            if (typeof data.notes !== 'string' || data.notes.trim().length > MAX_NOTE_LENGTH) {
                throw new common_1.BadRequestException(`notes يجب ألا يتجاوز ${MAX_NOTE_LENGTH} حرفاً / notes must not exceed ${MAX_NOTE_LENGTH} characters`);
            }
            const notes = data.notes.trim();
            if (notes)
                payload.notes = notes;
        }
        if (data.tags !== undefined && data.tags !== null) {
            if (!Array.isArray(data.tags) || data.tags.length > MAX_MOOD_TAGS) {
                throw new common_1.BadRequestException(`tags يجب أن تكون قائمة من ${MAX_MOOD_TAGS} عناصر كحد أقصى / tags must contain no more than ${MAX_MOOD_TAGS} items`);
            }
            const tags = data.tags.map((tag) => {
                if (typeof tag !== 'string' || !tag.trim() || tag.trim().length > MAX_MOOD_TAG_LENGTH) {
                    throw new common_1.BadRequestException(`كل وسم يجب ألا يتجاوز ${MAX_MOOD_TAG_LENGTH} حرفاً / each tag must not exceed ${MAX_MOOD_TAG_LENGTH} characters`);
                }
                return tag.trim();
            });
            if (new Set(tags).size !== tags.length) {
                throw new common_1.BadRequestException('لا يمكن تكرار الوسوم / Tags must be unique');
            }
            if (tags.length)
                payload.tags = tags;
        }
        return payload;
    }
    async logMood(userId, data) {
        this.requirePatientId(userId);
        const entry = await this.moodModel.create({
            patient_id: userId,
            ...this.normaliseMoodInput(data),
        });
        return entry.toObject();
    }
    async getMoodHistory(userId, days = 30) {
        this.requirePatientId(userId);
        if (!Number.isInteger(days) || days < 1 || days > MAX_HISTORY_DAYS) {
            throw new common_1.BadRequestException(`days يجب أن يكون عدداً صحيحاً من 1 إلى ${MAX_HISTORY_DAYS} / days must be an integer from 1 to ${MAX_HISTORY_DAYS}`);
        }
        const since = new Date();
        since.setDate(since.getDate() - days);
        return this.moodModel.find({ patient_id: userId, logged_at: { $gte: since } }).sort({ logged_at: -1 }).lean();
    }
    async getMoodStats(userId) {
        this.requirePatientId(userId);
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const entries = await this.moodModel.find({ patient_id: userId, logged_at: { $gte: since } }).lean();
        const average = (values) => {
            if (!values.length)
                return null;
            return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
        };
        return {
            total_entries: entries.length,
            avg_mood: average(entries.map((entry) => mental_health_schema_1.MOOD_SCORE_MAP[entry.mood]).filter(Number.isFinite)),
            avg_energy: average(entries.map((entry) => entry.energy_level).filter(Number.isFinite)),
            avg_stress: average(entries.map((entry) => entry.stress_level).filter(Number.isFinite)),
            avg_sleep: average(entries.map((entry) => entry.sleep_hours).filter(Number.isFinite)),
        };
    }
    async logMeditation(userId, data) {
        this.requirePatientId(userId);
        if (!data || !Object.values(mental_health_schema_1.MeditationType).includes(data.type)) {
            throw new common_1.BadRequestException('نوع الممارسة مطلوب وغير صالح / A valid practice type is required');
        }
        const duration = Number(data.duration_minutes);
        if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
            throw new common_1.BadRequestException('duration_minutes يجب أن يكون من 1 إلى 180 / duration_minutes must be from 1 to 180');
        }
        if (data.completed !== undefined && typeof data.completed !== 'boolean') {
            throw new common_1.BadRequestException('completed يجب أن يكون true أو false / completed must be true or false');
        }
        const session = await this.meditationModel.create({
            patient_id: userId,
            type: data.type,
            duration_minutes: duration,
            ...(data.completed !== undefined ? { completed: data.completed } : {}),
            logged_at: data.logged_at === undefined ? new Date() : this.parseEventDate(data.logged_at, 'logged_at'),
        });
        return session.toObject();
    }
    async getMeditationHistory(userId) {
        this.requirePatientId(userId);
        return this.meditationModel.find({ patient_id: userId }).sort({ logged_at: -1 }).limit(30).lean();
    }
    async getMeditationStats(userId) {
        this.requirePatientId(userId);
        const sessions = await this.meditationModel.find({ patient_id: userId }).sort({ logged_at: -1 }).lean();
        const completed = sessions.filter((session) => session.completed === true);
        const totalMinutes = completed.reduce((sum, session) => sum + (Number.isFinite(session.duration_minutes) ? session.duration_minutes : 0), 0);
        return { total_sessions: sessions.length, completed_sessions: completed.length, total_minutes: totalMinutes };
    }
    async logBreathing(userId, data) {
        this.requirePatientId(userId);
        if (!data || !Object.values(mental_health_schema_1.BreathingTechnique).includes(data.technique)) {
            throw new common_1.BadRequestException('تقنية التنفس مطلوبة وغير صالحة / A valid breathing technique is required');
        }
        const rounds = Number(data.rounds);
        const duration = Number(data.duration_seconds);
        if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100 || !Number.isInteger(duration) || duration < 1 || duration > 7200) {
            throw new common_1.BadRequestException('بيانات جلسة التنفس غير صالحة / Breathing session data is invalid');
        }
        const session = await this.breathingModel.create({
            patient_id: userId,
            technique: data.technique,
            rounds,
            duration_seconds: duration,
            logged_at: data.logged_at === undefined ? new Date() : this.parseEventDate(data.logged_at, 'logged_at'),
        });
        return session.toObject();
    }
    async getBreathingHistory(userId) {
        this.requirePatientId(userId);
        return this.breathingModel.find({ patient_id: userId }).sort({ logged_at: -1 }).limit(30).lean();
    }
    async getCrisisContacts(userId) {
        this.requirePatientId(userId);
        const userContacts = await this.crisisModel.find({ patient_id: userId }).lean();
        return { user_contacts: userContacts };
    }
    async addCrisisContact(userId, data) {
        this.requirePatientId(userId);
        const name = typeof data?.contact_name === 'string' ? data.contact_name.trim() : '';
        const phone = typeof data?.phone === 'string' ? data.phone.trim() : '';
        const relationship = typeof data?.relationship === 'string' ? data.relationship.trim() : undefined;
        if (!name || name.length > 80 || !phone || !/^[0-9+()\-\s]{3,30}$/.test(phone) || (relationship !== undefined && relationship.length > 80)) {
            throw new common_1.BadRequestException('بيانات جهة الاتصال غير صالحة / Crisis contact data is invalid');
        }
        if (data.is_professional !== undefined && typeof data.is_professional !== 'boolean') {
            throw new common_1.BadRequestException('is_professional يجب أن يكون true أو false / is_professional must be true or false');
        }
        const contact = await this.crisisModel.create({
            patient_id: userId,
            contact_name: name,
            phone,
            ...(relationship ? { relationship } : {}),
            ...(data.is_professional !== undefined ? { is_professional: data.is_professional } : {}),
        });
        return contact.toObject();
    }
    async deleteCrisisContact(userId, contactId) {
        this.requirePatientId(userId);
        if (!contactId?.trim())
            throw new common_1.BadRequestException('معرّف جهة الاتصال مطلوب / A contact identifier is required');
        const result = await this.crisisModel.findOneAndDelete({ patient_id: userId, id: contactId });
        if (!result)
            throw new common_1.NotFoundException('جهة الاتصال غير موجودة / Crisis contact not found');
        return { deleted: true };
    }
    async getDashboard(userId) {
        this.requirePatientId(userId);
        const [mood, meditation, recentMoods] = await Promise.all([
            this.getMoodStats(userId),
            this.getMeditationStats(userId),
            this.moodModel.find({ patient_id: userId }).sort({ logged_at: -1 }).limit(7).lean(),
        ]);
        return { mood, meditation, recent_moods: recentMoods };
    }
};
exports.MentalHealthService = MentalHealthService;
exports.MentalHealthService = MentalHealthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('MoodEntryRepository')),
    __param(1, (0, common_1.Inject)('MeditationSessionRepository')),
    __param(2, (0, common_1.Inject)('BreathingSessionRepository')),
    __param(3, (0, common_1.Inject)('CrisisContactRepository')),
    __metadata("design:paramtypes", [moodentry_repository_1.MoodEntryRepository,
        meditationsession_repository_1.MeditationSessionRepository,
        breathingsession_repository_1.BreathingSessionRepository,
        crisiscontact_repository_1.CrisisContactRepository])
], MentalHealthService);
//# sourceMappingURL=mental-health.service.js.map