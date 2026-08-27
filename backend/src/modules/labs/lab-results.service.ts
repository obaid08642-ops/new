import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { LabResult, LabResultType } from '../../schemas/lab-result.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { LabBookingState } from '../../schemas/lab.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException } from '@nestjs/common';
import { getEffectiveRoles } from '../../common/auth.guard';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { LabResultRepository } from "./repositories/labresult.repository";
import { LabBookingRepository } from "./repositories/labbooking.repository";

@Injectable()
export class LabResultsService {
  constructor(
    @Inject('LabResultRepository') private readonly results: LabResultRepository,
    @InjectConnection() private readonly conn: Connection,
    @Inject('LabBookingRepository') private readonly bookings: LabBookingRepository,
    private readonly events: EventEmitter2,
    private readonly engine: WorkflowEngineService,
  ) {}

  private flagFor(value: number, ref_low?: number, ref_high?: number): string {
    if (typeof value !== 'number' || isNaN(value)) return 'normal';
    if (ref_high !== undefined && value > ref_high * 1.5) return 'critical';
    if (ref_low !== undefined && value < ref_low * 0.5) return 'critical';
    if (ref_high !== undefined && value > ref_high) return 'high';
    if (ref_low !== undefined && value < ref_low) return 'low';
    return 'normal';
  }

  async create(user: any, body: any) {
    if (!body.booking_id) throw new BadRequestException('booking_id required');
    if (!body.type) throw new BadRequestException('type required');
    const b = await this.bookings.findOne({ id: body.booking_id });
    if (!b) throw new NotFoundException('booking');
    const effectiveRoles = getEffectiveRoles(user);
    if (!effectiveRoles.some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException('lab_provider_required');
    if (!effectiveRoles.includes('admin') && b.provider_account_id !== user.id) throw new ForbiddenException('lab_booking_not_owned');
    if (b.state !== LabBookingState.RESULT_UPLOADED) throw new BadRequestException(`invalid_transition_${b.state}_to_REPORTED`);

    // process entries to auto-flag
    let critical = false;
    const entries = (body.entries || []).map((e: any) => {
      const val = parseFloat(e.value);
      const flag = e.flag || this.flagFor(val, e.ref_low, e.ref_high);
      if (flag === 'critical') critical = true;
      return { ...e, value: e.value, flag };
    });

    return this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: LabBookingState.REPORTED,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'lab_result_created',
      mutate: async () => {
        const r = await this.results.create({
          booking_id: b.id, patient_id: b.patient_id, patient_name: b.patient_name,
          service_id: b.items?.[0]?.service_id, service_name_ar: body.service_name_ar || b.items?.[0]?.name_ar || '',
          service_name_en: body.service_name_en || b.items?.[0]?.name_en, type: body.type, source: 'labs', entries,
          attachments: body.attachments || [], findings: body.findings, impression: body.impression,
          recommendations: body.recommendations, notes: body.notes, reported_at: new Date(),
          reported_by_id: user.id, reported_by_name: user.full_name, critical,
        });
        b.reports = [...(b.reports || []), { result_id: r.id, tracking_id: r.tracking_id, at: new Date() }];
        (b.state_history as any).push({ from: b.state, to: LabBookingState.REPORTED, by_user_id: user.id, by_role: user.role, at: new Date() });
        (b as any).state = LabBookingState.REPORTED;
        await b.save();
        this.events.emit('lab.result_ready', { result_id: r.id, patient_id: b.patient_id, critical, tracking_id: r.tracking_id });
        this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: b.state, tracking_id: b.tracking_id });
        return r.toObject();
      },
    });
  }

  async mineFor(user: any) {
    // Only labs (exclude radiology reports which live in this collection with source='radiology')
    const standalone = await this.results.find({ patient_id: user.id, source: { $ne: 'radiology' } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
    // Union reports embedded inside lab bookings (upload-report stores them there)
    const embedded = await this.conn.collection('labbookings').aggregate([
      { $match: { patient_id: user.id, 'reports.0': { $exists: true } } },
      { $unwind: '$reports' },
      { $project: {
        _id: 0,
        id: '$reports.id',
        booking_id: '$id',
        patient_id: '$patient_id',
        name: '$reports.name',
        mime: '$reports.mime',
        url: '$reports.url',
        notes: '$reports.notes',
        uploaded_at: '$reports.uploaded_at',
        state: '$state',
        source: { $literal: 'lab_booking' },
        createdAt: '$reports.uploaded_at',
      } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
    ]).toArray();
    return [...embedded, ...standalone].sort((a: any, b: any) =>
      new Date(b.createdAt || b.uploaded_at).getTime() - new Date(a.createdAt || a.uploaded_at).getTime(),
    );
  }

  async byBooking(user: any, booking_id: string) {
    const list = await this.results.find({ booking_id, patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
    return list;
  }

  async one(user: any, id: string) {
    const r = await this.results.findOne({ id });
    if (r) {
      if (r.patient_id !== user.id && user.role !== 'admin') throw new NotFoundException();
      if (!r.viewed_by_patient && r.patient_id === user.id) { r.viewed_by_patient = true; r.patient_viewed_at = new Date(); await r.save(); }
      return r.toObject();
    }

    // `uploadReport` stores legacy/generated reports inside the booking. The patient
    // list exposes their report IDs, so the detail endpoint must resolve that same
    // ID with an ownership predicate rather than return an unopenable list item.
    const bookingFilter: any = { 'reports.id': id };
    if (user.role !== 'admin') bookingFilter.patient_id = user.id;
    const booking: any = await this.conn.collection('labbookings').findOne(bookingFilter, {
      projection: { _id: 0, id: 1, patient_id: 1, state: 1, reports: 1 },
    });
    const report = booking?.reports?.find((entry: any) => entry?.id === id);
    if (!booking || !report) throw new NotFoundException();

    return {
      id: report.id,
      booking_id: booking.id,
      patient_id: booking.patient_id,
      name: report.name,
      mime: report.mime,
      url: report.url,
      notes: report.notes,
      uploaded_at: report.uploaded_at,
      state: booking.state,
      source: 'lab_booking',
    };
  }
}
