/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║   UNIFIED PROVIDER JOBS LAYER                                  ║
 * ║   /provider/jobs/* — single inbox + actions for ALL provider   ║
 * ║   types (pharmacy / lab / radiology / nursing / doctor)        ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
import { Module, Controller, Get, Post, Param, Query, Body, UseGuards, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { OrderSchema, OrderDocument } from '../../schemas/order.schema';
import { LabBookingSchema, LabBooking } from '../../schemas/lab.schema';
import { RadiologyBookingSchema, RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema, HomeCareBooking } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { BookingAttachmentSchema } from '../booking-ops/booking-ops.module';
import { ServiceState, ServiceDomain } from '../../common/enums';
import { toUniversal, domainStatesFor, WorkflowEngineService, WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';

type JobStatus = 'incoming' | 'active' | 'completed';

@Injectable()
export class ProviderJobsService {
  constructor(
    @InjectModel('Order') private orders: Model<OrderDocument>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('HomeCareBooking') private home: Model<HomeCareBooking>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    @InjectModel('ProviderProfile') private providers: Model<any>,
    @InjectModel('User') private users: Model<any>,
    @InjectModel('BookingAttachment') private attachments: Model<any>,
    private engine: WorkflowEngineService,
  ) {}

  private kindAliases: Record<string, ServiceDomain> = {
    pharmacy: 'pharmacy', order: 'pharmacy',
    lab: 'lab', lab_booking: 'lab',
    radiology: 'radiology', radiology_booking: 'radiology',
    nursing: 'nursing', home_care: 'nursing', nursing_booking: 'nursing',
    consultation: 'consultation', doctor: 'consultation', appointment: 'consultation',
  };

  /** Statuses that map to a job bucket. */
  private bucket(universal: ServiceState): JobStatus | null {
    if (universal === ServiceState.ASSIGNED) return 'incoming';
    if ([ServiceState.CONFIRMED, ServiceState.IN_PROGRESS].includes(universal)) return 'active';
    if (universal === ServiceState.COMPLETED) return 'completed';
    return null;
  }

  private async providerIdentity(user: any) {
    const accountId = String(user.provider_account_id || user.id || '');
    const profileId = typeof user.provider_profile_id === 'string' ? user.provider_profile_id : '';
    const filters = [
      ...(accountId ? [{ account_id: accountId }, { user_id: accountId }] : []),
      ...(profileId ? [{ id: profileId }] : []),
    ];
    const profiles: any[] = filters.length
      ? await this.providers.find({ $or: filters }, { id: 1, account_id: 1, user_id: 1, capabilities: 1, _id: 0 }).lean()
      : [];
    return {
      accountIds: Array.from(new Set([accountId, ...profiles.flatMap((p: any) => [p.account_id, p.user_id]).filter(Boolean)])),
      profileIds: Array.from(new Set([profileId, ...profiles.map((p: any) => p.id).filter(Boolean)])),
      profiles,
    };
  }

  private async consultationOwnershipFilter(user: any) {
    const { accountIds, profileIds } = await this.providerIdentity(user);
    return {
      $or: [
        ...(accountIds.length ? [{ doctor_user_id: { $in: accountIds } }, { account_id: { $in: accountIds } }] : []),
        ...(profileIds.length ? [{ doctor_id: { $in: profileIds } }] : []),
      ],
    };
  }

  /** Map an authenticated user.role + provider profile capabilities → allowed domains. */
  private async allowedKindsFor(user: any): Promise<Set<ServiceDomain>> {
    const all: ServiceDomain[] = ['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'];
    if (user.role === 'admin' || user.role === 'provider') return new Set(all);
    const byRole: Record<string, ServiceDomain[]> = {
      pharmacy: ['pharmacy'],
      lab: ['lab'],
      radiology: ['radiology'],
      doctor: ['consultation'],
      home_care: ['nursing'],
      hospital: ['lab', 'radiology', 'consultation'],
      clinic: ['consultation'],
    };
    const base = byRole[user.role] || [];
    // Provider profile may declare an explicit `capabilities` array that overrides defaults.
    try {
      const { profiles } = await this.providerIdentity(user);
      const caps: string[] | undefined = profiles[0]?.capabilities;
      if (Array.isArray(caps) && caps.length) {
        const map: Record<string, ServiceDomain> = { lab: 'lab', labs: 'lab', radiology: 'radiology', pharmacy: 'pharmacy', consultation: 'consultation', doctor: 'consultation', nursing: 'nursing', home_care: 'nursing' };
        const fromCaps = caps.map(c => map[c]).filter(Boolean) as ServiceDomain[];
        if (fromCaps.length) return new Set(fromCaps);
      }
    } catch {}
    return new Set(base);
  }

  /** Unified provider job inbox across ALL 5 service domains. */
  async queue(user: any, status: JobStatus = 'incoming', kindFilter?: string) {
    const providerId = String(user.provider_account_id || user.id);
    const consultationFilter = await this.consultationOwnershipFilter(user);
    const allowedKinds = await this.allowedKindsFor(user);
    const filters: Record<string, string[]> = {
      incoming: ['ASSIGNED'].flatMap(u => ['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'].map(k => `${k}:${u}`)),
      active: ['CONFIRMED', 'IN_PROGRESS'].flatMap(u => ['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'].map(k => `${k}:${u}`)),
      completed: ['COMPLETED'].flatMap(u => ['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'].map(k => `${k}:${u}`)),
    };

    const wantUniversals: ServiceState[] = status === 'incoming'
      ? [ServiceState.ASSIGNED]
      : status === 'active'
      ? [ServiceState.CONFIRMED, ServiceState.IN_PROGRESS]
      : [ServiceState.COMPLETED];

    const universalsToDomainStates = (kind: ServiceDomain): string[] =>
      wantUniversals.flatMap(u => domainStatesFor(kind, u));

    const kindAllowed = (k: string) => allowedKinds.has(k as ServiceDomain) && (!kindFilter || this.kindAliases[kindFilter] === k);

    const [ordersJobs, labsJobs, radsJobs, homeJobs, apptsJobs] = await Promise.all([
      kindAllowed('pharmacy')
        ? this.orders.find({ pharmacy_id: providerId, state: { $in: universalsToDomainStates('pharmacy') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
        : Promise.resolve([]),
      kindAllowed('lab')
        ? this.labs.find({ account_id: providerId, state: { $in: universalsToDomainStates('lab') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
        : Promise.resolve([]),
      kindAllowed('radiology')
        ? this.rads.find({ account_id: providerId, state: { $in: universalsToDomainStates('radiology') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
        : Promise.resolve([]),
      kindAllowed('nursing')
        ? this.home.find({ $or: [{ provider_id: providerId }, { account_id: providerId }], state: { $in: universalsToDomainStates('nursing') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
        : Promise.resolve([]),
      kindAllowed('consultation')
        ? this.appts.find({ ...consultationFilter, status: { $in: universalsToDomainStates('consultation') } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean()
        : Promise.resolve([]),
    ]);

    const map = (kind: ServiceDomain, x: any) => ({
      kind,
      id: x.id,
      tracking_id: x.tracking_id || x.id,
      patient_id: x.patient_id,
      universal_state: toUniversal(kind, kind === 'consultation' ? x.status : x.state),
      domain_state: kind === 'consultation' ? x.status : x.state,
      total: x.total || x.totals?.total || x.price || 0,
      scheduled_at: x.scheduled_at || x.slot_start || null,
      title_ar: x.items?.[0]?.name_ar || x.service_name_ar || (kind === 'pharmacy' ? 'طلب صيدلية' : kind === 'lab' ? 'تحاليل' : kind === 'radiology' ? 'أشعة' : kind === 'nursing' ? 'رعاية منزلية' : 'استشارة'),
      payment_method: x.payment_method || 'cash',
      payment_status: x.payment_status || (x.payment_method === 'cash' ? 'cash_on_delivery' : 'pending'),
      insurance_provider: x.insurance_provider || null,
      insurance_status: x.insurance_status || null,
      address: x.address || x.delivery_address || null,
      contact: x.contact || null,
      service_type: x.service_type || null, // consultation: clinic/video/home
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
    });

    const combined = [
      ...ordersJobs.map(o => map('pharmacy', o)),
      ...labsJobs.map(l => map('lab', l)),
      ...radsJobs.map(r => map('radiology', r)),
      ...homeJobs.map(h => map('nursing', h)),
      ...apptsJobs.map((a: any) => map('consultation', a)),
    ].sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());

    // Enrich with patient identity, contact, payment, and attachment counts (bounded).
    const patientIds = Array.from(new Set(combined.map(c => c.patient_id).filter(Boolean)));
    const ids = combined.map(c => c.id);
    const [users, attachmentCounts]: any[] = await Promise.all([
      patientIds.length ? this.users.find({ id: { $in: patientIds } }, { id: 1, full_name: 1, phone: 1, _id: 0 }).lean() : [],
      ids.length ? this.attachments.aggregate([
        { $match: { booking_id: { $in: ids } } },
        { $group: { _id: '$booking_id', n: { $sum: 1 } } },
      ]) : [],
    ]);
    const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));
    const attMap = new Map<string, number>(attachmentCounts.map((a: any) => [a._id, a.n]));
    return combined.map((c: any) => ({
      ...c,
      patient_name: userMap.get(c.patient_id)?.full_name || null,
      patient_phone: userMap.get(c.patient_id)?.phone || null,
      attachments_count: attMap.get(c.id) || 0,
    }));
  }

  private async findEntity(kind: ServiceDomain, id: string, user: any) {
    const providerId = String(user.provider_account_id || user.id);
    let entity: any = null;
    if (kind === 'pharmacy') entity = await this.orders.findOne({ id, pharmacy_id: providerId });
    else if (kind === 'lab') entity = await this.labs.findOne({ id, account_id: providerId });
    else if (kind === 'radiology') entity = await this.rads.findOne({ id, account_id: providerId });
    else if (kind === 'nursing') entity = await this.home.findOne({ id, $or: [{ provider_id: providerId }, { account_id: providerId }] });
    else if (kind === 'consultation') entity = await this.appts.findOne({ id, ...(await this.consultationOwnershipFilter(user)) });
    if (!entity) throw new NotFoundException('job_not_found_or_not_yours');
    return entity;
  }

  /** Generic provider action — transitions via engine. */
  private async act(user: any, type: string, id: string, target: ServiceState, reason?: string) {
    if (!['provider', 'pharmacy', 'lab', 'radiology', 'doctor', 'admin'].includes(user.role)) throw new ForbiddenException('provider_only');
    const kind = this.kindAliases[type];
    if (!kind) throw new NotFoundException('invalid_type');
    const entity = await this.findEntity(kind, id, user);
    const field = kind === 'consultation' ? 'status' : 'state';
    const from = entity[field];
    // Map universal target → domain literal that the entity understands.
    const domainLiteralFor: Record<ServiceState, Record<ServiceDomain, string>> = {
      [ServiceState.REQUESTED]: { pharmacy: 'CREATED', lab: 'CREATED', radiology: 'PENDING', nursing: 'CREATED', consultation: 'PENDING' },
      [ServiceState.MATCHING]: { pharmacy: 'BROADCAST', lab: 'CREATED', radiology: 'PENDING', nursing: 'BROADCASTING', consultation: 'PENDING' },
      [ServiceState.ASSIGNED]: { pharmacy: 'PHARMACY_RECEIVED', lab: 'CREATED', radiology: 'PENDING', nursing: 'PROVIDER_ASSIGNED', consultation: 'PENDING' },
      [ServiceState.CONFIRMED]: { pharmacy: 'ACCEPTED', lab: 'CONFIRMED', radiology: 'CONFIRMED', nursing: 'CONFIRMED', consultation: 'CONFIRMED' },
      [ServiceState.IN_PROGRESS]: { pharmacy: 'PREPARING', lab: 'SAMPLE_COLLECTED', radiology: 'IN_PROGRESS', nursing: 'IN_PROGRESS', consultation: 'IN_PROGRESS' },
      [ServiceState.COMPLETED]: { pharmacy: 'DELIVERED', lab: 'REPORTED', radiology: 'REPORT_PUBLISHED', nursing: 'COMPLETED', consultation: 'COMPLETED' },
      [ServiceState.CANCELLED]: { pharmacy: 'CANCELLED', lab: 'CANCELLED', radiology: 'CANCELLED', nursing: 'CANCELLED', consultation: 'CANCELLED' },
    };
    const toDomain = domainLiteralFor[target][kind];
    return await this.engine.apply({
      kind, entity_id: id, from_domain: from, to_domain: toDomain,
      actor_account_id: user.id, actor_role: 'provider', patient_account_id: entity.patient_id, reason,
      mutate: async () => {
        const Model: any = kind === 'pharmacy' ? this.orders
          : kind === 'lab' ? this.labs
          : kind === 'radiology' ? this.rads
          : kind === 'nursing' ? this.home
          : this.appts;
        entity[field] = toDomain;
        (entity.state_history = entity.state_history || []).push({ from, to: toDomain, by_user_id: user.id, by_role: 'provider', at: new Date(), note: reason });
        await entity.save();
        return entity.toObject();
      },
    });
  }

  accept(user: any, type: string, id: string, reason?: string) { return this.act(user, type, id, ServiceState.CONFIRMED, reason || 'provider_accepted'); }
  reject(user: any, type: string, id: string, reason?: string) { return this.act(user, type, id, ServiceState.CANCELLED, reason || 'provider_rejected'); }
  start(user: any, type: string, id: string, reason?: string) { return this.act(user, type, id, ServiceState.IN_PROGRESS, reason || 'provider_started'); }
  complete(user: any, type: string, id: string, reason?: string) { return this.act(user, type, id, ServiceState.COMPLETED, reason || 'provider_completed'); }
  async updateInsurance(user: any, type: string, id: string, insuranceDetails: any) {
    if (!['provider', 'pharmacy', 'lab', 'radiology', 'doctor', 'admin'].includes(user.role)) {
      throw new ForbiddenException('provider_only');
    }
    const kind = this.kindAliases[type];
    if (!kind) throw new NotFoundException('invalid_type');
    const entity = await this.findEntity(kind, id, user);
    entity.insurance_details = {
      ...(entity.insurance_details || {}),
      ...insuranceDetails,
      approvalDate: new Date(),
      approvedBy: user.id,
    };
    if (entity.markModified) {
      entity.markModified('insurance_details');
    }
    await entity.save();
    return entity.toObject();
  }
}

@Controller('provider/jobs')
@UseGuards(JwtAuthGuard)
export class ProviderJobsController {
  constructor(private svc: ProviderJobsService) {}
  @Get('queue') queue(@CurrentUser() u: any, @Query() q: any) { return this.svc.queue(u, (q.status as any) || 'incoming', q.kind); }
  @Get('my-capabilities') async myCaps(@CurrentUser() u: any) {
    const set = await (this.svc as any).allowedKindsFor(u);
    return { role: u.role, capabilities: Array.from(set) };
  }
  @Post(':type/:id/accept') accept(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.accept(u, t, id, b?.reason); }
  @Post(':type/:id/reject') reject(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.reject(u, t, id, b?.reason); }
  @Post(':type/:id/start') start(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.start(u, t, id, b?.reason); }
  @Post(':type/:id/complete') complete(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.complete(u, t, id, b?.reason); }
  @Post(':type/:id/insurance') insurance(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateInsurance(u, t, id, b); }
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
      { name: 'User', schema: UserSchema },
      { name: 'BookingAttachment', schema: BookingAttachmentSchema },
    ]),
  ],
  controllers: [ProviderJobsController],
  providers: [ProviderJobsService],
  exports: [ProviderJobsService],
})
export class ProviderJobsModule {}
