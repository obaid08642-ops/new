/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║   DATA CONSISTENCY LAYER                                       ║
 * ║   Detect + reconcile + auto-fix orphans across all bookings.   ║
 * ╚════════════════════════════════════════════════════════════════╝
 */
import { Module, Controller, Get, Post, Body, Query, UseGuards, Injectable } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole, ServiceState } from '../../common/enums';
import { OrderSchema, OrderDocument } from '../../schemas/order.schema';
import { LabBookingSchema, LabBooking } from '../../schemas/lab.schema';
import { RadiologyBookingSchema, RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema, HomeCareBooking } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { SystemEvent, SystemEventSchema } from '../events/system-event.schema';
import { User, UserSchema, UserDocument } from '../../schemas/user.schema';
import { toUniversal, WorkflowEngineService, WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';

@Injectable()
export class ConsistencyService {
  constructor(
    @InjectModel('Order') private orders: Model<OrderDocument>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('HomeCareBooking') private home: Model<HomeCareBooking>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    @InjectModel('SystemEvent') private events: Model<any>,
    @InjectModel('User') private users: Model<UserDocument>,
    private engine: WorkflowEngineService,
  ) {}

  /** Cross-collection audit — surface inconsistencies without modifying data. */
  async audit() {
    const since = new Date(Date.now() - 30 * 86400000);
    const audit: any = { since, issues: { duplicates: [], orphans: [], mismatched: [], missing_birth_event: [], stuck: [] } };

    // 1) Duplicate-ish bookings: same patient + same provider + same kind + same day
    const dupPipeline = (model: Model<any>, providerField: string, stateField = 'state') => [
      { $match: { createdAt: { $gte: since }, [stateField]: { $nin: ['CANCELLED'] } } },
      { $group: { _id: { patient_id: '$patient_id', provider: `$${providerField}`, day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }, ids: { $push: '$id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 30 },
    ];
    const [dupOrders, dupLabs, dupRads, dupHome, dupAppts] = await Promise.all([
      this.orders.aggregate(dupPipeline(this.orders, 'pharmacy_id')),
      this.labs.aggregate(dupPipeline(this.labs, 'provider_account_id')),
      this.rads.aggregate(dupPipeline(this.rads, 'provider_account_id')),
      this.home.aggregate(dupPipeline(this.home, 'provider_account_id')),
      this.appts.aggregate(dupPipeline(this.appts, 'doctor_user_id', 'status')),
    ]);
    audit.issues.duplicates = [
      ...dupOrders.map(d => ({ kind: 'pharmacy', ...d })),
      ...dupLabs.map(d => ({ kind: 'lab', ...d })),
      ...dupRads.map(d => ({ kind: 'radiology', ...d })),
      ...dupHome.map(d => ({ kind: 'nursing', ...d })),
      ...dupAppts.map(d => ({ kind: 'consultation', ...d })),
    ];

    // 2) Orphan: booking exists but patient user no longer exists
    const sample = async (model: Model<any>, label: string, ownerField = 'patient_id') => {
      const docs: any[] = await model.find({ createdAt: { $gte: since } }, { id: 1, [ownerField]: 1, _id: 0 }).limit(500).lean();
      const ids: string[] = Array.from(new Set(docs.map(d => d[ownerField]).filter(Boolean)));
      const existing = await this.users.find({ id: { $in: ids } }, { id: 1, _id: 0 }).lean();
      const have = new Set(existing.map((u: any) => u.id));
      return docs.filter(d => d[ownerField] && !have.has(d[ownerField])).map(d => ({ kind: label, id: d.id, missing_owner: d[ownerField] }));
    };
    audit.issues.orphans = [
      ...await sample(this.orders, 'pharmacy'),
      ...await sample(this.labs, 'lab'),
      ...await sample(this.rads, 'radiology'),
      ...await sample(this.home, 'nursing'),
      ...await sample(this.appts, 'consultation'),
    ].slice(0, 50);

    // 3) Mismatched state field: domain says CANCELLED but no event of it
    const mismatchFor = async (model: Model<any>, kind: any, stateField = 'state') => {
      const cancelled = await model.find({ [stateField]: { $regex: /CANCELLED/i }, createdAt: { $gte: since } }, { id: 1, [stateField]: 1, _id: 0 }).limit(200).lean();
      const ids: string[] = cancelled.map((c: any) => c.id);
      const eventTypeMap: Record<string, string> = { pharmacy: 'order', lab: 'lab_booking', radiology: 'radiology_booking', nursing: 'nursing_booking', consultation: 'appointment' };
      const events = await this.events.find({ entity_type: eventTypeMap[kind], entity_id: { $in: ids }, type: 'service.cancelled' }, { entity_id: 1, _id: 0 }).lean();
      const haveEvt = new Set(events.map((e: any) => e.entity_id));
      return cancelled.filter((c: any) => !haveEvt.has(c.id)).map((c: any) => ({ kind, id: c.id, state: c[stateField], missing_event: 'service.cancelled' }));
    };
    audit.issues.mismatched = [
      ...await mismatchFor(this.orders, 'pharmacy'),
      ...await mismatchFor(this.labs, 'lab'),
      ...await mismatchFor(this.rads, 'radiology'),
      ...await mismatchFor(this.home, 'nursing'),
      ...await mismatchFor(this.appts, 'consultation', 'status'),
    ].slice(0, 50);

    // 4) Missing birth event (no service.requested logged)
    const missingBirthFor = async (model: Model<any>, kind: any) => {
      const recent: any[] = await model.find({ createdAt: { $gte: since } }, { id: 1, _id: 0 }).limit(500).lean();
      const ids = recent.map(r => r.id);
      const eventTypeMap: Record<string, string> = { pharmacy: 'order', lab: 'lab_booking', radiology: 'radiology_booking', nursing: 'nursing_booking', consultation: 'appointment' };
      const events = await this.events.find({ entity_type: eventTypeMap[kind], entity_id: { $in: ids }, type: 'service.requested' }, { entity_id: 1, _id: 0 }).lean();
      const have = new Set(events.map((e: any) => e.entity_id));
      return recent.filter(r => !have.has(r.id)).map(r => ({ kind, id: r.id }));
    };
    audit.issues.missing_birth_event = [
      ...await missingBirthFor(this.orders, 'pharmacy'),
      ...await missingBirthFor(this.labs, 'lab'),
      ...await missingBirthFor(this.rads, 'radiology'),
      ...await missingBirthFor(this.home, 'nursing'),
      ...await missingBirthFor(this.appts, 'consultation'),
    ].slice(0, 50);

    // 5) Stuck in MATCHING > 30 minutes
    const cutoff = new Date(Date.now() - 30 * 60000);
    const [stuckO, stuckH] = await Promise.all([
      this.orders.find({ state: { $regex: /BROADCAST|MATCHING|READY_FOR_SPLIT/ }, createdAt: { $lte: cutoff } }, { id: 1, state: 1, createdAt: 1, _id: 0 }).limit(50).lean(),
      this.home.find({ state: { $regex: /BROADCAST/ }, createdAt: { $lte: cutoff } }, { id: 1, state: 1, createdAt: 1, _id: 0 }).limit(50).lean(),
    ]);
    audit.issues.stuck = [
      ...stuckO.map((o: any) => ({ kind: 'pharmacy', ...o })),
      ...stuckH.map((o: any) => ({ kind: 'nursing', ...o })),
    ];

    audit.totals = Object.fromEntries(Object.entries(audit.issues).map(([k, v]: any) => [k, v.length]));
    return audit;
  }

  /** Reconcile: emit missing service.requested birth events. SAFE. */
  async reconcile() {
    const auditResult = await this.audit();
    let fixed = 0;
    for (const m of auditResult.issues.missing_birth_event as any[]) {
      try {
        await this.engine.announceCreated({ kind: m.kind, entity_id: m.id, actor_role: 'system', meta: { reconciled: true } });
        fixed++;
      } catch { /* skip */ }
    }
    return { reconciled_birth_events: fixed, total_missing: auditResult.issues.missing_birth_event.length };
  }

  /** Fix orphans: cancel bookings whose patient no longer exists. SAFE. */
  async fixOrphans(dryRun = true) {
    const auditResult = await this.audit();
    const results: any[] = [];
    for (const o of auditResult.issues.orphans as any[]) {
      if (dryRun) { results.push({ ...o, action: 'would_cancel' }); continue; }
      try {
        const Model: any = o.kind === 'pharmacy' ? this.orders
          : o.kind === 'lab' ? this.labs
          : o.kind === 'radiology' ? this.rads
          : o.kind === 'nursing' ? this.home
          : this.appts;
        const field = o.kind === 'consultation' ? 'status' : 'state';
        await Model.updateOne({ id: o.id }, { $set: { [field]: 'CANCELLED' }, $push: { state_history: { from: 'orphan', to: 'CANCELLED', by_role: 'system', at: new Date(), note: 'orphan_owner_missing' } } });
        results.push({ ...o, action: 'cancelled' });
      } catch (e: any) { results.push({ ...o, action: 'failed', error: String(e?.message || e) }); }
    }
    return { dry_run: dryRun, processed: results.length, results };
  }
}

@Controller('consistency')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class ConsistencyController {
  constructor(private svc: ConsistencyService) {}
  @Get('audit') audit() { return this.svc.audit(); }
  @Post('reconcile') reconcile() { return this.svc.reconcile(); }
  @Post('fix-orphans') fixOrphans(@Query('dry_run') dry?: string) { return this.svc.fixOrphans(dry !== 'false'); }
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
      { name: 'SystemEvent', schema: SystemEventSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [ConsistencyController],
  providers: [ConsistencyService],
  exports: [ConsistencyService],
})
export class ConsistencyModule {}
