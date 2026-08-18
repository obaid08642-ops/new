import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { VitalReading, MedicationReminder, SleepReading } from '../../schemas/health.schema';
import { VitalReadingRepository } from "./repositories/vitalreading.repository";
import { MedicationReminderRepository } from "./repositories/medicationreminder.repository";
import { SleepReadingRepository } from "./repositories/sleepreading.repository";
import { OrdersService } from '../orders/orders.service';

const VALID_TYPES = ['bp', 'glucose', 'heart_rate', 'weight', 'temperature', 'spo2'];

@Injectable()
export class HealthService {
  constructor(
    @Inject('VitalReadingRepository') private readonly vitals: VitalReadingRepository,
    @Inject('MedicationReminderRepository') private readonly reminders: MedicationReminderRepository,
    @Inject('SleepReadingRepository') private readonly sleepModel: SleepReadingRepository,
    @Inject(forwardRef(() => OrdersService)) private readonly orders: OrdersService,
    @InjectConnection() private readonly conn: Connection,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  // VITALS
  private normalizeVitalInput(data: any) {
    const raw = data || {};
    const aliases: Record<string, string> = { sugar: 'glucose', heart: 'heart_rate' };
    const type = aliases[String(raw.type || '').trim()] || String(raw.type || '').trim();
    if (!VALID_TYPES.includes(type)) throw new BadRequestException('invalid type');
    const measured_at = raw.measured_at || raw.recorded_at;
    if (measured_at && Number.isNaN(new Date(measured_at).getTime())) throw new BadRequestException('valid measured_at required');
    const context = raw.context || raw.time_of_day;
    if (type === 'bp') {
      const fromValue = String(raw.value || '').split('/');
      const systolic = Number(raw.systolic ?? fromValue[0]);
      const diastolic = Number(raw.diastolic ?? raw.value_secondary ?? fromValue[1]);
      if (!Number.isFinite(systolic) || !Number.isFinite(diastolic) || systolic < 60 || systolic > 260 || diastolic < 30 || diastolic > 160 || systolic <= diastolic) {
        throw new BadRequestException('physiologically valid blood pressure required');
      }
      return { type, value: `${systolic}/${diastolic}`, value_secondary: diastolic, unit: raw.unit || this.defaultUnit(type), measured_at: measured_at ? new Date(measured_at) : new Date(), context, notes: raw.notes, source: raw.source || 'manual' };
    }
    const value = Number(raw.value);
    const ranges: Record<string, [number, number]> = { glucose: [20, 1000], heart_rate: [20, 300], weight: [1, 1000], temperature: [25, 45], spo2: [50, 100] };
    const [min, max] = ranges[type];
    if (!Number.isFinite(value) || value < min || value > max) throw new BadRequestException('physiologically valid vital value required');
    return { type, value: String(value), value_secondary: raw.value_secondary, unit: raw.unit || this.defaultUnit(type), measured_at: measured_at ? new Date(measured_at) : new Date(), context, notes: raw.notes, source: raw.source || 'manual' };
  }

  async addVital(user: any, data: any) {
    const normalized = this.normalizeVitalInput(data);
    const reading = await this.vitals.create({ patient_id: user.id, ...normalized });
    // Engagement loop: loyalty listens for this to award vitals_logged points (capped 5/day)
    try { this.events?.emit('health.vitals_logged', { user_id: user.id }); } catch {}
    return reading.toObject();
  }

  defaultUnit(t: string): string {
    return ({ bp: 'mmHg', glucose: 'mg/dL', heart_rate: 'bpm', weight: 'kg', temperature: '°C', spo2: '%' } as any)[t] || '';
  }

  async listVitals(user: any, type?: string, limit = 100) {
    const q: any = { patient_id: user.id };
    if (type) q.type = type;
    return this.vitals.find(q, { _id: 0, __v: 0 }).sort({ measured_at: -1 }).limit(Math.min(limit, 500));
  }

  /** Chart series for one vital across fixed windows — real readings only, empty arrays when none. */
  async vitalsChart(user: any, type: string) {
    if (!type) throw new BadRequestException('vital query param required');
    const now = Date.now();
    const windows: Record<string, { spanMs: number; buckets: number }> = {
      day: { spanMs: 24 * 3600e3, buckets: 8 },
      week: { spanMs: 7 * 24 * 3600e3, buckets: 7 },
      month: { spanMs: 30 * 24 * 3600e3, buckets: 10 },
      year: { spanMs: 365 * 24 * 3600e3, buckets: 12 },
    };
    const readings = await this.vitals.find(
      { patient_id: user.id, type, measured_at: { $gte: new Date(now - windows.year.spanMs) } },
      { _id: 0, value: 1, measured_at: 1 },
    ).sort({ measured_at: 1 });
    const result: Record<string, number[]> = { day: [], week: [], month: [], year: [] };
    for (const [key, w] of Object.entries(windows)) {
      const start = now - w.spanMs;
      const inRange = readings.filter((r: any) => new Date(r.measured_at).getTime() >= start);
      // average per bucket, omit empty buckets (honest series — no fabricated zeros)
      const perBucket: number[] = [];
      for (let b = 0; b < w.buckets; b++) {
        const bStart = start + (b * w.spanMs) / w.buckets;
        const bEnd = start + ((b + 1) * w.spanMs) / w.buckets;
        const vals = inRange
          .filter((r: any) => { const t = new Date(r.measured_at).getTime(); return t >= bStart && t < bEnd; })
          .map((r: any) => parseFloat(r.value))
          .filter((v: number) => isFinite(v));
        if (vals.length) perBucket.push(Math.round((vals.reduce((a, c) => a + c, 0) / vals.length) * 10) / 10);
      }
      result[key] = perBucket;
    }
    return result;
  }

  /** Most recent readings of one vital type. */
  async vitalsRecent(user: any, type: string, limit = 20) {
    const q: any = { patient_id: user.id };
    if (type) q.type = type;
    return this.vitals.find(q, { _id: 0, __v: 0 }).sort({ measured_at: -1 }).limit(Math.min(limit, 100));
  }

  async latestVitals(user: any) {
    const out: any = {};
    for (const t of VALID_TYPES) {
      const r = await this.vitals.findOne({ patient_id: user.id, type: t }, { _id: 0, __v: 0 }).sort({ measured_at: -1 });
      if (r) out[t] = r;
    }
    return out;
  }

  async vitalsSummary(user: any) {
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
      const reading: any = latest[definition.key];
      if (!reading) return [];
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

  /**
   * GET /health/score — REAL computed health score (0-100).
   * Weighted average over the components that have actual data; a component
   * with no data is EXCLUDED (never guessed). If fewer than 2 components have
   * data the score is null with status insufficient_data — honest by design.
   */
  async healthScore(user: any) {
    const [latest, profile, sleep, weekCount] = await Promise.all([
      this.latestVitals(user),
      this.conn.model('MedicalProfile').findOne({ patient_id: user.id }).select('height_cm weight_kg -_id').lean().catch(() => null),
      this.sleepModel.findOne({ patient_id: user.id } as any, { _id: 0, __v: 0 } as any).sort({ measured_at: -1 }).catch(() => null),
      this.vitals.countDocuments({ patient_id: user.id, measured_at: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } as any).catch(() => 0),
    ]);

    const components: any[] = [];
    const recommendations: string[] = [];

    // 1) BMI from profile measurements (weight 20)
    const p: any = profile;
    if (p?.height_cm > 0 && p?.weight_kg > 0) {
      const bmi = p.weight_kg / Math.pow(p.height_cm / 100, 2);
      const score = bmi < 18.5 ? 55 : bmi < 25 ? 100 : bmi < 30 ? 70 : bmi < 35 ? 40 : 20;
      components.push({ key: 'bmi', label: 'مؤشر كتلة الجسم', weight: 20, score, detail: { bmi: +bmi.toFixed(1) } });
      if (bmi >= 25) recommendations.push('مؤشر كتلة الجسم أعلى من الطبيعي — نشاط بدني منتظم وتغذية متوازنة يساعدان على خفضه');
    } else {
      recommendations.push('أكمل طولك ووزنك في الملف الصحي لتحسب درجتك بدقة أعلى');
    }

    // 2) Blood pressure (weight 20)
    const bp = latest['bp'];
    if (bp) {
      const [sys, dia] = String(bp.value).split('/').map((x: string) => parseFloat(x));
      const s = isNaN(sys) ? null : (sys <= 120 && (dia || 80) <= 80) ? 100 : (sys <= 130 && (dia || 85) <= 85) ? 80 : sys <= 140 ? 60 : 30;
      if (s !== null) {
        components.push({ key: 'bp', label: 'ضغط الدم', weight: 20, score: s, detail: { value: bp.value, measured_at: bp.measured_at } });
        if (s < 80) recommendations.push('قراءة ضغط الدم الأخيرة مرتفعة — قلل الملح وراقب الضغط بانتظام واستشر طبيبك');
      }
    }

    // 3) Glucose (weight 15)
    const gl = latest['glucose'];
    if (gl) {
      const v = parseFloat(gl.value);
      if (!isNaN(v)) {
        const s = v >= 80 && v <= 140 ? 100 : v <= 180 ? 60 : 30;
        components.push({ key: 'glucose', label: 'سكر الدم', weight: 15, score: s, detail: { value: gl.value, measured_at: gl.measured_at } });
        if (s < 100) recommendations.push('قراءة السكر خارج النطاق الطبيعي — راجع خطة وجباتك وأدويتك مع طبيبك');
      }
    }

    // 4) Heart rate (weight 10)
    const hr = latest['heart_rate'];
    if (hr) {
      const v = parseFloat(hr.value);
      if (!isNaN(v)) {
        const s = v >= 60 && v <= 100 ? 100 : (v >= 50 && v <= 110) ? 60 : 30;
        components.push({ key: 'heart_rate', label: 'نبض القلب', weight: 10, score: s, detail: { value: hr.value, measured_at: hr.measured_at } });
      }
    }

    // 5) Sleep (weight 15) — latest device/manual sleep score
    const sl: any = sleep;
    if (sl?.sleep_score != null) {
      components.push({ key: 'sleep', label: 'جودة النوم', weight: 15, score: Math.max(0, Math.min(100, sl.sleep_score)), detail: { duration_hours: sl.duration_hours, measured_at: sl.measured_at } });
      if (sl.sleep_score < 60) recommendations.push('جودة نومك تحتاج تحسيناً — ثبّت موعد النوم وقلل الشاشات قبله');
    }

    // 6) Tracking consistency (weight 20) — readings logged in the last 7 days
    if ((weekCount as number) > 0) {
      const s = weekCount >= 5 ? 100 : weekCount >= 3 ? 70 : 40;
      components.push({ key: 'tracking', label: 'انتظام التسجيل', weight: 20, score: s, detail: { readings_last_7d: weekCount } });
      if (s < 100) recommendations.push('سجّل مؤشراتك الحيوية بانتظام (٥ قراءات أسبوعياً) لرفع دقة درجتك');
    } else {
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

  async deleteVital(user: any, id: string) {
    const r = await this.vitals.findOneAndDelete({ id, patient_id: user.id });
    if (!r) throw new NotFoundException();
    return { ok: true };
  }

  async updateVital(user: any, id: string, data: any) {
    const current: any = await this.vitals.findOne({ id, patient_id: user.id });
    if (!current) throw new NotFoundException();
    const currentData = typeof current.toObject === 'function' ? current.toObject() : current;
    const normalized = this.normalizeVitalInput({ ...currentData, ...(data || {}) });
    const r = await this.vitals.findOneAndUpdate({ id, patient_id: user.id }, { $set: normalized }, { new: true });
    return r.toObject();
  }

  // MEDICATION REMINDERS
  private validateReminderTimezone(value: any): string {
    const timezone = String(value || '').trim();
    if (!timezone || timezone.length > 64) throw new BadRequestException('valid time_zone required');
    try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date()); }
    catch { throw new BadRequestException('valid IANA time_zone required'); }
    return timezone;
  }

  private normalizeReminderTimes(value: any): string[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > 12) throw new BadRequestException('at least one time is required');
    const times = value.map((time) => String(time || '').trim());
    if (times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new BadRequestException('times must use HH:mm');
    return [...new Set(times)].sort();
  }

  private localDayKey(value: Date | string, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
    const part = (type: string) => parts.find((item) => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  private normalizeReminderInput(data: any, current?: any) {
    const source = { ...(current || {}), ...(data || {}) };
    const medicine_name_ar = String(source.medicine_name_ar || '').trim();
    if (!medicine_name_ar || medicine_name_ar.length > 160) throw new BadRequestException('valid medicine_name_ar required');
    const timezone = this.validateReminderTimezone(source.time_zone);
    const times = this.normalizeReminderTimes(source.times);
    const frequency = String(source.frequency || 'daily');
    if (!['daily', 'weekly', 'as_needed'].includes(frequency)) throw new BadRequestException('invalid frequency');
    const dosage_count = Number(source.dosage_count ?? 1);
    if (!Number.isFinite(dosage_count) || dosage_count <= 0 || dosage_count > 10000) throw new BadRequestException('valid dosage_count required');
    const duration_days = source.duration_days === undefined || source.duration_days === null || source.duration_days === '' ? 0 : Number(source.duration_days);
    if (!Number.isInteger(duration_days) || duration_days < 0 || duration_days > 3650) throw new BadRequestException('valid duration_days required');
    const start_date = source.start_date ? new Date(source.start_date) : (current?.start_date ? new Date(current.start_date) : new Date());
    if (Number.isNaN(start_date.getTime())) throw new BadRequestException('valid start_date required');
    const suppliedEnd = source.end_date ? new Date(source.end_date) : undefined;
    if (suppliedEnd && Number.isNaN(suppliedEnd.getTime())) throw new BadRequestException('valid end_date required');
    const end_date = duration_days > 0 ? new Date(start_date.getTime() + duration_days * 86400000) : suppliedEnd;
    if (end_date && end_date.getTime() < start_date.getTime()) throw new BadRequestException('end_date must not precede start_date');
    const pills_remaining = source.pills_remaining === undefined || source.pills_remaining === null || source.pills_remaining === '' ? 0 : Number(source.pills_remaining);
    if (!Number.isInteger(pills_remaining) || pills_remaining < 0 || pills_remaining > 100000) throw new BadRequestException('valid pills_remaining required');
    return { medicine_name_ar, time_zone: timezone, times, frequency, dosage_count, duration_days, start_date, end_date, pills_remaining };
  }

  async createReminder(user: any, data: any) {
    const normalized = this.normalizeReminderInput(data);
    const dose = String(data?.dose || '').trim();
    if (!dose || dose.length > 120) throw new BadRequestException('valid dose required');
    const refill_date = data?.refill_date ? new Date(data.refill_date) : undefined;
    if (refill_date && Number.isNaN(refill_date.getTime())) throw new BadRequestException('valid refill_date required');
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

  /** Auto-create reminders from a dispensed order (called when order moves to DISPENSED/DELIVERED) */
  async fromOrder(user: any, orderItems: any[], orderId: string) {
    const out: any[] = [];
    for (const it of (orderItems || [])) {
      if (!it.name_ar) continue;
      const existing = await this.reminders.findOne({ patient_id: user.id, medicine_name_ar: it.name_ar, active: true });
      if (existing) continue;
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

  async listReminders(user: any, active = true) {
    const q: any = { patient_id: user.id };
    if (active) q.active = true;
    const rows = await this.reminders.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
    return rows.map((r: any) => {
      const obj = r.toObject ? r.toObject() : r;
      const time_zone = obj.time_zone || 'UTC';
      const today = this.localDayKey(new Date(), time_zone);
      const today_doses = (obj.times || []).map((time_key: string) => {
        const entries = (obj.log || []).filter((entry: any) => entry?.time_key === time_key && entry?.at && this.localDayKey(entry.at, time_zone) === today);
        const latest = entries.sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
        return { time_key, status: latest?.status || 'pending', logged_at: latest?.at || null };
      });
      const taken = today_doses.length > 0 && today_doses.every((dose: any) => dose.status === 'taken');
      return { ...obj, time_zone, today_doses, taken, adherence: { scheduled: today_doses.length, taken: today_doses.filter((dose: any) => dose.status === 'taken').length } };
    });
  }

  /**
   * Records the event time supplied by a local on-device reminder when it is safe to do so.
   * This permits an offline action to be synchronised later without silently moving it to today.
   */
  async logReminder(user: any, id: string, status: 'taken' | 'skipped' | 'missed', time_key: string, occurred_at?: string) {
    if (!['taken', 'skipped', 'missed'].includes(status)) throw new BadRequestException('invalid dose status');
    const r = await this.reminders.findOne({ id, patient_id: user.id });
    if (!r) throw new NotFoundException();
    const timeKey = String(time_key || '').trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeKey) || !(r.times || []).includes(timeKey)) {
      throw new BadRequestException('time_key must match a configured reminder time');
    }
    const eventAt = occurred_at ? new Date(occurred_at) : new Date();
    if (Number.isNaN(eventAt.getTime())) throw new BadRequestException('valid occurred_at required');
    const now = Date.now();
    if (eventAt.getTime() > now + 5 * 60 * 1000 || eventAt.getTime() < now - 7 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('occurred_at must be within the last seven days');
    }
    const timezone = r.time_zone || 'UTC';
    const eventDay = this.localDayKey(eventAt, timezone);
    const startDay = this.localDayKey(r.start_date || new Date(), timezone);
    if (eventDay < startDay) throw new BadRequestException('occurred_at must not precede the reminder start date');
    if (r.end_date && eventDay > this.localDayKey(r.end_date, timezone)) throw new BadRequestException('occurred_at must not follow the reminder end date');
    const duplicate = (r.log || []).some((entry: any) => entry?.time_key === timeKey && entry?.at && this.localDayKey(entry.at, timezone) === eventDay);
    if (duplicate) throw new ConflictException('dose already logged for this reminder time on this local day');
    r.log = [...(r.log || []), { at: eventAt, status, time_key: timeKey, source: occurred_at ? 'local_notification' : 'manual' }];
    await r.save();
    return r.toObject();
  }

  async toggleReminder(user: any, id: string, active: boolean) {
    const r = await this.reminders.findOneAndUpdate({ id, patient_id: user.id }, { $set: { active } }, { new: true });
    if (!r) throw new NotFoundException();
    return r.toObject();
  }

  /** Full reminder update — normalizes editable schedule fields before persisting them. */
  async updateReminder(user: any, id: string, patch: any) {
    const current: any = await this.reminders.findOne({ id, patient_id: user.id });
    if (!current) throw new NotFoundException();
    const source = { ...(typeof current.toObject === 'function' ? current.toObject() : current), time_zone: current.time_zone || 'UTC', ...(patch || {}) };
    const normalized = this.normalizeReminderInput(source, current);
    const dose = String(source.dose || '').trim();
    if (!dose || dose.length > 120) throw new BadRequestException('valid dose required');
    const refill_date = source.refill_date ? new Date(source.refill_date) : undefined;
    if (refill_date && Number.isNaN(refill_date.getTime())) throw new BadRequestException('valid refill_date required');
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

  async deleteReminder(user: any, id: string) {
    const r = await this.reminders.findOneAndDelete({ id, patient_id: user.id });
    if (!r) throw new NotFoundException();
    return { ok: true };
  }

  /**
   * Mark a "chronic" reminder for immediate refill broadcast.
   * Returns the items payload caller can pass to OrdersService.create() to
   * dispatch a real pharmacy order. We do not couple ordering here to keep
   * health module pure — the controller orchestrates with OrdersService.
   */
  async prepareRefill(user: any, id: string) {
    const r = await this.reminders.findOne({ id, patient_id: user.id });
    if (!r) throw new NotFoundException();
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

  /**
   * Complete refill flow: validate ownership → resolve default address →
   * create a REAL pharmacy order (source='refill') → advance the reminder's
   * next refill date. Replaces the previous UI-only simulation.
   */
  async refillNow(user: any, id: string) {
    const prep = await this.prepareRefill(user, id);
    // Resolve the patient's default delivery address from their profile
    const u: any = await (this.reminders as any).db.model('User').findOne({ id: user.id }).lean();
    const addrs: any[] = u?.addresses || [];
    const addr = addrs.find((a: any) => a.is_default) || addrs[0];
    if (!addr?.lat || !addr?.lng) {
      throw new BadRequestException('no_default_address: add a delivery address before reordering');
    }
    const order = await this.orders.create(user, {
      items: prep.items,
      delivery_address: { lat: addr.lat, lng: addr.lng, label: addr.label || addr.address || '', details: addr.details || '' },
      notes: `refill:${id}`,
    });
    // Tag the order as a refill so pharmacies see it in their refill inbox
    if (order?.id) {
      await (this.reminders as any).db.collection('orders').updateOne(
        { id: order.id },
        { $set: { source: 'refill', refill_reminder_id: id } },
      );
    }
    // Advance the reminder: pills restocked → next refill in ~30 days
    await this.reminders.findOneAndUpdate(
      { id, patient_id: user.id },
      { $set: { pills_remaining: 30, refill_date: new Date(Date.now() + 30 * 86400 * 1000) } },
    );
    return { ok: true, order_id: order?.id, state: order?.state };
  }

  /** Snooze refill date for a chronic reminder by N days (default 3) */
  async snoozeRefill(user: any, id: string, days = 3) {
    const r = await this.reminders.findOne({ id, patient_id: user.id });
    if (!r) throw new NotFoundException();
    const base = r.refill_date ? new Date(r.refill_date) : new Date();
    r.refill_date = new Date(base.getTime() + Math.max(1, days) * 86400 * 1000);
    await r.save();
    return r.toObject();
  }

  /** Cancel chronic refill auto-broadcast (turn off chronic flag) */
  async cancelChronic(user: any, id: string) {
    const r = await this.reminders.findOneAndUpdate(
      { id, patient_id: user.id },
      { $set: { chronic: false } },
      { new: true },
    );
    if (!r) throw new NotFoundException();
    return r.toObject();
  }

  /** Enrich list of reminders with refill insights (days_until_refill, needs_refill_soon) */
  async listRemindersEnriched(user: any, active = true) {
    const list: any[] = await this.listReminders(user, active);
    const now = Date.now();
    return list.map((r: any) => {
      const obj = r.toObject ? r.toObject() : r;
      let days_until_refill: number | null = null;
      if (obj.refill_date) {
        days_until_refill = Math.ceil((new Date(obj.refill_date).getTime() - now) / 86400000);
      }
      const needs_refill_soon = obj.chronic && days_until_refill !== null && days_until_refill <= 3;
      return { ...obj, days_until_refill, needs_refill_soon };
    });
  }

  // SLEEP METRICS
  async addSleep(user: any, data: any) {
    if (data.sleep_score === undefined || data.duration_hours === undefined) {
      throw new BadRequestException('sleep_score and duration_hours are required');
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

  async listSleep(user: any, limit = 100) {
    return this.sleepModel.find({ patient_id: user.id }, { _id: 0, __v: 0 })
      .sort({ measured_at: -1 })
      .limit(Math.min(limit, 500));
  }

  // --- WP 1.5 Additional Health/Medical Profile Service Methods ---
  // All methods below read exclusively from real persisted data.

  /** Medical reports issued by doctors/facilities for this patient. */
  async listReports(user: any) {
    const rows = await this.conn.db.collection('medicalreports')
      .find({ patient_id: user.id }, { projection: { body: 0, 'attachments.base64': 0 } })
      .sort({ createdAt: -1 }).limit(50).toArray();
    return rows.map((r: any) => ({
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

  /** Compatibility view for legacy consumers; primary reminder UI uses listReminders. */
  async listMedicationReminders(user: any) {
    const rows: any[] = await this.listReminders(user, true);
    return rows.map((o: any) => ({
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

  /** Prescriptions from the prescriptions collection, doctor name resolved from users. */
  async listPrescriptions(user: any) {
    const rows = await this.conn.db.collection('prescriptions')
      .find({ patient_id: user.id }, { projection: { upload_image: 0 } })
      .sort({ createdAt: -1 }).limit(50).toArray();
    const doctorIds = [...new Set(rows.map((r: any) => r.doctor_id).filter(Boolean))];
    const doctors = doctorIds.length
      ? await this.conn.db.collection('users').find({ id: { $in: doctorIds } }, { projection: { id: 1, full_name: 1, name: 1 } }).toArray()
      : [];
    const nameOf = (id: string) => {
      const d: any = doctors.find((x: any) => x.id === id);
      return d ? (d.full_name || d.name || null) : null;
    };
    return rows.map((r: any) => ({
      id: r.id,
      date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : null,
      doctorName: r.doctor_id ? nameOf(r.doctor_id) : null,
      status: r.state || null,
      medications: (r.items || []).map((i: any) => i.medicine_name_ar || i.medicine_name_en).filter(Boolean),
      items: (r.items || []).map((i: any) => ({
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

  /** Patient-managed emergency contacts — embedded in the patient profile, empty when none added. */
  async listEmergencyContacts(user: any) {
    const p: any = await this.conn.db.collection('patient_profiles')
      .findOne({ user_id: user.id }, { projection: { emergency_contacts: 1 } });
    const list: any[] = Array.isArray(p?.emergency_contacts) ? p.emergency_contacts : [];
    return list.map((c: any, i: number) => ({
      id: c.id || `ec-${i}`,
      name: c.name,
      relation: c.relation || null,
      phone: c.phone,
      isPrimary: !!c.isPrimary,
    }));
  }

  async addEmergencyContact(user: any, data: any) {
    const name = String(data?.name || '').trim();
    const phone = String(data?.phone || '').trim();
    if (!name || name.length > 120) throw new BadRequestException('name required');
    if (!/^\+?[0-9\s-]{6,20}$/.test(phone)) throw new BadRequestException('valid phone required');
    const doc: any = {
      id: uuid(),
      name,
      relation: String(data?.relation || '').slice(0, 60) || null,
      phone,
      isPrimary: !!data?.isPrimary,
    };
    if (doc.isPrimary) {
      await this.conn.db.collection('patient_profiles').updateOne(
        { user_id: user.id }, { $set: { 'emergency_contacts.$[].isPrimary': false } });
    }
    await this.conn.db.collection('patient_profiles').updateOne(
      { user_id: user.id }, { $push: { emergency_contacts: doc } } as any, { upsert: true });
    return doc;
  }

  async removeEmergencyContact(user: any, id: string) {
    const col = this.conn.db.collection('patient_profiles');
    const p: any = await col.findOne({ user_id: user.id }, { projection: { emergency_contacts: 1 } });
    const list: any[] = Array.isArray(p?.emergency_contacts) ? p.emergency_contacts : [];
    const filtered = list.filter((c: any, i: number) => (c.id || `ec-${i}`) !== id);
    if (filtered.length === list.length) throw new NotFoundException('contact not found');
    await col.updateOne({ user_id: user.id }, { $set: { emergency_contacts: filtered } });
    return { ok: true };
  }

  /** Chronic conditions as recorded in the patient's own profile (self-declared). */
  async listChronicDiseases(user: any) {
    const p: any = await this.conn.db.collection('patient_profiles').findOne({ user_id: user.id }, { projection: { chronic_diseases: 1 } });
    const list: string[] = Array.isArray(p?.chronic_diseases) ? p.chronic_diseases : [];
    return list.map((name, i) => ({
      id: `cc-${i}`,
      name,
      controlled: null, // no clinical assessment data — the app renders this neutrally
      source: 'patient_profile',
    }));
  }

  /** Chronic reminders with refill status from the patient's own reminder records. */
  async listChronicMeds(user: any) {
    const rows: any[] = await this.listRemindersEnriched(user, true);
    return rows.filter((o: any) => o.chronic).map((o: any) => ({
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

  /** Vital trends computed from the patient's real readings only. */
  async listTrends(user: any) {
    const defs: any[] = [
      { id: 'glucose', name: 'سكر الدم', unit: 'mg/dL', normal: [70, 140] },
      { id: 'heart_rate', name: 'نبض القلب', unit: 'bpm', normal: [60, 100] },
      { id: 'bp', name: 'ضغط الدم الانقباضي', unit: 'mmHg', normal: [90, 120] },
      { id: 'spo2', name: 'أكسجين الدم', unit: '%', normal: [95, 100] },
      { id: 'temperature', name: 'درجة الحرارة', unit: '°C', normal: [36.1, 37.2] },
      { id: 'weight', name: 'الوزن', unit: 'kg', normal: null },
    ];
    const out: any[] = [];
    for (const d of defs) {
      const rows: any[] = await this.vitals.find({ patient_id: user.id, type: d.id }, { _id: 0, value: 1, measured_at: 1 }).sort({ measured_at: 1 }).limit(30);
      const data = rows
        .map((r: any) => {
          const o = typeof r.toObject === 'function' ? r.toObject() : r;
          return { value: Number(String(o.value).split('/')[0]), at: o.measured_at };
        })
        .filter((x: any) => !isNaN(x.value));
      if (!data.length) continue;
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
        labels: data.map((x: any) => new Date(x.at).toISOString().slice(5, 10)),
        data,
      });
    }
    return out;
  }
}
