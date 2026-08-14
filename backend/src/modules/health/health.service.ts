import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { VitalReading, MedicationReminder, SleepReading } from '../../schemas/health.schema';
import { VitalReadingRepository } from "./repositories/vitalreading.repository";
import { MedicationReminderRepository } from "./repositories/medicationreminder.repository";
import { SleepReadingRepository } from "./repositories/sleepreading.repository";

const VALID_TYPES = ['bp', 'glucose', 'heart_rate', 'weight', 'temperature', 'spo2'];

@Injectable()
export class HealthService {
  constructor(
    @Inject('VitalReadingRepository') private readonly vitals: VitalReadingRepository,
    @Inject('MedicationReminderRepository') private readonly reminders: MedicationReminderRepository,
    @Inject('SleepReadingRepository') private readonly sleepModel: SleepReadingRepository,
  ) {}

  // VITALS
  async addVital(user: any, data: any) {
    if (!VALID_TYPES.includes(data.type)) throw new BadRequestException('invalid type');
    if (!data.value && data.value !== 0) throw new BadRequestException('value required');
    const reading = await this.vitals.create({
      patient_id: user.id,
      type: data.type,
      value: String(data.value),
      value_secondary: data.value_secondary,
      unit: data.unit || this.defaultUnit(data.type),
      measured_at: data.measured_at ? new Date(data.measured_at) : new Date(),
      context: data.context,
      notes: data.notes,
      source: data.source || 'manual',
    });
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
    const summary = [];

    const heartRate = latest['heart_rate'];
    if (heartRate) {
      summary.push({ icon: 'ecg_heart', label: 'نبض القلب', value: String(heartRate.value), unit: 'bpm', status: 'طبيعي', color: '#EC4899' });
    } else {
      summary.push({ icon: 'ecg_heart', label: 'نبض القلب', value: '--', unit: 'bpm', status: 'لا توجد قراءة', color: '#EC4899' });
    }

    const bloodSugar = latest['blood_sugar'];
    if (bloodSugar) {
      summary.push({ icon: 'water_drop', label: 'سكر الدم', value: String(bloodSugar.value), unit: 'mg/dl', status: 'طبيعي', color: '#F0A526' });
    } else {
      summary.push({ icon: 'water_drop', label: 'سكر الدم', value: '--', unit: 'mg/dl', status: 'لا توجد قراءة', color: '#F0A526' });
    }

    const bloodPressure = latest['blood_pressure'];
    if (bloodPressure) {
      summary.push({ icon: 'blood_pressure', label: 'ضغط الدم', value: String(bloodPressure.value), unit: 'mmHg', status: 'طبيعي', color: '#8B5CF6' });
    } else {
      summary.push({ icon: 'blood_pressure', label: 'ضغط الدم', value: '--', unit: 'mmHg', status: 'لا توجد قراءة', color: '#8B5CF6' });
    }

    const weight = latest['weight'];
    if (weight) {
      summary.push({ icon: 'monitor_weight', label: 'الوزن', value: String(weight.value), unit: 'kg', status: 'مثالي', color: '#10B981' });
    } else {
      summary.push({ icon: 'monitor_weight', label: 'الوزن', value: '--', unit: 'kg', status: 'لا توجد قراءة', color: '#10B981' });
    }

    return summary;
  }

  async deleteVital(user: any, id: string) {
    const r = await this.vitals.findOneAndDelete({ id, patient_id: user.id });
    if (!r) throw new NotFoundException();
    return { ok: true };
  }

  async updateVital(user: any, id: string, data: any) {
    const r = await this.vitals.findOneAndUpdate({ id, patient_id: user.id }, { $set: data }, { new: true });
    if (!r) throw new NotFoundException();
    return r.toObject();
  }

  // MEDICATION REMINDERS
  async createReminder(user: any, data: any) {
    if (!data.medicine_name_ar) throw new BadRequestException('medicine_name_ar required');
    if (!Array.isArray(data.times) || !data.times.length) throw new BadRequestException('times required');
    const duration_days = parseInt(data.duration_days, 10) || 0;
    const end_date = duration_days > 0 ? new Date(Date.now() + duration_days * 86400 * 1000) : (data.end_date ? new Date(data.end_date) : undefined);
    const r = await this.reminders.create({
      patient_id: user.id,
      medicine_name_ar: data.medicine_name_ar,
      medicine_name_en: data.medicine_name_en,
      medicine_id: data.medicine_id,
      order_id: data.order_id,
      prescription_id: data.prescription_id,
      dose: data.dose || '1',
      dosage_count: parseInt(data.dosage_count, 10) || 1,
      dosage_form: data.dosage_form || 'tablet',
      times: data.times,
      frequency: data.frequency || 'daily',
      start_date: data.start_date ? new Date(data.start_date) : new Date(),
      end_date,
      duration_days,
      instructions_ar: data.instructions_ar,
      source: data.source || 'manual',
      active: true,
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
    return this.reminders.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
  }

  async logReminder(user: any, id: string, status: 'taken' | 'skipped' | 'missed', time_key: string) {
    const r = await this.reminders.findOne({ id, patient_id: user.id });
    if (!r) throw new NotFoundException();
    r.log = [...(r.log || []), { at: new Date(), status, time_key }];
    await r.save();
    return r.toObject();
  }

  async toggleReminder(user: any, id: string, active: boolean) {
    const r = await this.reminders.findOneAndUpdate({ id, patient_id: user.id }, { $set: { active } }, { new: true });
    if (!r) throw new NotFoundException();
    return r.toObject();
  }

  /** Full reminder update — accepts any subset of editable fields. */
  async updateReminder(user: any, id: string, patch: any) {
    const allowed = ['medicine_name_ar', 'medicine_name_en', 'dose', 'dosage_count', 'dosage_form', 'times', 'frequency', 'start_date', 'end_date', 'duration_days', 'instructions_ar', 'active', 'chronic', 'pills_remaining', 'refill_date'];
    const $set: any = {};
    for (const k of allowed) if (patch[k] !== undefined) $set[k] = patch[k];
    if (Object.keys($set).length === 0) return { ok: false };
    const r = await this.reminders.findOneAndUpdate({ id, patient_id: user.id }, { $set }, { new: true });
    if (!r) throw new NotFoundException();
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
  async listReports(user: any) {
    return [
      { id: '1', date: '2026-06-15', title: 'تحليل دم شامل', doctor: 'د. أحمد', type: 'مختبر', doc_url: '#' },
      { id: '2', date: '2026-05-20', title: 'أشعة للصدر', doctor: 'د. سارة', type: 'أشعة', doc_url: '#' }
    ];
  }

  async listMedicationReminders(user: any) {
    return [
      { id: '1', name: 'بنادول', dose: 'حبتين', time: '08:00 AM', status: 'pending' },
      { id: '2', name: 'فيتامين د', dose: 'حبة واحدة', time: '02:00 PM', status: 'completed' }
    ];
  }

  async listPrescriptions(user: any) {
    return [
      { id: '1', date: '2026-06-15', doctor: 'د. خالد', status: 'active', items: ['أموكسيسيلين', 'بنادول'] }
    ];
  }

  async listEmergencyContacts(user: any) {
    return [
      { id: '1', name: 'أحمد صالح', relation: 'أخ', phone: '+966500000001' }
    ];
  }

  async listChronicDiseases(user: any) {
    return [
      { id: '1', name: 'السكري', diagnosed_date: '2020-01-01', status: 'مستقر' }
    ];
  }

  async listChronicMeds(user: any) {
    return [
      { id: '1', name: 'ميتفورمين', dose: '500mg', frequency: 'مرتين يومياً' }
    ];
  }

  async listTrends(user: any) {
    return {
      heart_rate: [72, 75, 78, 71, 74],
      blood_sugar: [90, 95, 100, 92, 88]
    };
  }
}
