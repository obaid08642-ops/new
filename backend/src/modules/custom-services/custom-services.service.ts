import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { CustomServiceRequest, CustomServiceKind, CustomServiceStatus } from '../../schemas/custom-service.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomServiceRequestRepository } from "./repositories/customservicerequest.repository";

@Injectable()
export class CustomServicesService {
  constructor(
    @Inject('CustomServiceRequestRepository') private readonly model: CustomServiceRequestRepository,
    private readonly events: EventEmitter2,
  ) {}

  async create(user: any, body: any) {
    if (!body.kind || !Object.values(CustomServiceKind).includes(body.kind)) throw new BadRequestException('invalid kind');
    if (!body.name_ar?.trim()) throw new BadRequestException('name_ar required');
    const r = await this.model.create({
      patient_id: user.id,
      patient_name: user.full_name,
      patient_phone: user.phone,
      kind: body.kind,
      name_ar: body.name_ar.trim(),
      name_en: body.name_en?.trim(),
      doctor_notes: body.doctor_notes,
      doctor_name: body.doctor_name,
      prescription_image: body.prescription_image,
      attachments: body.attachments || [],
      priority: body.priority || 'medium',
      status_history: [{ from: '', to: CustomServiceStatus.PENDING, by_user_id: user.id, by_role: user.role || 'patient', at: new Date() }],
    });
    // Emit event → admin notification + provider broadcast (real wiring would push notifications)
    this.events.emit('custom_service.created', { id: r.id, patient_id: user.id, kind: r.kind, name_ar: r.name_ar });
    return r.toObject();
  }

  async mine(user: any, kind?: string) {
    const q: any = { patient_id: user.id };
    if (kind) q.kind = kind;
    return this.model.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(80);
  }

  async one(user: any, id: string) {
    const r = await this.model.findOne({ id }, { _id: 0, __v: 0 });
    if (!r) throw new NotFoundException();
    if (r.patient_id !== user.id && user.role !== 'admin' && user.role !== 'provider') throw new NotFoundException();
    return r;
  }

  // Admin / provider listing
  async adminList(kind?: string, status?: string) {
    const q: any = {};
    if (kind) q.kind = kind;
    if (status) q.status = status;
    return this.model.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
  }

  async updateStatus(user: any, id: string, status: string, note?: string) {
    if (!Object.values(CustomServiceStatus).includes(status as any)) throw new BadRequestException('bad status');
    const r = await this.model.findOne({ id });
    if (!r) throw new NotFoundException();
    r.status_history.push({ from: r.status, to: status, by_user_id: user.id, by_role: user.role, at: new Date(), note });
    r.status = status as any;
    if (status === CustomServiceStatus.PROVIDED || status === CustomServiceStatus.REJECTED || status === CustomServiceStatus.ADDED_TO_CATALOG) {
      r.resolved_at = new Date();
    }
    if (note) r.admin_notes = note;
    await r.save();
    this.events.emit('custom_service.status_changed', { id: r.id, status });
    return r.toObject();
  }
}
