/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║   UNIFIED BOOKING FLOW LAYER                                   ║
 * ║   /booking/flow/* — single contract for ALL 5 service kinds    ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
import { Module, Controller, Get, Post, Param, Body, UseGuards, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { OrderSchema, OrderDocument } from '../../schemas/order.schema';
import { LabBookingSchema, LabBooking } from '../../schemas/lab.schema';
import { RadiologyBookingSchema, RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema, HomeCareBooking } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { SystemEvent, SystemEventSchema } from '../events/system-event.schema';
import { ServiceState, ServiceDomain } from '../../common/enums';
import { toUniversal, WorkflowEngineService, WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';

@Injectable()
export class BookingFlowService {
  constructor(
    @InjectModel('Order') private orders: Model<OrderDocument>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('HomeCareBooking') private home: Model<HomeCareBooking>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    @InjectModel('ProviderProfile') private providers: Model<any>,
    @InjectModel('SystemEvent') private events: Model<any>,
    private engine: WorkflowEngineService,
  ) {}

  private kindAliases: Record<string, ServiceDomain> = {
    pharmacy: 'pharmacy', order: 'pharmacy',
    lab: 'lab', lab_booking: 'lab',
    radiology: 'radiology', radiology_booking: 'radiology',
    nursing: 'nursing', home_care: 'nursing', nursing_booking: 'nursing',
    consultation: 'consultation', doctor: 'consultation', appointment: 'consultation',
  };

  private isAdmin(user: any): boolean {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }

  private isProvider(user: any): boolean {
    return ['provider', 'pharmacy', 'lab', 'laboratory', 'radiology', 'nurse', 'nursing', 'hospital', 'doctor'].includes(String(user?.role || '').toLowerCase())
      || ['pharmacy', 'lab', 'laboratory', 'radiology', 'nursing', 'hospital', 'doctor'].includes(String(user?.provider_type || user?.providerType || '').toLowerCase());
  }

  private providerOwnership(user: any): any[] {
    return [{ provider_account_id: user.id }, { provider_id: user.id }, { doctor_user_id: user.id }, { pharmacy_id: user.id }];
  }

  private async fetchEntity(kind: ServiceDomain, id: string, user: any) {
    const ownership = this.isAdmin(user) ? {} : user?.role === 'patient'
      ? { patient_id: user.id }
      : this.isProvider(user) ? { $or: this.providerOwnership(user) } : { patient_id: user.id };
    if (kind === 'pharmacy') return this.orders.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    if (kind === 'lab') return this.labs.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    if (kind === 'radiology') return this.rads.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    if (kind === 'nursing') return this.home.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    if (kind === 'consultation') return this.appts.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    return null;
  }

  private domainStateOf(kind: ServiceDomain, entity: any): string {
    return kind === 'consultation' ? (entity?.status || '') : (entity?.state || '');
  }

  private entityTypeOf(kind: ServiceDomain): string {
    return ({ pharmacy: 'order', lab: 'lab_booking', radiology: 'radiology_booking', nursing: 'nursing_booking', consultation: 'appointment' } as any)[kind];
  }

  private nextActions(kind: ServiceDomain, universal: ServiceState, role: 'patient' | 'provider' | 'admin' | string): string[] {
    if ([ServiceState.COMPLETED, ServiceState.CANCELLED].includes(universal)) return [];
    if (role === 'patient') {
      const acts: string[] = ['cancel'];
      if ([ServiceState.ASSIGNED, ServiceState.CONFIRMED].includes(universal) && ['lab', 'radiology', 'nursing', 'consultation'].includes(kind)) acts.push('reschedule');
      if (universal === ServiceState.MATCHING) acts.push('retry');
      return acts;
    }
    if (role === 'provider') {
      const acts: string[] = [];
      if (universal === ServiceState.ASSIGNED) { acts.push('accept', 'reject'); }
      if (universal === ServiceState.CONFIRMED) acts.push('start');
      if (universal === ServiceState.IN_PROGRESS) acts.push('complete');
      return acts;
    }
    if (role === 'admin') return ['force_cancel', 'force_advance', 'resolve'];
    return [];
  }

  private recoveryOptions(kind: ServiceDomain, universal: ServiceState, entity: any): string[] {
    // Only `MATCHING` is considered a transient/failable state; pharmacy escalation also surfaces here.
    const failed = universal === ServiceState.MATCHING || ['ESCALATED_TO_ADMIN', 'EXPIRED'].includes(String(this.domainStateOf(kind, entity)).toUpperCase());
    if (!failed) return [];
    const opts = ['retry_broadcast', 'manual_assign', 'cancel'];
    if (kind === 'pharmacy') opts.push('escalate_to_admin');
    return opts;
  }

  /** Standard 7-step skeleton with hit/miss flag based on event log. */
  private buildSteps(kind: ServiceDomain, eventTypes: Set<string>): { key: ServiceState; label: string; reached: boolean }[] {
    const labels: Record<ServiceState, string> = {
      [ServiceState.REQUESTED]: 'تم الإنشاء',
      [ServiceState.MATCHING]: 'جاري البحث عن مزوّد',
      [ServiceState.ASSIGNED]: 'تم التعيين',
      [ServiceState.CONFIRMED]: 'تم التأكيد',
      [ServiceState.IN_PROGRESS]: 'قيد التنفيذ',
      [ServiceState.COMPLETED]: 'مكتمل',
      [ServiceState.CANCELLED]: 'ملغي',
    };
    const evMap: Record<ServiceState, string> = {
      [ServiceState.REQUESTED]: 'service.requested',
      [ServiceState.MATCHING]: 'service.matched',
      [ServiceState.ASSIGNED]: 'service.assigned',
      [ServiceState.CONFIRMED]: 'service.confirmed',
      [ServiceState.IN_PROGRESS]: 'service.started',
      [ServiceState.COMPLETED]: 'service.completed',
      [ServiceState.CANCELLED]: 'service.cancelled',
    };
    const ordered: ServiceState[] = [
      ServiceState.REQUESTED, ServiceState.MATCHING, ServiceState.ASSIGNED,
      ServiceState.CONFIRMED, ServiceState.IN_PROGRESS, ServiceState.COMPLETED,
    ];
    return ordered.map(s => ({ key: s, label: labels[s], reached: eventTypes.has(evMap[s]) }));
  }

  private async providerSnapshot(entity: any, kind: ServiceDomain) {
    const accountId = entity?.provider_account_id || entity?.pharmacy_id || entity?.doctor_user_id;
    if (!accountId) return null;
    const p = await this.providers.findOne({ user_id: accountId }, { name_ar: 1, name_en: 1, phone: 1, city: 1, type: 1, rating: 1, _id: 0 }).lean();
    return p || { user_id: accountId };
  }

  /** Unified status payload (the productized contract). */
  async status(user: any, type: string, id: string) {
    const kind = this.kindAliases[type];
    if (!kind) throw new BadRequestException('invalid_type');
    const entity = await this.fetchEntity(kind, id, user);
    if (!entity) throw new NotFoundException();
    const domainState = this.domainStateOf(kind, entity);
    const universal = toUniversal(kind, domainState);
    const provider = await this.providerSnapshot(entity, kind);
    const evDocs = await this.events.find({ entity_type: this.entityTypeOf(kind), entity_id: id }, { type: 1, _id: 0 }).lean();
    const evTypes = new Set(evDocs.map((e: any) => e.type));
    const steps = this.buildSteps(kind, evTypes);
    const role = user?.role || 'patient';
    const next_actions = this.nextActions(kind, universal, role);
    const recovery = this.recoveryOptions(kind, universal, entity);
    const failure = universal === ServiceState.MATCHING && (entity as any).createdAt && Date.now() - new Date((entity as any).createdAt).getTime() > 15 * 60000
      ? 'no_providers_responded_15m' : null;
    return {
      id,
      type: kind,
      tracking_id: (entity as any).tracking_id || id,
      universal_state: universal,
      domain_state: domainState,
      provider,
      steps,
      next_actions,
      failure_state: failure,
      recovery_options: recovery,
      total: (entity as any).total || (entity as any).totals?.total || (entity as any).price || 0,
      scheduled_at: (entity as any).scheduled_at || (entity as any).slot_start || null,
      createdAt: (entity as any).createdAt,
      updatedAt: (entity as any).updatedAt,
    };
  }

  /** Full event log + entity state history for tracking screen. */
  async timeline(user: any, type: string, id: string) {
    const kind = this.kindAliases[type];
    if (!kind) throw new BadRequestException('invalid_type');
    const entity = await this.fetchEntity(kind, id, user);
    if (!entity) throw new NotFoundException();
    const events = await this.events.find({ entity_type: this.entityTypeOf(kind), entity_id: id }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).lean();
    const state_history = (entity as any).state_history || [];
    return { id, type: kind, state_history, events };
  }

  /** Patient/admin-triggered recovery. */
  async retry(user: any, type: string, id: string) {
    const kind = this.kindAliases[type];
    if (!kind) throw new BadRequestException('invalid_type');
    const entity = await this.fetchEntity(kind, id, user);
    if (!entity) throw new NotFoundException();
    const universal = toUniversal(kind, this.domainStateOf(kind, entity));
    if (universal !== ServiceState.MATCHING && universal !== ServiceState.REQUESTED) {
      throw new BadRequestException('not_retryable_in_current_state');
    }
    // Soft retry: re-emit a service.matched signal so listeners can re-broadcast.
    await this.engine.apply({
      kind, entity_id: id, from_domain: this.domainStateOf(kind, entity), to_domain: this.domainStateOf(kind, entity),
      actor_account_id: user.id, actor_role: user.role, reason: 'retry_requested',
      mutate: async () => ({ retried: true }),
    } as any).catch(() => null);
    return { ok: true, message: 'retry_dispatched' };
  }

  /** Admin force-resolve (cancel with admin reason + audit). */
  async resolve(user: any, type: string, id: string, body: { resolution: 'force_complete' | 'force_cancel'; reason?: string }) {
    if (!this.isAdmin(user)) throw new BadRequestException('admin_only');
    const kind = this.kindAliases[type];
    if (!kind) throw new BadRequestException('invalid_type');
    const entity = await this.fetchEntity(kind, id, user);
    if (!entity) throw new NotFoundException();
    const from = this.domainStateOf(kind, entity);
    const target = body.resolution === 'force_complete' ? ServiceState.COMPLETED : ServiceState.CANCELLED;
    // For pharmacy/lab/radiology/nursing use 'COMPLETED' or 'CANCELLED' domain literal directly.
    return await this.engine.apply({
      kind, entity_id: id, from_domain: from, to_domain: target,
      actor_account_id: user.id, actor_role: 'admin', reason: body.reason || 'admin_resolution',
      mutate: async () => {
        // Write the domain state field appropriately for each kind.
        const Model: any = kind === 'pharmacy' ? this.orders
          : kind === 'lab' ? this.labs
          : kind === 'radiology' ? this.rads
          : kind === 'nursing' ? this.home
          : this.appts;
        const field = kind === 'consultation' ? 'status' : 'state';
        const update: any = { [field]: target };
        const push: any = { state_history: { from, to: target, by_user_id: user.id, by_role: 'admin', at: new Date(), note: body.reason || 'admin_resolution' } };
        await Model.updateOne({ id }, { $set: update, $push: push });
        return { ok: true };
      },
    });
  }
}

@Controller('booking/flow')
@UseGuards(JwtAuthGuard)
export class BookingFlowController {
  constructor(private svc: BookingFlowService) {}
  @Get('status/:type/:id') status(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.status(u, t, id); }
  @Get('timeline/:type/:id') timeline(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.timeline(u, t, id); }
  @Post('retry/:type/:id') retry(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.retry(u, t, id); }
  @Post('resolve/:type/:id') resolve(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.resolve(u, t, id, b); }
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
      { name: 'SystemEvent', schema: SystemEventSchema },
    ]),
  ],
  controllers: [BookingFlowController],
  providers: [BookingFlowService],
  exports: [BookingFlowService],
})
export class BookingFlowModule {}
