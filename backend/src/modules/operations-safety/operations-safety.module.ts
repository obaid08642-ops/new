/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║   OPERATIONAL SAFETY LAYER                                     ║
 * ║   SLA tracking · escalation · cancellation penalty · fallback  ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
import { Module, Controller, Get, Post, Body, Query, UseGuards, Injectable } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole, ServiceState } from '../../common/enums';
import { OrderSchema, OrderDocument } from '../../schemas/order.schema';
import { LabBookingSchema, LabBooking } from '../../schemas/lab.schema';
import { RadiologyBookingSchema, RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema, HomeCareBooking } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { toUniversal, WorkflowEngineService, WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';

@Schema({ collection: 'cancellation_penalties', timestamps: true })
export class CancellationPenalty extends Document {
  @Prop({ required: true, index: true }) booking_id: string;
  @Prop({ required: true, index: true }) kind: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop() provider_id: string;
  @Prop({ default: 0 }) amount: number;
  @Prop() reason: string;
  @Prop({ default: 'assessed', enum: ['assessed', 'waived', 'collected'] }) status: string;
}
export const CancellationPenaltySchema = SchemaFactory.createForClass(CancellationPenalty);

/** Expected duration in MINUTES for each universal state (per domain). */
const SLA: Record<string, Record<string, number>> = {
  pharmacy:     { REQUESTED: 5,   MATCHING: 15,  ASSIGNED: 10, CONFIRMED: 30,  IN_PROGRESS: 90  },
  lab:          { REQUESTED: 60,  MATCHING: 30,  ASSIGNED: 60, CONFIRMED: 360, IN_PROGRESS: 1440 },
  radiology:    { REQUESTED: 60,  MATCHING: 30,  ASSIGNED: 60, CONFIRMED: 360, IN_PROGRESS: 1440 },
  nursing:      { REQUESTED: 10,  MATCHING: 20,  ASSIGNED: 30, CONFIRMED: 120, IN_PROGRESS: 240  },
  consultation: { REQUESTED: 5,   MATCHING: 5,   ASSIGNED: 10, CONFIRMED: 60,  IN_PROGRESS: 60   },
};

@Injectable()
export class OperationsSafetyService {
  constructor(
    @InjectModel('Order') private orders: Model<OrderDocument>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('HomeCareBooking') private home: Model<HomeCareBooking>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    @InjectModel('ProviderProfile') private providers: Model<any>,
    @InjectModel('CancellationPenalty') private penalties: Model<CancellationPenalty>,
    private engine: WorkflowEngineService,
  ) {}

  /** Compute overdue (SLA breach) bookings across all domains. */
  async slaReport() {
    const now = Date.now();
    const isOverdue = (kind: string, universal: ServiceState, updatedAt: Date) => {
      const sla = SLA[kind]?.[universal];
      if (!sla) return null;
      const elapsedMin = (now - new Date(updatedAt).getTime()) / 60000;
      return elapsedMin > sla ? Math.round(elapsedMin - sla) : null;
    };
    const collect = async (model: Model<any>, kind: string, stateField = 'state') => {
      const docs: any[] = await model.find({ [stateField]: { $exists: true } }, { id: 1, [stateField]: 1, updatedAt: 1, createdAt: 1, patient_id: 1, _id: 0 }).sort({ updatedAt: -1 }).limit(500).lean();
      return docs.map(d => {
        const u = toUniversal(kind as any, d[stateField]);
        const overdueBy = isOverdue(kind, u, d.updatedAt || d.createdAt);
        return overdueBy != null ? { kind, id: d.id, universal_state: u, overdue_minutes: overdueBy, patient_id: d.patient_id } : null;
      }).filter(Boolean);
    };
    const out = (await Promise.all([
      collect(this.orders, 'pharmacy'),
      collect(this.labs, 'lab'),
      collect(this.rads, 'radiology'),
      collect(this.home, 'nursing'),
      collect(this.appts, 'consultation', 'status'),
    ])).flat();
    return { sla_definition: SLA, breached: out, total_breached: out.length };
  }

  /** Escalate: re-broadcast pharmacy/nursing bookings stuck in MATCHING > X minutes. */
  async escalate(body: { kind?: string; threshold_minutes?: number } = {}) {
    const cutoff = new Date(Date.now() - (body.threshold_minutes || 15) * 60000);
    const results: any[] = [];
    if (!body.kind || body.kind === 'pharmacy') {
      const stuck = await this.orders.find({ state: { $regex: /BROADCAST|MATCHING|READY_FOR_SPLIT/ }, updatedAt: { $lte: cutoff } }).limit(20);
      for (const o of stuck) {
        results.push({ kind: 'pharmacy', id: o.id, action: 're-broadcast-requested', current_state: o.state });
      }
    }
    if (!body.kind || body.kind === 'nursing') {
      const stuck = await this.home.find({ state: { $regex: /BROADCAST/ }, updatedAt: { $lte: cutoff } }).limit(20);
      for (const o of stuck) {
        results.push({ kind: 'nursing', id: o.id, action: 're-broadcast-requested', current_state: o.state });
      }
    }
    return { escalated: results.length, results };
  }

  /** Assess cancellation penalty (called by domains on cancel). */
  async assessPenalty(args: { booking_id: string; kind: string; patient_id: string; provider_id?: string; scheduled_at?: Date; cancelled_at?: Date }) {
    if (!args.scheduled_at) return null;
    const minutesBefore = (new Date(args.scheduled_at).getTime() - new Date(args.cancelled_at || new Date()).getTime()) / 60000;
    let amount = 0; let reason = 'no_penalty';
    if (minutesBefore < 60 && minutesBefore >= 0) { amount = 30; reason = 'cancel_within_1h'; }
    else if (minutesBefore < 0) { amount = 50; reason = 'cancel_after_scheduled'; }
    if (amount === 0) return null;
    return this.penalties.create({
      booking_id: args.booking_id, kind: args.kind, patient_id: args.patient_id,
      provider_id: args.provider_id, amount, reason, status: 'assessed',
    });
  }

  /** Fallback provider routing — pick next best ranked provider when current is unresponsive. */
  async fallback(body: { kind: 'pharmacy' | 'lab' | 'radiology' | 'nursing' | 'consultation'; exclude_provider_id?: string; city?: string; insurance?: string; service_keys?: string[] }) {
    const ranked = await this.engine.rankProviders({
      kind: body.kind, city: body.city, insurance: body.insurance,
      service_keys: body.service_keys, max_results: 10,
    });
    const filtered = body.exclude_provider_id
      ? ranked.filter((r: any) => r.user_id !== body.exclude_provider_id && r.id !== body.exclude_provider_id)
      : ranked;
    return { fallback_count: filtered.length, providers: filtered.slice(0, 5) };
  }

  /** List penalties (admin). */
  async listPenalties(filter: { status?: string; patient_id?: string } = {}) {
    const q: any = {};
    if (filter.status) q.status = filter.status;
    if (filter.patient_id) q.patient_id = filter.patient_id;
    return this.penalties.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
  }
}

@Controller('ops')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class OperationsSafetyController {
  constructor(private svc: OperationsSafetyService) {}
  @Get('sla') sla() { return this.svc.slaReport(); }
  @Post('escalate') escalate(@Body() b: any) { return this.svc.escalate(b); }
  @Post('penalty/assess') assess(@Body() b: any) { return this.svc.assessPenalty(b); }
  @Post('fallback') fallback(@Body() b: any) { return this.svc.fallback(b); }
  @Get('penalties') penalties(@Query() q: any) { return this.svc.listPenalties(q); }
}

@Module({
  imports: [
    WorkflowEngineModule,
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'LabBooking', schema: LabBookingSchema },
      { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
      { name: 'CancellationPenalty', schema: CancellationPenaltySchema },
    ]),
  ],
  controllers: [OperationsSafetyController],
  providers: [OperationsSafetyService],
  exports: [OperationsSafetyService],
})
export class OperationsSafetyModule {}
