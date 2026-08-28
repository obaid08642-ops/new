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
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const vitalreading_repository_1 = require("./repositories/vitalreading.repository");
const medicationreminder_repository_1 = require("./repositories/medicationreminder.repository");
const sleepreading_repository_1 = require("./repositories/sleepreading.repository");
const orders_service_1 = require("../orders/orders.service");
const VALID_TYPES = ['bp', 'glucose', 'heart_rate', 'weight', 'temperature', 'spo2'];
let HealthService = class HealthService {
    constructor(vitals, reminders, sleepModel, orders, conn, events) {
        this.vitals = vitals;
        this.reminders = reminders;
        this.sleepModel = sleepModel;
        this.orders = orders;
        this.conn = conn;
        this.events = events;
    }
    normalizeVitalType(rawType) {
        const aliases = { sugar: 'glucose', heart: 'heart_rate' };
        const type = aliases[String(rawType || '').trim().toLowerCase()] || String(rawType || '').trim().toLowerCase();
        if (!VALID_TYPES.includes(type))
            throw new common_1.BadRequestException('invalid vital type');
        return type;
    }
    normalizeVitalInput(data) {
        const raw = data || {};
        const type = this.normalizeVitalType(raw.type);
        const measured_at = raw.measured_at || raw.recorded_at;
        if (measured_at && Number.isNaN(new Date(measured_at).getTime()))
            throw new common_1.BadRequestException('valid measured_at required');
        const context = raw.context || raw.time_of_day;
        if (type === 'bp') {
            const fromValue = String(raw.value || '').split('/');
            const systolic = Number(raw.systolic ?? fromValue[0]);
            const diastolic = Number(raw.diastolic ?? raw.value_secondary ?? fromValue[1]);
            if (!Number.isFinite(systolic) || !Number.isFinite(diastolic) || systolic < 60 || systolic > 260 || diastolic < 30 || diastolic > 160 || systolic <= diastolic) {
                throw new common_1.BadRequestException('physiologically valid blood pressure required');
            }
            return { type, value: `${systolic}/${diastolic}`, value_secondary: diastolic, unit: raw.unit || this.defaultUnit(type), measured_at: measured_at ? new Date(measured_at) : new Date(), context, notes: raw.notes, source: raw.source || 'manual' };
        }
        const value = Number(raw.value);
        const ranges = { glucose: [20, 1000], heart_rate: [20, 300], weight: [1, 1000], temperature: [25, 45], spo2: [50, 100] };
        const [min, max] = ranges[type];
        if (!Number.isFinite(value) || value < min || value > max)
            throw new common_1.BadRequestException('physiologically valid vital value required');
        return { type, value: String(value), value_secondary: raw.value_secondary, unit: raw.unit || this.defaultUnit(type), measured_at: measured_at ? new Date(measured_at) : new Date(), context, notes: raw.notes, source: raw.source || 'manual' };
    }
    async addVital(user, data) {
        const normalized = this.normalizeVitalInput(data);
        const reading = await this.vitals.create({ patient_id: user.id, ...normalized });
        try {
            this.events?.emit('health.vitals_logged', { user_id: user.id });
        }
        catch { }
        return reading.toObject();
    }
    defaultUnit(t) {
        return { bp: 'mmHg', glucose: 'mg/dL', heart_rate: 'bpm', weight: 'kg', temperature: '°C', spo2: '%' }[t] || '';
    }
    async listVitals(user, type, limit = 100) {
        const q = { patient_id: user.id, deleted_at: null };
        if (type)
            q.type = this.normalizeVitalType(type);
        return this.vitals.find(q, { _id: 0, __v: 0 }).sort({ measured_at: -1 }).limit(Math.min(limit, 500));
    }
    async listVitalsLog(user, limit = 100) {
        const rows = await this.listVitals(user, undefined, limit);
        return {
            items: rows.map((row) => {
                const value = typeof row.toObject === 'function' ? row.toObject() : row;
                return {
                    id: value.id,
                    type: value.type === 'bp' ? 'blood_pressure' : value.type,
                    value: value.value,
                    unit: value.unit,
                    measured_at: value.measured_at,
                    source: value.source === 'device' ? 'device' : 'manual',
                    ...(value.context ? { context: value.context } : {}),
                };
            }),
        };
    }
    async vitalsChart(user, type) {
        if (!type)
            throw new common_1.BadRequestException('vital query param required');
        const now = Date.now();
        const windows = {
            day: { spanMs: 24 * 3600e3, buckets: 8 },
            week: { spanMs: 7 * 24 * 3600e3, buckets: 7 },
            month: { spanMs: 30 * 24 * 3600e3, buckets: 10 },
            year: { spanMs: 365 * 24 * 3600e3, buckets: 12 },
        };
        const readings = await this.vitals.find({ patient_id: user.id, type, deleted_at: null, measured_at: { $gte: new Date(now - windows.year.spanMs) } }, { _id: 0, value: 1, measured_at: 1 }).sort({ measured_at: 1 });
        const result = { day: [], week: [], month: [], year: [] };
        for (const [key, w] of Object.entries(windows)) {
            const start = now - w.spanMs;
            const inRange = readings.filter((r) => new Date(r.measured_at).getTime() >= start);
            const perBucket = [];
            for (let b = 0; b < w.buckets; b++) {
                const bStart = start + (b * w.spanMs) / w.buckets;
                const bEnd = start + ((b + 1) * w.spanMs) / w.buckets;
                const vals = inRange
                    .filter((r) => { const t = new Date(r.measured_at).getTime(); return t >= bStart && t < bEnd; })
                    .map((r) => parseFloat(r.value))
                    .filter((v) => isFinite(v));
                if (vals.length)
                    perBucket.push(Math.round((vals.reduce((a, c) => a + c, 0) / vals.length) * 10) / 10);
            }
            result[key] = perBucket;
        }
        return result;
    }
    async vitalsRecent(user, type, limit = 20) {
        const q = { patient_id: user.id, deleted_at: null };
        if (type)
            q.type = type;
        return this.vitals.find(q, { _id: 0, __v: 0 }).sort({ measured_at: -1 }).limit(Math.min(limit, 100));
    }
    async latestVitals(user) {
        const out = {};
        for (const t of VALID_TYPES) {
            const r = await this.vitals.findOne({ patient_id: user.id, type: t, deleted_at: null }, { _id: 0, __v: 0 }).sort({ measured_at: -1 });
            if (r)
                out[t] = r;
        }
        return out;
    }
    async vitalsSummary(user) {
        const latest = await this.latestVitals(user);
        const definitions = [
            { key: 'heart_rate', label: 'نبض القلب', icon: 'ecg_heart', color: '#EC4899', unit: 'bpm' },
            { key: 'glucose', label: 'سكر الدم', icon: 'water_drop', color: '#F0A526', unit: 'mg/dL' },
            { key: 'bp', label: 'ضغط الدم', icon: 'blood_pressure', color: '#8B5CF6', unit: 'mmHg' },
            { key: 'weight', label: 'الوزن', icon: 'monitor_weight', color: '#10B981', unit: 'kg' },
            { key: 'temperature', label: 'درجة الحرارة', icon: 'thermometer', color: '#F97316', unit: '°C' },
            { key: 'spo2', label: 'أكسجين الدم', icon: 'water_drop', color: '#06B6D4', unit: '%' },
        ];
        return definitions.flatMap((definition) => {
            const reading = latest[definition.key];
            if (!reading)
                return [];
            return [{
                    key: definition.key,
                    icon: definition.icon,
                    label: definition.label,
                    value: String(reading.value),
                    unit: reading.unit || definition.unit,
                    measured_at: reading.measured_at || null,
                    color: definition.color,
                }];
        });
    }
    async healthScore(user) {
        const [latest, profile, sleep, weekCount] = await Promise.all([
            this.latestVitals(user),
            this.conn.model('MedicalProfile').findOne({ patient_id: user.id }).select('height_cm weight_kg -_id').lean().catch(() => null),
            this.sleepModel.findOne({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ measured_at: -1 }).catch(() => null),
            this.vitals.countDocuments({ patient_id: user.id, measured_at: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } }).catch(() => 0),
        ]);
        const components = [];
        const recommendations = [];
        const p = profile;
        if (p?.height_cm > 0 && p?.weight_kg > 0) {
            const bmi = p.weight_kg / Math.pow(p.height_cm / 100, 2);
            const score = bmi < 18.5 ? 55 : bmi < 25 ? 100 : bmi < 30 ? 70 : bmi < 35 ? 40 : 20;
            components.push({ key: 'bmi', label: 'مؤشر كتلة الجسم', weight: 20, score, detail: { bmi: +bmi.toFixed(1) } });
            if (bmi >= 25)
                recommendations.push('مؤشر كتلة الجسم أعلى من الطبيعي — نشاط بدني منتظم وتغذية متوازنة يساعدان على خفضه');
        }
        else {
            recommendations.push('أكمل طولك ووزنك في الملف الصحي لتحسب درجتك بدقة أعلى');
        }
        const bp = latest['bp'];
        if (bp) {
            const [sys, dia] = String(bp.value).split('/').map((x) => parseFloat(x));
            const s = isNaN(sys) ? null : (sys <= 120 && (dia || 80) <= 80) ? 100 : (sys <= 130 && (dia || 85) <= 85) ? 80 : sys <= 140 ? 60 : 30;
            if (s !== null) {
                components.push({ key: 'bp', label: 'ضغط الدم', weight: 20, score: s, detail: { value: bp.value, measured_at: bp.measured_at } });
                if (s < 80)
                    recommendations.push('قراءة ضغط الدم الأخيرة مرتفعة — قلل الملح وراقب الضغط بانتظام واستشر طبيبك');
            }
        }
        const gl = latest['glucose'];
        if (gl) {
            const v = parseFloat(gl.value);
            if (!isNaN(v)) {
                const s = v >= 80 && v <= 140 ? 100 : v <= 180 ? 60 : 30;
                components.push({ key: 'glucose', label: 'سكر الدم', weight: 15, score: s, detail: { value: gl.value, measured_at: gl.measured_at } });
                if (s < 100)
                    recommendations.push('قراءة السكر خارج النطاق الطبيعي — راجع خطة وجباتك وأدويتك مع طبيبك');
            }
        }
        const hr = latest['heart_rate'];
        if (hr) {
            const v = parseFloat(hr.value);
            if (!isNaN(v)) {
                const s = v >= 60 && v <= 100 ? 100 : (v >= 50 && v <= 110) ? 60 : 30;
                components.push({ key: 'heart_rate', label: 'نبض القلب', weight: 10, score: s, detail: { value: hr.value, measured_at: hr.measured_at } });
            }
        }
        const sl = sleep;
        if (sl?.sleep_score != null) {
            components.push({ key: 'sleep', label: 'جودة النوم', weight: 15, score: Math.max(0, Math.min(100, sl.sleep_score)), detail: { duration_hours: sl.duration_hours, measured_at: sl.measured_at } });
            if (sl.sleep_score < 60)
                recommendations.push('جودة نومك تحتاج تحسيناً — ثبّت موعد النوم وقلل الشاشات قبله');
        }
        if (weekCount > 0) {
            const s = weekCount >= 5 ? 100 : weekCount >= 3 ? 70 : 40;
            components.push({ key: 'tracking', label: 'انتظام التسجيل', weight: 20, score: s, detail: { readings_last_7d: weekCount } });
            if (s < 100)
                recommendations.push('سجّل مؤشراتك الحيوية بانتظام (٥ قراءات أسبوعياً) لرفع دقة درجتك');
        }
        else {
            recommendations.push('ابدأ بتسجيل مؤشراتك الحيوية (ضغط، سكر، وزن) لتفعيل درجة الصحة');
        }
        if (components.length < 2) {
            return {
                score: null,
                status: 'insufficient_data',
                components,
                recommendations,
                message: 'لا توجد بيانات كافية لحساب درجة الصحة — أكمل ملفك وسجّل مؤشراتك',
            };
        }
        const totalWeight = components.reduce((s, c) => s + c.weight, 0);
        const weighted = components.reduce((s, c) => s + c.score * c.weight, 0);
        const score = Math.round(weighted / totalWeight);
        return {
            score,
            status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needs_attention',
            components,
            recommendations: recommendations.slice(0, 4),
        };
    }
    async deleteVital(user, id) {
        const r = await this.vitals.findOneAndUpdate({ id, patient_id: user.id, deleted_at: null }, { $set: { deleted_at: new Date() } }, { new: true });
        if (!r)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async updateVital(user, id, data) {
        const current = await this.vitals.findOne({ id, patient_id: user.id, deleted_at: null });
        if (!current)
            throw new common_1.NotFoundException();
        const currentData = typeof current.toObject === 'function' ? current.toObject() : current;
        const normalized = this.normalizeVitalInput({ ...currentData, ...(data || {}) });
        const r = await this.vitals.findOneAndUpdate({ id, patient_id: user.id, deleted_at: null }, { $set: normalized }, { new: true });
        return r.toObject();
    }
    validateReminderTimezone(value) {
        const timezone = String(value || '').trim();
        if (!timezone || timezone.length > 64)
            throw new common_1.BadRequestException('valid time_zone required');
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
        }
        catch {
            throw new common_1.BadRequestException('valid IANA time_zone required');
        }
        return timezone;
    }
    normalizeReminderTimes(value) {
        if (!Array.isArray(value) || value.length === 0 || value.length > 12)
            throw new common_1.BadRequestException('at least one time is required');
        const times = value.map((time) => String(time || '').trim());
        if (times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))
            throw new common_1.BadRequestException('times must use HH:mm');
        return [...new Set(times)].sort();
    }
    localDayKey(value, timezone) {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
        const part = (type) => parts.find((item) => item.type === type)?.value;
        return `${part('year')}-${part('month')}-${part('day')}`;
    }
    normalizeReminderInput(data, current) {
        const source = { ...(current || {}), ...(data || {}) };
        const medicine_name_ar = String(source.medicine_name_ar || '').trim();
        if (!medicine_name_ar || medicine_name_ar.length > 160)
            throw new common_1.BadRequestException('valid medicine_name_ar required');
        const timezone = this.validateReminderTimezone(source.time_zone);
        const times = this.normalizeReminderTimes(source.times);
        const frequency = String(source.frequency || 'daily');
        if (!['daily', 'weekly', 'as_needed'].includes(frequency))
            throw new common_1.BadRequestException('invalid frequency');
        const dosage_count = Number(source.dosage_count ?? 1);
        if (!Number.isFinite(dosage_count) || dosage_count <= 0 || dosage_count > 10000)
            throw new common_1.BadRequestException('valid dosage_count required');
        const duration_days = source.duration_days === undefined || source.duration_days === null || source.duration_days === '' ? 0 : Number(source.duration_days);
        if (!Number.isInteger(duration_days) || duration_days < 0 || duration_days > 3650)
            throw new common_1.BadRequestException('valid duration_days required');
        const start_date = source.start_date ? new Date(source.start_date) : (current?.start_date ? new Date(current.start_date) : new Date());
        if (Number.isNaN(start_date.getTime()))
            throw new common_1.BadRequestException('valid start_date required');
        const suppliedEnd = source.end_date ? new Date(source.end_date) : undefined;
        if (suppliedEnd && Number.isNaN(suppliedEnd.getTime()))
            throw new common_1.BadRequestException('valid end_date required');
        const end_date = duration_days > 0 ? new Date(start_date.getTime() + duration_days * 86400000) : suppliedEnd;
        if (end_date && end_date.getTime() < start_date.getTime())
            throw new common_1.BadRequestException('end_date must not precede start_date');
        const pills_remaining = source.pills_remaining === undefined || source.pills_remaining === null || source.pills_remaining === '' ? 0 : Number(source.pills_remaining);
        if (!Number.isInteger(pills_remaining) || pills_remaining < 0 || pills_remaining > 100000)
            throw new common_1.BadRequestException('valid pills_remaining required');
        return { medicine_name_ar, time_zone: timezone, times, frequency, dosage_count, duration_days, start_date, end_date, pills_remaining };
    }
    async createReminder(user, data) {
        const normalized = this.normalizeReminderInput(data);
        const dose = String(data?.dose || '').trim();
        if (!dose || dose.length > 120)
            throw new common_1.BadRequestException('valid dose required');
        const refill_date = data?.refill_date ? new Date(data.refill_date) : undefined;
        if (refill_date && Number.isNaN(refill_date.getTime()))
            throw new common_1.BadRequestException('valid refill_date required');
        const r = await this.reminders.create({
            patient_id: user.id,
            medicine_name_ar: normalized.medicine_name_ar,
            medicine_name_en: String(data?.medicine_name_en || '').trim() || undefined,
            medicine_id: data?.medicine_id,
            order_id: data?.order_id,
            prescription_id: data?.prescription_id,
            dose,
            dosage_count: normalized.dosage_count,
            dosage_form: ['tablet', 'capsule', 'ml', 'drop', 'spray'].includes(data?.dosage_form) ? data.dosage_form : 'tablet',
            times: normalized.times,
            time_zone: normalized.time_zone,
            frequency: normalized.frequency,
            start_date: normalized.start_date,
            end_date: normalized.end_date,
            duration_days: normalized.duration_days,
            instructions_ar: String(data?.instructions_ar || '').trim() || undefined,
            source: ['manual', 'dispense', 'doctor'].includes(data?.source) ? data.source : 'manual',
            active: true,
            chronic: Boolean(data?.chronic),
            pills_remaining: normalized.pills_remaining,
            refill_date,
        });
        return r.toObject();
    }
    async fromOrder(user, orderItems, orderId) {
        const out = [];
        for (const it of (orderItems || [])) {
            if (!it.name_ar)
                continue;
            const existing = await this.reminders.findOne({ patient_id: user.id, medicine_name_ar: it.name_ar, active: true });
            if (existing)
                continue;
            const r = await this.reminders.create({
                patient_id: user.id,
                medicine_name_ar: it.name_ar,
                medicine_name_en: it.name_en,
                medicine_id: it.medicine_id,
                order_id: orderId,
                dose: '1',
                dosage_count: 1,
                dosage_form: 'tablet',
                times: ['08:00', '20:00'],
                frequency: 'daily',
                duration_days: 7,
                end_date: new Date(Date.now() + 7 * 86400 * 1000),
                source: 'dispense',
                active: true,
            });
            out.push(r.toObject());
        }
        return out;
    }
    async listReminders(user, active = true) {
        const q = { patient_id: user.id };
        if (active)
            q.active = true;
        const rows = await this.reminders.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
        return rows.map((r) => {
            const obj = r.toObject ? r.toObject() : r;
            const time_zone = obj.time_zone || 'UTC';
            const today = this.localDayKey(new Date(), time_zone);
            const today_doses = (obj.times || []).map((time_key) => {
                const entries = (obj.log || []).filter((entry) => entry?.time_key === time_key && entry?.at && this.localDayKey(entry.at, time_zone) === today);
                const latest = entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
                return { time_key, status: latest?.status || 'pending', logged_at: latest?.at || null };
            });
            const taken = today_doses.length > 0 && today_doses.every((dose) => dose.status === 'taken');
            return { ...obj, time_zone, today_doses, taken, adherence: { scheduled: today_doses.length, taken: today_doses.filter((dose) => dose.status === 'taken').length } };
        });
    }
    async logReminder(user, id, status, time_key, occurred_at) {
        if (!['taken', 'skipped', 'missed'].includes(status))
            throw new common_1.BadRequestException('invalid dose status');
        const r = await this.reminders.findOne({ id, patient_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        const timeKey = String(time_key || '').trim();
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeKey) || !(r.times || []).includes(timeKey)) {
            throw new common_1.BadRequestException('time_key must match a configured reminder time');
        }
        const eventAt = occurred_at ? new Date(occurred_at) : new Date();
        if (Number.isNaN(eventAt.getTime()))
            throw new common_1.BadRequestException('valid occurred_at required');
        const now = Date.now();
        if (eventAt.getTime() > now + 5 * 60 * 1000 || eventAt.getTime() < now - 7 * 24 * 60 * 60 * 1000) {
            throw new common_1.BadRequestException('occurred_at must be within the last seven days');
        }
        const timezone = r.time_zone || 'UTC';
        const eventDay = this.localDayKey(eventAt, timezone);
        const startDay = this.localDayKey(r.start_date || new Date(), timezone);
        if (eventDay < startDay)
            throw new common_1.BadRequestException('occurred_at must not precede the reminder start date');
        if (r.end_date && eventDay > this.localDayKey(r.end_date, timezone))
            throw new common_1.BadRequestException('occurred_at must not follow the reminder end date');
        const duplicate = (r.log || []).some((entry) => entry?.time_key === timeKey && entry?.at && this.localDayKey(entry.at, timezone) === eventDay);
        if (duplicate)
            throw new common_1.ConflictException('dose already logged for this reminder time on this local day');
        r.log = [...(r.log || []), { at: eventAt, status, time_key: timeKey, source: occurred_at ? 'local_notification' : 'manual' }];
        await r.save();
        return r.toObject();
    }
    async toggleReminder(user, id, active) {
        const r = await this.reminders.findOneAndUpdate({ id, patient_id: user.id }, { $set: { active } }, { new: true });
        if (!r)
            throw new common_1.NotFoundException();
        return r.toObject();
    }
    async updateReminder(user, id, patch) {
        const current = await this.reminders.findOne({ id, patient_id: user.id });
        if (!current)
            throw new common_1.NotFoundException();
        const source = { ...(typeof current.toObject === 'function' ? current.toObject() : current), time_zone: current.time_zone || 'UTC', ...(patch || {}) };
        const normalized = this.normalizeReminderInput(source, current);
        const dose = String(source.dose || '').trim();
        if (!dose || dose.length > 120)
            throw new common_1.BadRequestException('valid dose required');
        const refill_date = source.refill_date ? new Date(source.refill_date) : undefined;
        if (refill_date && Number.isNaN(refill_date.getTime()))
            throw new common_1.BadRequestException('valid refill_date required');
        const $set = {
            medicine_name_ar: normalized.medicine_name_ar,
            medicine_name_en: String(source.medicine_name_en || '').trim() || undefined,
            dose,
            dosage_count: normalized.dosage_count,
            dosage_form: ['tablet', 'capsule', 'ml', 'drop', 'spray'].includes(source.dosage_form) ? source.dosage_form : 'tablet',
            times: normalized.times,
            time_zone: normalized.time_zone,
            frequency: normalized.frequency,
            start_date: normalized.start_date,
            end_date: normalized.end_date,
            duration_days: normalized.duration_days,
            instructions_ar: String(source.instructions_ar || '').trim() || undefined,
            active: source.active !== false,
            chronic: Boolean(source.chronic),
            pills_remaining: normalized.pills_remaining,
            refill_date,
        };
        const r = await this.reminders.findOneAndUpdate({ id, patient_id: user.id }, { $set }, { new: true });
        return r.toObject();
    }
    async deleteReminder(user, id) {
        const r = await this.reminders.findOneAndDelete({ id, patient_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    async prepareRefill(user, id) {
        const r = await this.reminders.findOne({ id, patient_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        return {
            reminder: r.toObject(),
            items: [
                {
                    medicine_id: r.medicine_id,
                    name_ar: r.medicine_name_ar,
                    name_en: r.medicine_name_en,
                    qty: 1,
                },
            ],
        };
    }
    async refillNow(_user, _id) {
        throw new common_1.ServiceUnavailableException('canonical_pharmacy_flow_required');
    }
    async snoozeRefill(user, id, days = 3) {
        const r = await this.reminders.findOne({ id, patient_id: user.id });
        if (!r)
            throw new common_1.NotFoundException();
        const base = r.refill_date ? new Date(r.refill_date) : new Date();
        r.refill_date = new Date(base.getTime() + Math.max(1, days) * 86400 * 1000);
        await r.save();
        return r.toObject();
    }
    async cancelChronic(user, id) {
        const r = await this.reminders.findOneAndUpdate({ id, patient_id: user.id }, { $set: { chronic: false } }, { new: true });
        if (!r)
            throw new common_1.NotFoundException();
        return r.toObject();
    }
    async listRemindersEnriched(user, active = true) {
        const list = await this.listReminders(user, active);
        const now = Date.now();
        return list.map((r) => {
            const obj = r.toObject ? r.toObject() : r;
            let days_until_refill = null;
            if (obj.refill_date) {
                days_until_refill = Math.ceil((new Date(obj.refill_date).getTime() - now) / 86400000);
            }
            const needs_refill_soon = obj.chronic && days_until_refill !== null && days_until_refill <= 3;
            return { ...obj, days_until_refill, needs_refill_soon };
        });
    }
    async addSleep(user, data) {
        if (data.sleep_score === undefined || data.duration_hours === undefined) {
            throw new common_1.BadRequestException('sleep_score and duration_hours are required');
        }
        const reading = await this.sleepModel.create({
            patient_id: user.id,
            sleep_score: data.sleep_score,
            duration_hours: data.duration_hours,
            measured_at: data.measured_at ? new Date(data.measured_at) : new Date(),
            source: data.source || 'device',
        });
        return reading.toObject();
    }
    async listSleep(user, limit = 100) {
        return this.sleepModel.find({ patient_id: user.id }, { _id: 0, __v: 0 })
            .sort({ measured_at: -1 })
            .limit(Math.min(limit, 500));
    }
    async listReports(user) {
        const rows = await this.conn.db.collection('medicalreports')
            .find({ patient_id: user.id }, { projection: { body: 0, 'attachments.base64': 0 } })
            .sort({ createdAt: -1 }).limit(50).toArray();
        return rows.map((r) => ({
            id: r.id,
            date: (r.issued_at || r.createdAt) ? new Date(r.issued_at || r.createdAt).toISOString().slice(0, 10) : null,
            title: r.title_ar || r.title_en || null,
            doctor: r.doctor_name || null,
            facility: r.facility_name || null,
            type: r.report_type || null,
            critical: !!r.critical,
            has_attachments: Array.isArray(r.attachments) && r.attachments.length > 0,
        }));
    }
    async listMedicationReminders(user) {
        const rows = await this.listReminders(user, true);
        return rows.map((o) => ({
            id: o.id,
            name: o.medicine_name_ar || o.medicine_name_en,
            dose: o.dose,
            time: Array.isArray(o.times) && o.times.length ? o.times[0] : null,
            times: o.times || [],
            time_zone: o.time_zone,
            frequency: o.frequency,
            chronic: !!o.chronic,
            instructions: o.instructions_ar || null,
            today_doses: o.today_doses,
            status: o.taken ? 'completed' : 'pending',
            taken: o.taken,
        }));
    }
    async listPrescriptions(user) {
        const rows = await this.conn.db.collection('prescriptions')
            .find({ patient_id: user.id }, { projection: { upload_image: 0 } })
            .sort({ createdAt: -1 }).limit(50).toArray();
        const doctorIds = [...new Set(rows.map((r) => r.doctor_id).filter(Boolean))];
        const doctors = doctorIds.length
            ? await this.conn.db.collection('users').find({ id: { $in: doctorIds } }, { projection: { id: 1, full_name: 1, name: 1 } }).toArray()
            : [];
        const nameOf = (id) => {
            const d = doctors.find((x) => x.id === id);
            return d ? (d.full_name || d.name || null) : null;
        };
        return rows.map((r) => ({
            id: r.id,
            date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : null,
            doctorName: r.doctor_id ? nameOf(r.doctor_id) : null,
            status: r.state || null,
            medications: (r.items || []).map((i) => i.medicine_name_ar || i.medicine_name_en).filter(Boolean),
            items: (r.items || []).map((i) => ({
                name: i.medicine_name_ar || i.medicine_name_en || null,
                dose: i.dose || null,
                frequency_hours: i.frequency_hours ?? null,
                duration_days: i.duration_days ?? null,
                instructions: i.instructions || null,
            })),
            isPurchased: !!r.order_id,
            isOcr: !!r.upload_image,
            diagnosis: r.diagnosis || null,
        }));
    }
    async listEmergencyContacts(user) {
        const p = await this.conn.db.collection('patient_profiles')
            .findOne({ user_id: user.id }, { projection: { emergency_contacts: 1 } });
        const list = Array.isArray(p?.emergency_contacts) ? p.emergency_contacts : [];
        return list.map((c, i) => ({
            id: c.id || `ec-${i}`,
            name: c.name,
            relation: c.relation || null,
            phone: c.phone,
            isPrimary: !!c.isPrimary,
        }));
    }
    async addEmergencyContact(user, data) {
        const name = String(data?.name || '').trim();
        const phone = String(data?.phone || '').trim();
        if (!name || name.length > 120)
            throw new common_1.BadRequestException('name required');
        if (!/^\+?[0-9\s-]{6,20}$/.test(phone))
            throw new common_1.BadRequestException('valid phone required');
        const doc = {
            id: (0, uuid_1.v4)(),
            name,
            relation: String(data?.relation || '').slice(0, 60) || null,
            phone,
            isPrimary: !!data?.isPrimary,
        };
        if (doc.isPrimary) {
            await this.conn.db.collection('patient_profiles').updateOne({ user_id: user.id }, { $set: { 'emergency_contacts.$[].isPrimary': false } });
        }
        await this.conn.db.collection('patient_profiles').updateOne({ user_id: user.id }, { $push: { emergency_contacts: doc } }, { upsert: true });
        return doc;
    }
    async removeEmergencyContact(user, id) {
        const col = this.conn.db.collection('patient_profiles');
        const p = await col.findOne({ user_id: user.id }, { projection: { emergency_contacts: 1 } });
        const list = Array.isArray(p?.emergency_contacts) ? p.emergency_contacts : [];
        const filtered = list.filter((c, i) => (c.id || `ec-${i}`) !== id);
        if (filtered.length === list.length)
            throw new common_1.NotFoundException('contact not found');
        await col.updateOne({ user_id: user.id }, { $set: { emergency_contacts: filtered } });
        return { ok: true };
    }
    async listChronicDiseases(user) {
        const p = await this.conn.db.collection('patient_profiles').findOne({ user_id: user.id }, { projection: { chronic_diseases: 1 } });
        const list = Array.isArray(p?.chronic_diseases) ? p.chronic_diseases : [];
        return list.map((name, i) => ({
            id: `cc-${i}`,
            name,
            controlled: null,
            source: 'patient_profile',
        }));
    }
    async listChronicMeds(user) {
        const rows = await this.listRemindersEnriched(user, true);
        return rows.filter((o) => o.chronic).map((o) => ({
            id: o.id,
            name: o.medicine_name_ar || o.medicine_name_en,
            dose: o.dose,
            frequency: o.frequency,
            times: o.times || [],
            time_zone: o.time_zone || 'UTC',
            pills_remaining: Number.isInteger(o.pills_remaining) ? o.pills_remaining : null,
            refill_date: o.refill_date || null,
            days_until_refill: o.days_until_refill,
            needs_refill_soon: o.needs_refill_soon,
            active: !!o.active,
        }));
    }
    async listTrends(user) {
        const defs = [
            { id: 'glucose', name: 'سكر الدم', unit: 'mg/dL', normal: [70, 140] },
            { id: 'heart_rate', name: 'نبض القلب', unit: 'bpm', normal: [60, 100] },
            { id: 'bp', name: 'ضغط الدم الانقباضي', unit: 'mmHg', normal: [90, 120] },
            { id: 'spo2', name: 'أكسجين الدم', unit: '%', normal: [95, 100] },
            { id: 'temperature', name: 'درجة الحرارة', unit: '°C', normal: [36.1, 37.2] },
            { id: 'weight', name: 'الوزن', unit: 'kg', normal: null },
        ];
        const out = [];
        for (const d of defs) {
            const rows = await this.vitals.find({ patient_id: user.id, type: d.id }, { _id: 0, value: 1, measured_at: 1 }).sort({ measured_at: 1 }).limit(30);
            const data = rows
                .map((r) => {
                const o = typeof r.toObject === 'function' ? r.toObject() : r;
                return { value: Number(String(o.value).split('/')[0]), at: o.measured_at };
            })
                .filter((x) => !isNaN(x.value));
            if (!data.length)
                continue;
            const current = data[data.length - 1].value;
            const first = data[0].value;
            const trendDir = data.length < 2 || current === first ? 'flat' : current > first ? 'up' : 'down';
            out.push({
                id: d.id,
                name: d.name,
                unit: d.unit,
                normal: d.normal,
                current,
                trendDir,
                labels: data.map((x) => new Date(x.at).toISOString().slice(5, 10)),
                data,
            });
        }
        return out;
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('VitalReadingRepository')),
    __param(1, (0, common_1.Inject)('MedicationReminderRepository')),
    __param(2, (0, common_1.Inject)('SleepReadingRepository')),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => orders_service_1.OrdersService))),
    __param(4, (0, mongoose_1.InjectConnection)()),
    __param(5, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [vitalreading_repository_1.VitalReadingRepository,
        medicationreminder_repository_1.MedicationReminderRepository,
        sleepreading_repository_1.SleepReadingRepository,
        orders_service_1.OrdersService,
        mongoose_2.Connection,
        event_emitter_1.EventEmitter2])
], HealthService);
//# sourceMappingURL=health.service.js.map