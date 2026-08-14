/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║   ADMIN COMMAND CENTER                                         ║
 * ║   /admin/command-center — single aggregated dashboard endpoint ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
import { Module, Controller, Get, Query, UseGuards, Injectable } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole, ServiceState } from '../../common/enums';
import { OrderSchema, OrderDocument } from '../../schemas/order.schema';
import { LabBookingSchema, LabBooking } from '../../schemas/lab.schema';
import { RadiologyBookingSchema, RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema, HomeCareBooking } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { User, UserDocument, UserSchema } from '../../schemas/user.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { SystemEvent, SystemEventSchema } from '../events/system-event.schema';
import { toUniversal, domainStatesFor } from '../workflow-engine/workflow-engine.module';
import { AdminGovernanceService } from '../admin-governance/admin-governance.module';

@Injectable()
export class AdminCommandCenterService {
  constructor(
    @InjectModel('Order') private orders: Model<OrderDocument>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('HomeCareBooking') private home: Model<HomeCareBooking>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    @InjectModel('User') private users: Model<UserDocument>,
    @InjectModel('ProviderProfile') private providers: Model<any>,
    @InjectModel('SystemEvent') private events: Model<any>,
    private gov: AdminGovernanceService,
  ) {}

  private async liveBookings() {
    const activeUniversals = [ServiceState.REQUESTED, ServiceState.MATCHING, ServiceState.ASSIGNED, ServiceState.CONFIRMED, ServiceState.IN_PROGRESS];
    const liveOf = (kind: any) => activeUniversals.flatMap(u => domainStatesFor(kind, u));
    const since = new Date(Date.now() - 7 * 86400000);
    const [pharm, labs, rads, home, appts] = await Promise.all([
      this.orders.find({ state: { $in: liveOf('pharmacy') }, createdAt: { $gte: since } }, { id: 1, state: 1, patient_id: 1, pharmacy_id: 1, total: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
      this.labs.find({ state: { $in: liveOf('lab') }, createdAt: { $gte: since } }, { id: 1, state: 1, patient_id: 1, account_id: 1, total: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
      this.rads.find({ state: { $in: liveOf('radiology') }, createdAt: { $gte: since } }, { id: 1, state: 1, patient_id: 1, account_id: 1, total: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
      this.home.find({ state: { $in: liveOf('nursing') }, createdAt: { $gte: since } }, { id: 1, state: 1, patient_id: 1, account_id: 1, total: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
      this.appts.find({ status: { $in: liveOf('consultation') }, createdAt: { $gte: since } }, { id: 1, status: 1, patient_id: 1, doctor_user_id: 1, price: 1, createdAt: 1, tracking_id: 1, _id: 0 }).sort({ createdAt: -1 }).limit(40).lean(),
    ]);
    const norm = (kind: any, x: any, stateField = 'state') => ({
      kind, id: x.id, tracking_id: x.tracking_id || x.id, universal_state: toUniversal(kind, x[stateField]),
      domain_state: x[stateField], patient_id: x.patient_id, provider_id: x.pharmacy_id || x.provider_account_id || x.doctor_user_id || null,
      total: x.total || x.price || 0, createdAt: x.createdAt,
    });
    return [
      ...pharm.map(o => norm('pharmacy', o)),
      ...labs.map(l => norm('lab', l)),
      ...rads.map(r => norm('radiology', r)),
      ...home.map(h => norm('nursing', h)),
      ...appts.map((a: any) => norm('consultation', a, 'status')),
    ].sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()).slice(0, 100);
  }

  private async failedTransactions() {
    // service.rollback events in the last 7 days
    const since = new Date(Date.now() - 7 * 86400000);
    return this.events.find({ type: 'service.rollback', createdAt: { $gte: since } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(50).lean();
  }

  private async stuckMatching() {
    // Stuck in MATCHING > 15 min
    const cutoff = new Date(Date.now() - 15 * 60000);
    const stuckOf = (kind: any) => domainStatesFor(kind, ServiceState.MATCHING);
    const [pharm, home] = await Promise.all([
      this.orders.find({ state: { $in: stuckOf('pharmacy') }, createdAt: { $lte: cutoff } }, { id: 1, tracking_id: 1, createdAt: 1, _id: 0 }).limit(30).lean(),
      this.home.find({ state: { $in: stuckOf('nursing') }, createdAt: { $lte: cutoff } }, { id: 1, tracking_id: 1, createdAt: 1, _id: 0 }).limit(30).lean(),
    ]);
    return { pharmacy: pharm, nursing: home };
  }

  private async providersLiveStatus() {
    return this.providers.aggregate([
      { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id.type', status: '$_id.status', count: 1 } },
    ]);
  }

  async snapshot() {
    const [summary, liveBookings, failed, stuck, providersByStatus, perf] = await Promise.all([
      this.gov.globalSummary(),
      this.liveBookings(),
      this.failedTransactions(),
      this.stuckMatching(),
      this.providersLiveStatus(),
      this.gov.providersPerformance({ limit: 20 }),
    ]);
    return {
      summary,
      live_bookings: liveBookings,
      failed_transactions: failed,
      stuck_matching: stuck,
      providers_status: providersByStatus,
      top_providers: perf.slice(0, 10),
      bottom_providers: perf.slice(-10).reverse(),
      generated_at: new Date(),
    };
  }
}

@Controller('admin/command-center')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminCommandCenterController {
  constructor(private svc: AdminCommandCenterService) {}
  @Get() snapshot() { return this.svc.snapshot(); }
}

import { AdminGovernanceModule } from '../admin-governance/admin-governance.module';

@Module({
  imports: [
    AdminGovernanceModule,
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'LabBooking', schema: LabBookingSchema },
      { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: 'User', schema: UserSchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
      { name: 'SystemEvent', schema: SystemEventSchema },
    ]),
  ],
  controllers: [AdminCommandCenterController],
  providers: [AdminCommandCenterService],
})
export class AdminCommandCenterModule {}
