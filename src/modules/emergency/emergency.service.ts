import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
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

@Injectable()
export class EmergencyService {
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
    const users = this.conn.db.collection('users');
    const activeStates = { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] };

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
      const prof = await profiles.findOne({ account_id: (v as any).provider_account_id }, { projection: { rating_avg: 1, type: 1 } });
      score += Math.min(DISPATCH_WEIGHTS.ratingMax, (prof?.rating_avg || 0) * 2);
      // 4) hospital priority (if configured)
      if (DISPATCH_WEIGHTS.hospitalBonus && (prof?.type === 'hospital' || prof?.type === 'clinic')) {
        score += DISPATCH_WEIGHTS.hospitalBonus;
      }
      // 5) workload: active missions already held by this unit
      const active = await this.model.countDocuments({ assigned_ambulance_id: (v as any).id, state: activeStates } as any);
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
    this.events.emit(EVENTS.EMERGENCY_ASSIGNED, { emergency_id: id, vehicle_id: v.id, auto: true });
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
    return this.patientView(await this.model.findOne({ id: e.id }));
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
    return { pool, mine, vehicles: vehicles.map((v: any) => ({ id: v.id, label: v.plate_number, type: v.vehicle_type })) };
  }

  /** Driver claims an open SOS — atomic first-come-first-served.
   *  Repo updateOne == findOneAndUpdate → returns the doc or null. */
  async claim(id: string, providerId: string, vehicleId?: string) {
    if (!vehicleId) throw new BadRequestException('approved_vehicle_required');
    const vehicle: any = await this.vehicles.findOne({ id: vehicleId, provider_account_id: providerId, status: 'approved', is_available: true }).lean();
    if (!vehicle) throw new ForbiddenException('vehicle_not_verified_or_not_owned');
    const doc = await this.model.updateOne(
      { id, assigned_ambulance_id: { $in: [null, undefined] }, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
      { $set: { assigned_ambulance_id: vehicle.id, assigned_provider_id: providerId, unit_label: vehicle.plate_number || null, claimed_at: new Date(), state: EmergencyState.DISPATCH_INITIATED, updatedAt: new Date() } },
    );
    if (!doc) throw new BadRequestException('already_claimed_or_closed');
    return { ok: true, id, vehicle_id: vehicle.id, state: EmergencyState.DISPATCH_INITIATED };
  }

  async getById(id: string) {
    const e = await this.model.findOne({ id }, { _id: 0, __v: 0 });
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
      { patient_id: patientId, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
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
    if (!body?.vehicle_id) throw new BadRequestException('approved_vehicle_required');
    const vehicle: any = await this.vehicles.findOne({ id: body.vehicle_id, provider_account_id: providerId, status: 'approved' }).lean();
    if (!vehicle) throw new ForbiddenException('vehicle_not_verified_or_not_owned');
    const res = await this.model.updateOne(
      { id, assigned_ambulance_id: vehicle.id, assigned_provider_id: providerId, state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED, EmergencyState.CANCELLED] } },
      { $set: { unit_location: { lat, lng, updated_at: new Date() }, updatedAt: new Date() } },
    );
    if (!res) throw new NotFoundException('mission_not_found_or_not_yours');
    return { ok: true };
  }
}
