import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmergencyRequest, EmergencyRequestDocument } from '../../schemas/emergency.schema';
import { EmergencyState, EMERGENCY_TRANSITIONS, UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { EmergencyRequestRepository } from "./repositories/emergencyrequest.repository";

@Injectable()
export class EmergencyService {
  constructor(
    @Inject('EmergencyRequestRepository') private model: EmergencyRequestRepository,
    private events: EventEmitter2,
  ) {}

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
    return this.model.findOne({ id: e.id }, { _id: 0, __v: 0 });
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
      { state: { $nin: [EmergencyState.RESOLVED, EmergencyState.CLOSED] } },
      { _id: 0, __v: 0 },
    ).sort({ createdAt: -1 });
  }

  async getById(id: string) {
    const e = await this.model.findOne({ id }, { _id: 0, __v: 0 });
    if (!e) throw new NotFoundException();
    return e;
  }
}
