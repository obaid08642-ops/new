// @ts-nocheck
import { Module, Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException, NotFoundException, BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { LabServiceSchema, LabService } from '../../schemas/lab.schema';
import { RadiologyServiceSchema, RadiologyService } from '../../schemas/radiology.schema';
import { EventBusService } from '../events/event-bus.service';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/** Provider catalog ownership map: tracks which lab/radiology service belongs to which provider account (extends existing catalog non-destructively via separate ownership doc). */
@Schema({ timestamps: true, collection: 'service_ownership' })
export class ServiceOwnership extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) account_id: string;
  @Prop({ required: true, index: true }) entity_type: string; // 'lab' | 'radiology'
  @Prop({ required: true, index: true }) entity_id: string;
  @Prop({ default: true }) approved: boolean;
}
export const ServiceOwnershipSchema = SchemaFactory.createForClass(ServiceOwnership);
ServiceOwnershipSchema.index({ account_id: 1, entity_type: 1 });

/** Provider weekly schedule + blocked dates for labs/radiology/home services. */
@Schema({ timestamps: true, collection: 'provider_schedules' })
export class ProviderSchedule extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) account_id: string;
  @Prop({ required: true, index: true }) entity_type: string; // 'lab' | 'radiology' | 'pharmacy_delivery' | 'home_service'
  @Prop({ type: Object, default: {} }) weekly: Record<string, { start: string; end: string; breaks?: { start: string; end: string }[] }[]>;
  @Prop({ type: [String], default: [] }) blocked_dates: string[];
  @Prop({ default: 30 }) slot_minutes: number;
  @Prop({ default: 1 }) max_per_slot: number;
  @Prop({ default: 10 }) coverage_radius_km: number;
  @Prop({ default: true }) is_online: boolean;
}
export const ProviderScheduleSchema = SchemaFactory.createForClass(ProviderSchedule);
ProviderScheduleSchema.index({ account_id: 1, entity_type: 1 }, { unique: true });

const DEFAULT_WEEKLY = {
  sun: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
  mon: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
  tue: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
  wed: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
  thu: [{ start: '09:00', end: '14:00' }],
};

function dayKey(d: Date) { return ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()]; }
function fromHM(date: Date, hm: string) { const [h, m] = hm.split(':').map(Number); const r = new Date(date); r.setHours(h, m, 0, 0); return r; }
function toHM(d: Date) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

@Injectable()
export class ServiceCatalogService {
  constructor(
    @InjectModel('LabService') private labs: Model<LabService>,
    @InjectModel('RadiologyService') private rads: Model<RadiologyService>,
    @InjectModel('ServiceOwnership') private own: Model<ServiceOwnership>,
    @InjectModel('ProviderSchedule') private sched: Model<ProviderSchedule>,
    private bus: EventBusService,
  ) {}

  private assertProvider(user: any) {
    if (!['lab', 'hospital', 'radiology', 'pharmacy', 'admin', 'provider', 'doctor'].includes(user.role)) throw new ForbiddenException();
  }

  // ===== Provider catalog =====
  async myCatalog(user: any, entity_type: 'lab' | 'radiology') {
    this.assertProvider(user);
    const ownerships = await this.own.find({ account_id: user.id, entity_type }, { _id: 0, __v: 0 }).lean();
    const ids = ownerships.map(o => o.entity_id);
    const Model: any = entity_type === 'lab' ? this.labs : this.rads;
    const services = ids.length ? await Model.find({ id: { $in: ids } }, { _id: 0, __v: 0 }).lean() : [];
    return services.map((s: any) => ({ ...s, owned: true, approved: ownerships.find(o => o.entity_id === s.id)?.approved !== false }));
  }

  async createService(user: any, entity_type: 'lab' | 'radiology', data: any) {
    this.assertProvider(user);
    if (!data.name_ar) throw new BadRequestException('name_ar required');
    const Model: any = entity_type === 'lab' ? this.labs : this.rads;
    const doc = await Model.create({
      ...data,
      name_en: data.name_en || data.name_ar,
      price: Number(data.price) || 0,
      active: data.active !== false,
      unavailable: !!data.unavailable,
    });
    await this.own.create({ account_id: user.id, entity_type, entity_id: doc.id, approved: user.role === 'admin' });
    this.bus.emit({ type: 'catalog.service_created', entity_type: 'service', entity_id: doc.id, actor_account_id: user.id, actor_role: user.role, meta: { kind: entity_type } }).catch(() => null);
    return doc.toObject();
  }

  async updateService(user: any, entity_type: 'lab' | 'radiology', id: string, patch: any) {
    this.assertProvider(user);
    const own = await this.own.findOne({ entity_id: id, entity_type });
    if (user.role !== 'admin' && (!own || own.provider_account_id !== user.id)) throw new ForbiddenException();
    const Model: any = entity_type === 'lab' ? this.labs : this.rads;
    const r = await Model.findOneAndUpdate({ id }, { $set: patch }, { new: true });
    if (!r) throw new NotFoundException();
    this.bus.emit({ type: 'catalog.service_updated', entity_type: 'service', entity_id: id, actor_account_id: user.id, actor_role: user.role, meta: { kind: entity_type, fields: Object.keys(patch) } }).catch(() => null);
    return r.toObject();
  }

  async toggleService(user: any, entity_type: 'lab' | 'radiology', id: string, active: boolean) {
    return this.updateService(user, entity_type, id, { active });
  }

  async deleteService(user: any, entity_type: 'lab' | 'radiology', id: string) {
    this.assertProvider(user);
    const own = await this.own.findOne({ entity_id: id, entity_type });
    if (user.role !== 'admin' && (!own || own.provider_account_id !== user.id)) throw new ForbiddenException();
    const Model: any = entity_type === 'lab' ? this.labs : this.rads;
    await Model.deleteOne({ id });
    await this.own.deleteMany({ entity_id: id, entity_type });
    this.bus.emit({ type: 'catalog.service_deleted', entity_type: 'service', entity_id: id, actor_account_id: user.id, actor_role: user.role, meta: { kind: entity_type } }).catch(() => null);
    return { ok: true };
  }

  // ===== ADMIN ENDPOINTS =====
  async adminListAll(entity_type: 'lab' | 'radiology', q: any) {
    const Model: any = entity_type === 'lab' ? this.labs : this.rads;
    const filter: any = {};
    if (q.search) filter.$or = [{ name_ar: { $regex: q.search, $options: 'i' } }, { name_en: { $regex: q.search, $options: 'i' } }];
    const services = await Model.find(filter, { _id: 0, __v: 0 }).limit(500).lean();
    const ownMap: Record<string, any> = {};
    for (const o of await this.own.find({ entity_type, entity_id: { $in: services.map((s: any) => s.id) } }).lean()) ownMap[o.entity_id] = o;
    return services.map((s: any) => ({ ...s, ownership: ownMap[s.id] || null }));
  }

  async adminApproveService(entity_type: 'lab' | 'radiology', entity_id: string, approve: boolean, user: any) {
    const o = await this.own.findOneAndUpdate({ entity_type, entity_id }, { $set: { approved: approve } }, { new: true });
    const Model: any = entity_type === 'lab' ? this.labs : this.rads;
    await Model.updateOne({ id: entity_id }, { $set: { active: approve } });
    this.bus.emit({ type: approve ? 'catalog.service_approved' : 'catalog.service_disabled', entity_type: 'service', entity_id, actor_account_id: user.id, actor_role: 'admin', meta: { kind: entity_type } }).catch(() => null);
    return { ok: true, ownership: o };
  }

  // ===== PROVIDER SCHEDULE =====
  async getSchedule(user: any, entity_type: string) {
    this.assertProvider(user);
    let s: any = await this.sched.findOne({ account_id: user.id, entity_type }).lean();
    if (!s) {
      const created = await this.sched.create({ account_id: user.id, entity_type, weekly: DEFAULT_WEEKLY });
      s = created.toObject();
    }
    return s;
  }

  async upsertSchedule(user: any, entity_type: string, data: any) {
    this.assertProvider(user);
    const $set: any = {};
    for (const k of ['weekly', 'blocked_dates', 'slot_minutes', 'max_per_slot', 'coverage_radius_km', 'is_online']) if (data[k] !== undefined) $set[k] = data[k];
    const r = await this.sched.findOneAndUpdate({ account_id: user.id, entity_type }, { $set }, { new: true, upsert: true });
    this.bus.emit({ type: 'provider.schedule_updated', entity_type: 'provider_schedule', entity_id: r.id, actor_account_id: user.id, actor_role: user.role, meta: { entity_type } }).catch(() => null);
    return r.toObject();
  }

  // Compute generic available slots for a given provider/entity_type/date
  async availableSlots(account_id: string, entity_type: string, date: string, bookedCounter?: (slotISO: string) => Promise<number>) {
    let s: any = await this.sched.findOne({ provider_account_id, entity_type }).lean();
    if (!s) s = { weekly: DEFAULT_WEEKLY, blocked_dates: [], slot_minutes: 30, max_per_slot: 1 };
    const day = new Date(date);
    if (s.blocked_dates?.includes(date)) return [];
    const blocks = (s.weekly || DEFAULT_WEEKLY)[dayKey(day)] || [];
    const dur = s.slot_minutes || 30;
    const out: { time: string; available: boolean }[] = [];
    for (const b of blocks) {
      let cur = fromHM(day, b.start); const end = fromHM(day, b.end);
      while (cur < end) {
        const next = new Date(cur.getTime() + dur * 60000);
        if (next > end) break;
        const inBr = (b.breaks || []).some((br: any) => toHM(cur) >= br.start && toHM(cur) < br.end);
        if (!inBr && cur.getTime() > Date.now()) {
          const iso = cur.toISOString();
          const booked = bookedCounter ? await bookedCounter(iso) : 0;
          out.push({ time: iso, available: booked < (s.max_per_slot || 1) });
        }
        cur = next;
      }
    }
    return out;
  }
}

@Controller('service-catalog')
@UseGuards(JwtAuthGuard)
export class ServiceCatalogController {
  constructor(private svc: ServiceCatalogService) {}

  @Get('mine/:type') mine(@Param('type') t: 'lab' | 'radiology', @CurrentUser() u: any) { return this.svc.myCatalog(u, t); }
  @Post('mine/:type') create(@Param('type') t: 'lab' | 'radiology', @Body() b: any, @CurrentUser() u: any) { return this.svc.createService(u, t, b); }
  @Patch('mine/:type/:id') update(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.updateService(u, t, id, b); }
  @Post('mine/:type/:id/toggle') toggle(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.toggleService(u, t, id, !!b.active); }
  @Delete('mine/:type/:id') del(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @CurrentUser() u: any) { return this.svc.deleteService(u, t, id); }

  @Get('schedule/:entity') sched(@Param('entity') e: string, @CurrentUser() u: any) { return this.svc.getSchedule(u, e); }
  @Patch('schedule/:entity') setSched(@Param('entity') e: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.upsertSchedule(u, e, b); }

  // Admin
  @Get('admin/:type') @Roles(UserRole.ADMIN) adminAll(@Param('type') t: 'lab' | 'radiology', @Query() q: any) { return this.svc.adminListAll(t, q); }
  @Post('admin/:type/:id/approve') @Roles(UserRole.ADMIN) approve(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.adminApproveService(t, id, b.approve !== false, u); }
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'LabService', schema: LabServiceSchema },
    { name: 'RadiologyService', schema: RadiologyServiceSchema },
    { name: 'ServiceOwnership', schema: ServiceOwnershipSchema },
    { name: 'ProviderSchedule', schema: ProviderScheduleSchema },
  ])],
  controllers: [ServiceCatalogController],
  providers: [ServiceCatalogService],
  exports: [ServiceCatalogService, MongooseModule],
})
export class ServiceCatalogModule {}
