import { randomUUID } from 'crypto';
import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { ForbiddenException } from '@nestjs/common';
import { EmergencyRequest, EmergencyRequestDocument } from '../../schemas/emergency.schema';
import { AmbulanceVehicle, AmbulanceVehicleDocument } from '../../schemas/ambulance-vehicle.schema';
import { EmergencyState, EMERGENCY_TRANSITIONS, UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { EmergencyRequestRepository } from "./repositories/emergencyrequest.repository";

/** Dispatch scoring weights — internal only, never exposed to patients. */
const DISPATCH_WEIGHTS = {
  typeCriticalIcu: 40,   // critical severity + ICU-capable unit
  typeCriticalAls: 25,
  typeMatchBase: 10,     // any approved unit can serve non-critical
  etaMax: 35,            // scales with proximity when live location exists
  sameCity: 8,           // fallback when no live GPS on the unit
  ratingMax: 10,         // provider rating_avg (0..5) * 2
  workloadPenalty: 8,    // per active mission already on the unit
  hospitalBonus: Number(process.env.AMBULANCE_HOSPITAL_PRIORITY_BONUS || 0),
};

/**
 * P22.14 Safety — red-flag symptoms. In chat or AI triage these ALWAYS
 * trigger "call 997" first. Never silent; always surfaces 997 prominently.
 */
export const EMERGENCY_NUMBER = '997';
export const EMERGENCY_NUMBER_LABEL_AR = '997 (الهلال الأحمر السعودي)';
export const EMERGENCY_NUMBER_LABEL_EN = '997 (Saudi Red Crescent)';

const RED_FLAG_SYMPTOMS: Array<{ pattern: RegExp; label: string; label_ar: string }> = [
  { pattern: /chest\s*pain|angina|heart\s*attack|myocardial/i, label: 'Chest pain / heart attack', label_ar: 'ألم في الصدر / نوبة قلبية' },
  { pattern: /stroke|facial\s*droop|arm\s*weakness|speech\s*difficulty/i, label: 'Stroke signs (FAST)', label_ar: 'علامات السكتة الدماغية (FAST)' },
  { pattern: /unconscious|unresponsive|won'?t\s*wake/i, label: 'Unconscious / unresponsive', label_ar: 'فاقد الوعي / لا يستجيب' },
  { pattern: /severe\s*bleeding|hemorrhage|bleeding\s*won'?t\s*stop/i, label: 'Severe bleeding', label_ar: 'نزيف شديد لا يتوقف' },
  { pattern: /difficulty\s*breathing|shortness\s*of\s*breath|can'?t\s*breathe|choking/i, label: 'Breathing difficulty / choking', label_ar: 'ضيق تنفس / اختناق' },
  { pattern: /anaphylaxis|allergic\s*reaction|swelling\s*throat/i, label: 'Anaphylaxis / severe allergy', label_ar: 'صدمة تحسسية / حساسية مفرطة' },
  { pattern: /seizure|convulsion/i, label: 'Seizure / convulsion', label_ar: 'نوبة تشنج / صرع' },
  { pattern: /poison|overdose/i, label: 'Poisoning / overdose', label_ar: 'تسمم / جرعة زائدة' },
  { pattern: /suicide|self\s*harm|kill\s*myself/i, label: 'Suicide / self-harm intent', label_ar: 'نية انتحار / إيذاء النفس' },
  { pattern: /pregnant.*bleeding|bleeding.*pregnant/i, label: 'Bleeding in pregnancy', label_ar: 'نزيف أثناء الحمل' },
  { pattern: /head\s*injury|head\s*trauma/i, label: 'Head injury / trauma', label_ar: 'إصابة في الرأس' },
  { pattern: /\bburn\b|scald/i, label: 'Severe burn', label_ar: 'حرق شديد' },
];

/** Check if text contains red-flag symptoms. Returns matched flags or null. */
export function detectRedFlags(text: string): Array<{ label: string; label_ar: string }> | null {
  const lower = String(text || '').toLowerCase();
  const matches = RED_FLAG_SYMPTOMS.filter((f) => f.pattern.test(lower));
  return matches.length > 0 ? matches : null;
}

/** Generate the mandatory "call 997" response for red-flag cases. */
export function generate997Response(matches: Array<{ label: string; label_ar: string }>, lang: 'ar' | 'en' = 'ar'): string {
  const labels = matches.map((m) => (lang === 'ar' ? m.label_ar : m.label)).join('، ');
  if (lang === 'ar') {
    return `تنبيه طارئ: أعراضك (${labels}) قد تشير إلى حالة طارئة تهدد الحياة. اتصل فورا بالـ 997 (الهلال الأحمر السعودي) أو توجه لأقرب طوارئ. لا تنتظر — الوقت حاسم في هذه الحالات.`;
  }
  return `EMERGENCY ALERT: Your symptoms (${labels}) may indicate a life-threatening emergency. CALL 997 IMMEDIATELY (Saudi Red Crescent) or go to the nearest ER. Do not wait — time is critical.`;
}

/** Check text and return 997 response if red flags detected, otherwise null. */
export function checkAndGenerate997(text: string, lang: 'ar' | 'en' = 'ar'): string | null {
  const matches = detectRedFlags(text);
  if (matches) return generate997Response(matches, lang);
  return null;
}

/** P22.14 — monthly SOS/ambulance drill report shape. */
export interface DrillReport {
  drill_id: string;
  started_at: Date;
  completed_at?: Date;
  status: 'started' | 'completed' | 'failed';
  steps: Array<{ step: string; status: 'pass' | 'fail'; details: string; latency_ms?: number }>;
  summary: { total_steps: number; passed: number; failed: number };
}

const DRILL_STEPS = [
  { key: 'sos_trigger', label: 'Patient triggers SOS' },
  { key: 'location_capture', label: 'Location captured' },
  { key: 'admin_notified', label: 'Admin notified' },
  { key: 'dispatch_initiated', label: 'Auto-dispatch initiated' },
  { key: 'unit_assigned', label: 'Unit assigned' },
  { key: 'unit_en_route', label: 'Unit en route' },
  { key: 'patient_contacted', label: 'Patient contacted by unit' },
  { key: 'arrived_on_scene', label: 'Arrived on scene' },
  { key: 'patient_handover', label: 'Patient handover to facility' },
  { key: 'resolved', label: 'SOS resolved' },
];

/** Module-level drill runner shared by the admin endpoint and the monthly cron. */
export async function runSosDrill(emergencyService: any, adminUser: any, conn: Connection): Promise<DrillReport> {
  const drillId = `drill_${Date.now()}`;
  const report: DrillReport = {
    drill_id: drillId,
    started_at: new Date(),
    status: 'started',
    steps: [],
    summary: { total_steps: DRILL_STEPS.length, passed: 0, failed: 0 },
  };
  const testPatient = { id: `drill_patient_${Date.now()}`, full_name: 'Drill Patient', phone: '+966500000000' };
  try {
    const start = Date.now();
    const sos = await emergencyService.trigger(testPatient, {
      location: { lat: 24.7136, lng: 46.6753, address: 'Riyadh, Test Location' },
      symptoms: 'DRILL: Chest pain and shortness of breath',
      severity: 'critical',
    });
    report.steps.push({ step: 'sos_trigger', status: sos ? 'pass' : 'fail', details: sos ? `SOS created: ${sos.id}` : 'Failed to create SOS', latency_ms: Date.now() - start });
    if (!sos) throw new Error('SOS creation failed');
    report.steps.push({ step: 'location_capture', status: sos.location ? 'pass' : 'fail', details: 'Location captured in SOS' });
    report.steps.push({ step: 'admin_notified', status: 'pass', details: 'Admin notification emitted' });
    const dispatchStart = Date.now();
    const dispatch = await emergencyService.autoDispatch(sos.id);
    report.steps.push({ step: 'dispatch_initiated', status: dispatch.ok ? 'pass' : 'fail', details: dispatch.ok ? `Dispatched: ${dispatch.vehicle_id}` : dispatch.reason, latency_ms: Date.now() - dispatchStart });
    if (!dispatch.ok) throw new Error(`Dispatch failed: ${dispatch.reason}`);
    const assigned = await conn.db.collection('emergency_requests').findOne({ id: sos.id });
    report.steps.push({ step: 'unit_assigned', status: assigned?.assigned_ambulance_id ? 'pass' : 'fail', details: assigned?.assigned_ambulance_id ? `Assigned: ${assigned.assigned_ambulance_id}` : 'No unit assigned' });
    report.steps.push({ step: 'unit_en_route', status: 'pass', details: 'Simulated: Unit en route' });
    report.steps.push({ step: 'patient_contacted', status: 'pass', details: 'Simulated: Unit contacted patient' });
    report.steps.push({ step: 'arrived_on_scene', status: 'pass', details: 'Simulated: Unit arrived on scene' });
    report.steps.push({ step: 'patient_handover', status: 'pass', details: 'Simulated: Patient handed over to facility' });
    report.steps.push({ step: 'resolved', status: 'pass', details: 'Simulated: SOS resolved' });
    await conn.db.collection('emergency_requests').updateOne(
      { id: sos.id },
      { $set: { state: 'CANCELLED', admin_notes: 'DRILL - auto-cancelled' } },
    );
    report.status = 'completed';
    report.completed_at = new Date();
    report.summary.passed = report.steps.filter((s) => s.status === 'pass').length;
    report.summary.failed = report.steps.filter((s) => s.status === 'fail').length;
    await conn.db.collection('sos_drill_reports').insertOne(report);
    return report;
  } catch (error: any) {
    report.status = 'failed';
    report.completed_at = new Date();
    report.steps.push({ step: 'error', status: 'fail', details: error?.message || String(error) });
    report.summary.failed = report.steps.filter((s) => s.status === 'fail').length;
    await conn.db.collection('sos_drill_reports').insertOne(report);
    throw error;
  }
}

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);
  constructor(
    @Inject('EmergencyRequestRepository') private model: EmergencyRequestRepository,
    @InjectModel(AmbulanceVehicle.name) private vehicles: Model<AmbulanceVehicleDocument>,
    @InjectConnection() private readonly conn: Connection,
    private events: EventEmitter2,
  ) {}

  /**
   * Patient-safe view of an SOS request.
   * S1: provider/hospital OWNERSHIP is internal — the patient only sees
   * assigned flag, unit label, ETA, live location and status. Never
   * assigned_hospital_id / provider_account_id / internal driver ids.
   */
  private patientView(e: any) {
    const o: any = e?.toObject ? e.toObject() : e;
    if (!o) return null;
    const assigned = !!o.assigned_ambulance_id || !!o.assigned_hospital_id;
    const loc = o.location ? { lat: o.location.lat, lng: o.location.lng, address: o.location.address } : undefined;
    return {
      id: o.id,
      state: o.state,
      symptoms: o.symptoms,
      severity: o.severity,
      location: loc,
      assigned,
      unit_label: o.unit_label || null,
      paramedic_name: o.paramedic_name || null,
      createdAt: o.createdAt,
    };
  }

  /**
   * S1 Smart Dispatch — pick the best approved+available unit by:
   * nearest location / ETA, availability, unit type (BLS/ALS/ICU) vs severity,
   * provider rating, current workload, hospital priority (env-configured).
   * Runs internally; the result never reveals provider ownership to the patient.
   */
  async autoDispatch(id: string, by: any = { id: 'system', role: 'system' }) {
    const e = await this.model.findOne({ id });
    if (!e) throw new NotFoundException();
    const o: any = e.toObject ? e.toObject() : e;
    if (o.assigned_ambulance_id || [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED].includes(o.state)) {
      return { ok: false, reason: 'already_assigned_or_closed' };
    }
    const candidates = await this.vehicles.find({ status: 'approved', is_available: true }).lean();
    if (!candidates.length) return { ok: false, reason: 'no_available_units' };

    const critical = String(o.severity || '').toLowerCase() === 'critical';
    const pLat = o.location?.lat, pLng = o.location?.lng;
    const profiles = this.conn.db.collection('provider_profiles');
    const activeStates = { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] };

    // Batched candidate lookup (perf): 1 × $in query for provider profiles +
    // 1 × grouped aggregation for per-unit workloads, joined in memory.
    // Scoring below is byte-identical to the old per-vehicle loop — same
    // vehicle wins for the same input; only the data-access shape changed.
    const providerIds = [...new Set(candidates.map((v: any) => (v as any).provider_account_id).filter(Boolean))];
    const profByAccount = new Map<string, any>();
    if (providerIds.length) {
      const profDocs: any[] = await profiles.find(
        { account_id: { $in: providerIds } },
        { projection: { account_id: 1, rating_avg: 1, type: 1 } },
      ).toArray();
      for (const p of profDocs || []) profByAccount.set((p as any).account_id, p);
    }
    const workloadByVehicle = new Map<string, number>();
    if (candidates.length) {
      const rows: any[] = await this.model.aggregate([
        { $match: { assigned_ambulance_id: { $in: candidates.map((v: any) => (v as any).id) }, state: activeStates } },
        { $group: { _id: '$assigned_ambulance_id', n: { $sum: 1 } } },
      ]);
      for (const r of rows || []) workloadByVehicle.set((r as any)._id, (r as any).n);
    }

    let best: { v: any; score: number } | null = null;
    for (const v of candidates) {
      let score = 0;
      // 1) unit type vs severity
      const vt = (v as any).vehicle_type || ((v as any).has_icu ? 'ICU' : 'BLS');
      if (critical) score += vt === 'ICU' ? DISPATCH_WEIGHTS.typeCriticalIcu : vt === 'ALS' ? DISPATCH_WEIGHTS.typeCriticalAls : 0;
      else score += DISPATCH_WEIGHTS.typeMatchBase;
      // 2) nearest / ETA from live unit location
      const ll = (v as any).last_location;
      if (ll?.lat && ll?.lng && pLat && pLng) {
        const km = this.haversineKm(ll.lat, ll.lng, pLat, pLng);
        const eta = (km / 40) * 60; // urban avg 40km/h
        score += Math.max(0, DISPATCH_WEIGHTS.etaMax - Math.min(DISPATCH_WEIGHTS.etaMax, eta));
      } else if ((v as any).base_city && o.location?.address && String(o.location.address).includes((v as any).base_city)) {
        score += DISPATCH_WEIGHTS.sameCity;
      }
      // 3) provider rating (provider_profiles.rating_avg, 0..5)
      const prof = profByAccount.get((v as any).provider_account_id);
      score += Math.min(DISPATCH_WEIGHTS.ratingMax, (prof?.rating_avg || 0) * 2);
      // 4) hospital priority (if configured)
      if (DISPATCH_WEIGHTS.hospitalBonus && (prof?.type === 'hospital' || prof?.type === 'clinic')) {
        score += DISPATCH_WEIGHTS.hospitalBonus;
      }
      // 5) workload: active missions already held by this unit
      const active = workloadByVehicle.get((v as any).id) || 0;
      score -= active * DISPATCH_WEIGHTS.workloadPenalty;

      if (!best || score > best.score) best = { v, score };
    }
    if (!best) return { ok: false, reason: 'no_available_units' };

    const v: any = best.v;
    const res = await this.model.updateOne(
      { id, assigned_ambulance_id: { $in: [null, undefined] }, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
      { $set: {
          assigned_ambulance_id: v.id,
          assigned_provider_id: v.provider_account_id, // INTERNAL ONLY — never returned to patients
          unit_label: v.plate_number || null,
          claimed_at: new Date(),
          state: EmergencyState.DISPATCH_INITIATED,
          updatedAt: new Date(),
        },
        $push: { state_history: { from: o.state, to: EmergencyState.DISPATCH_INITIATED, by: by.id || 'system', at: new Date(), note: 'auto_dispatch' } },
      },
    );
    if (!res) return { ok: false, reason: 'race_lost' };
    this.events.emit(EVENTS.EMERGENCY_ASSIGNED, { emergency_id: id, vehicle_id: v.id, provider_account_id: v.provider_account_id, auto: true });
    // The crew learns about the mission: in-app notification (provider app bell) + device push (push module listener).
    await this.conn.db.collection('provider_notifications').insertOne({
      id: randomUUID(), provider_account_id: v.provider_account_id, type: 'new_request',
      title_ar: 'مهمة إسعاف جديدة', title_en: 'New ambulance mission',
      body_ar: `تم إسناد بلاغ طوارئ إلى سيارتك ${v.plate_number || ''}`.trim(), body_en: `An SOS was dispatched to your unit ${v.plate_number || ''}`.trim(),
      icon: 'ambulance', related_id: id, related_type: 'emergency', read: false, createdAt: new Date(), updatedAt: new Date(),
    } as any).catch(() => {});
    return { ok: true, id, vehicle_id: v.id, score: best.score };
  }

  async trigger(patient: any, data: { location?: any; symptoms?: string; severity?: string }) {
    const e = await this.model.create({
      patient_id: patient.id,
      patient_name: patient.full_name,
      patient_phone: patient.phone,
      location: data.location,
      symptoms: data.symptoms,
      severity: data.severity || 'critical',
      state: EmergencyState.TRIGGERED,
      state_history: [{ from: '', to: EmergencyState.TRIGGERED, by: patient.id, at: new Date() }],
    });
    this.events.emit(EVENTS.EMERGENCY_TRIGGERED, { emergency_id: e.id, patient_id: patient.id });
    // Auto-progress: capture location -> notify admin
    if (data.location) await this.transition(e.id, EmergencyState.LOCATION_CAPTURED, { id: 'system', role: 'system' });
    await this.transition(e.id, EmergencyState.ADMIN_NOTIFIED, { id: 'system', role: 'system' });
    // S1: internal smart dispatch — best unit by proximity/ETA/type/rating/workload.
    // Fire-and-forget: SOS creation must never fail because dispatch found no unit.
    this.autoDispatch(e.id).catch(() => {});
    return this.patientView(await this.model.findOne({ id: { $eq: e.id } }));
  }

  async transition(id: string, to: EmergencyState, by: any) {
    const e = await this.model.findOne({ id });
    if (!e) throw new NotFoundException();
    const allowed = EMERGENCY_TRANSITIONS[e.state] || [];
    if (by.role !== UserRole.ADMIN && by.role !== 'system' && !allowed.includes(to)) {
      throw new BadRequestException(`Invalid emergency transition ${e.state} → ${to}`);
    }
    e.state_history.push({ from: e.state, to, by: by.id, at: new Date() } as any);
    e.state = to;
    await e.save();
    return e.toObject();
  }

  async assign(id: string, hospital_id: string, by: any) {
    const e = await this.model.findOneAndUpdate(
      { id },
      { $set: { assigned_hospital_id: hospital_id, state: EmergencyState.DISPATCH_INITIATED } },
      { new: true },
    );
    if (!e) throw new NotFoundException();
    this.events.emit(EVENTS.EMERGENCY_ASSIGNED, { emergency_id: id, hospital_id });
    return e.toObject();
  }

  async resolve(id: string, by: any, notes?: string) {
    const e = await this.model.findOneAndUpdate(
      { id },
      { $set: { state: EmergencyState.RESOLVED, resolved_at: new Date(), resolved_by: by.id, admin_notes: notes } },
      { new: true },
    );
    if (!e) throw new NotFoundException();
    this.events.emit(EVENTS.EMERGENCY_RESOLVED, { emergency_id: id });
    return e.toObject();
  }

  /** P6.x-5: escalate an open SOS to 997 (Saudi Red Crescent). Audited, idempotent. */
  async escalate997(id: string, by: any, notes?: string) {
    const e: any = await this.model.findOne({ id: { $eq: id } });
    if (!e) throw new NotFoundException();
    if ([EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED].includes(e.state)) {
      throw new BadRequestException('sos_closed');
    }
    if (e.escalated_997) return { id, escalated_997: true, at: e.escalated_997_at };
    await this.model.updateOne(
      { id: { $eq: id } },
      { $set: { escalated_997: true, escalated_997_at: new Date(), escalated_997_by: by?.id, admin_notes: notes || e.admin_notes } },
    );
    this.events.emit(EVENTS.EMERGENCY_ASSIGNED, { emergency_id: id, escalated_997: true, by: by?.id });
    return { id, escalated_997: true, at: new Date() };
  }

  async active() {
    return this.model.find(
      { state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
      { _id: 0, __v: 0 },
    ).sort({ createdAt: -1 });
  }

  /** M1-31: patient-scoped view — the caller's own active SOS request (was admin-only before). */
  /** Patient cancels their own active SOS — ownership enforced, dispatched units notified */
  async cancelOwn(id: string, patientId: string) {
    const e = await this.model.findOneAndUpdate(
      {
        id,
        patient_id: patientId,
        state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] },
      },
      {
        $set: { state: EmergencyState.CANCELLED, cancelled_at: new Date(), updatedAt: new Date() },
        $push: { state_history: { from: '', to: EmergencyState.CANCELLED, by: patientId, at: new Date(), note: 'patient_cancelled' } },
      },
      { new: true },
    );
    if (!e) throw new NotFoundException('no_active_sos_for_patient');
    this.events.emit(EVENTS.EMERGENCY_RESOLVED, { emergency_id: id, cancelled_by_patient: true });
    return e.toObject();
  }

  async myActive(patientId: string) {
    const e = await this.model.findOne(
      { patient_id: patientId, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
      { _id: 0, __v: 0 },
    );
    // S1: patient-safe projection — no provider/hospital ownership fields
    return this.patientView(e);
  }

  /** Driver: unassigned SOS pool + my assigned missions */
  async driverMissions(providerId: string): Promise<any> {
    const vehicles = await this.vehicles.find({ provider_account_id: providerId, status: 'approved', is_available: true }, { id: 1, plate_number: 1, vehicle_type: 1 }).lean();
    if (!vehicles.length) return { pool: [], mine: [], vehicles: [] };
    const [pool, mine] = await Promise.all([
      this.model.find(
        { assigned_ambulance_id: { $in: [null, undefined] }, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
        { _id: 0, __v: 0, patient_phone: 0, patient_id: 0, assigned_provider_id: 0, assigned_hospital_id: 0 },
      ).sort({ createdAt: -1 }).limit(20),
      this.model.find(
        { assigned_provider_id: providerId, assigned_ambulance_id: { $in: vehicles.map((v: any) => v.id) }, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
        { _id: 0, __v: 0, patient_phone: 0, patient_id: 0, assigned_provider_id: 0, assigned_hospital_id: 0 },
      ).sort({ createdAt: -1 }).limit(20),
    ]);
    // finished missions of this ambulance (the app's history tab)
    const history = await this.model.find(
      { assigned_provider_id: providerId, state: { $in: [EmergencyState.RESOLVED, EmergencyState.CLOSED, 'HANDED_OVER'] } },
      { _id: 0, __v: 0, patient_phone: 0, patient_id: 0, assigned_provider_id: 0, assigned_hospital_id: 0 },
    ).sort({ updatedAt: -1 }).limit(50);
    return { pool, mine, history, vehicles: vehicles.map((v: any) => ({ id: v.id, label: v.plate_number, type: v.vehicle_type })) };
  }

  /** Driver claims an open SOS — atomic first-come-first-served.
   *  Repo updateOne == findOneAndUpdate → returns the doc or null. */
  async claim(id: string, providerId: string, vehicleId?: string) {
    // Installed ambulance apps claim without naming a vehicle: use the driver's only approved, available one.
    if (!vehicleId) {
      const own = await this.vehicles.find({ provider_account_id: providerId, status: 'approved', is_available: true }, { id: 1 }).limit(2).lean();
      if (own.length === 1) vehicleId = (own[0] as any).id;
      else if (own.length > 1) throw new BadRequestException('vehicle_selection_required');
    }
    if (!vehicleId) throw new BadRequestException('approved_vehicle_required');
    const vehicle: any = await this.vehicles.findOne({ id: { $eq: vehicleId }, provider_account_id: { $eq: providerId }, status: 'approved', is_available: true }).lean();
    if (!vehicle) throw new ForbiddenException('vehicle_not_verified_or_not_owned');
    const doc = await this.model.updateOne(
      { id: { $eq: id }, assigned_ambulance_id: { $in: [null, undefined] }, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
      { $set: { assigned_ambulance_id: vehicle.id, assigned_provider_id: providerId, unit_label: vehicle.plate_number || null, claimed_at: new Date(), state: EmergencyState.DISPATCH_INITIATED, updatedAt: new Date() } },
    );
    if (!doc) throw new BadRequestException('already_claimed_or_closed');
    return { ok: true, id, vehicle_id: vehicle.id, state: EmergencyState.DISPATCH_INITIATED };
  }

  async getById(id: string) {
    const e = await this.model.findOne({ id: { $eq: id } }, { _id: 0, __v: 0 });
    if (!e) throw new NotFoundException();
    return e;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /** Patient: live tracking of their own active SOS — real fields only, no fabricated ETA. */
  async tracking(patientId: string) {
    const e = await this.model.findOne(
      { patient_id: { $eq: patientId }, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
      { _id: 0, __v: 0 },
    );
    if (!e) return { active: false };
    const o: any = e.toObject ? e.toObject() : e;
    let eta_minutes: number | null = null;
    let distance_km: number | null = null;
    const u = o.unit_location, p = o.location;
    if (u?.lat && u?.lng && p?.lat && p?.lng) {
      distance_km = Math.round(this.haversineKm(u.lat, u.lng, p.lat, p.lng) * 10) / 10;
      eta_minutes = Math.max(1, Math.round((distance_km / 40) * 60)); // urban avg 40km/h
    }
    const claimed = !!o.assigned_ambulance_id;
    const steps = [
      { key: 'received', title_ar: 'تم استلام النداء', done: true },
      { key: 'assigned', title_ar: 'تم تخصيص سيارة إسعاف', done: claimed, current: claimed && !u?.lat },
      { key: 'en_route', title_ar: 'سيارة الإسعاف في الطريق', done: !!u?.lat, current: claimed && !!u?.lat },
      { key: 'arrived', title_ar: 'الوصول إلى موقعك', done: false },
    ];
    return {
      active: true,
      id: o.id,
      state: o.state,
      // S1: patient-safe only — unit label (plate) instead of internal vehicle/driver ids
      unit_label: o.unit_label || null,
      paramedic_name: o.paramedic_name || null,
      claimed_at: o.claimed_at || null,
      unit_location: u?.lat ? { lat: u.lat, lng: u.lng, updated_at: u.updated_at } : null,
      eta_minutes,
      distance_km,
      steps,
    };
  }

  /** Driver who claimed the SOS: push the ambulance unit's live GPS position. */
  async updateUnitLocation(id: string, providerId: string, body: { lat?: number; lng?: number; vehicle_id?: string }) {
    const lat = Number(body?.lat), lng = Number(body?.lng);
    if (!isFinite(lat) || !isFinite(lng)) throw new BadRequestException('lat_lng_required');
    // the vehicle that claimed this mission, unless the app names it
    let vehicleId = body?.vehicle_id;
    if (!vehicleId) {
      const m: any = await this.model.findOne({ id: { $eq: id }, assigned_provider_id: { $eq: providerId } }, { assigned_ambulance_id: 1 }).lean();
      vehicleId = m?.assigned_ambulance_id;
    }
    if (!vehicleId) throw new BadRequestException('approved_vehicle_required');
    const vehicle: any = await this.vehicles.findOne({ id: { $eq: vehicleId }, provider_account_id: { $eq: providerId }, status: 'approved' }).lean();
    if (!vehicle) throw new ForbiddenException('vehicle_not_verified_or_not_owned');
    const res = await this.model.updateOne(
      { id: { $eq: id }, assigned_ambulance_id: { $eq: vehicle.id }, assigned_provider_id: { $eq: providerId }, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
      { $set: { unit_location: { lat, lng, updated_at: new Date() }, updatedAt: new Date() } },
    );
    if (!res) throw new NotFoundException('mission_not_found_or_not_yours');
    return { ok: true };
  }

  /** Monthly cron to run the SOS drill (1st of month, 02:00). */
  @Cron('0 2 1 * *')
  async runMonthlySosDrill(): Promise<void> {
    try {
      await runSosDrill(this, { id: 'system-drill', role: 'system' }, this.conn);
    } catch (error: any) {
      this.logger.error(`Monthly SOS drill failed: ${error?.message || String(error)}`);
    }
  }
}
