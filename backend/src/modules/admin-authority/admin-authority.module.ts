import { Module, Controller, Post, Get, Body, Param, Query, UseGuards, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../common/enums';
import { Order, OrderDocument, OrderSchema } from '../../schemas/order.schema';
import { OrderState } from '../../common/enums';
import { EventBusService } from '../events/event-bus.service';
import { User, UserDocument, UserSchema } from '../../schemas/user.schema';
import { LabBookingSchema, LabBooking, LabBookingState } from '../../schemas/lab.schema';
import { RadiologyBookingSchema, RadiologyBooking, RadiologyBookingState } from '../../schemas/radiology.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'admin_actions_log' })
export class AdminActionLog extends Document {
  @Prop({ required: true, unique: true, default: () => uuidv4() }) id: string;
  @Prop({ required: true, index: true }) action: string;
  @Prop({ required: true }) admin_id: string;
  @Prop() admin_name?: string;
  @Prop() target_type?: string;
  @Prop() target_id?: string;
  @Prop() reason?: string;
  @Prop({ type: Object }) before?: any;
  @Prop({ type: Object }) after?: any;
}
export const AdminActionLogSchema = SchemaFactory.createForClass(AdminActionLog);

@Injectable()
export class AdminAuthorityService {
  constructor(
    @InjectModel('Appointment') private appts: Model<any>,
    @InjectModel('Order') private orderModel: Model<OrderDocument>,
    @InjectModel('User') private userModel: Model<UserDocument>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('AdminActionLog') private log: Model<AdminActionLog>,
    private bus: EventBusService,
    private jwtService: JwtService,
  ) {}

  private async logAction(admin: any, action: string, target_type: string, target_id: string, reason?: string, before?: any, after?: any) {
    await this.log.create({ action, admin_id: admin.id, admin_name: admin.full_name, target_type, target_id, reason, before, after }).catch(() => null);
    this.bus.emit({ type: `admin.${action}`, entity_type: target_type, entity_id: target_id, actor_account_id: admin.id, actor_role: 'admin', reason_code: reason, before, after }).catch(() => null);
  }

  // ===== ORDERS =====
  async forceCancelOrder(admin: any, id: string, reason: string) {
    const o = await this.orderModel.findOne({ id });
    if (!o) throw new NotFoundException();
    const before = { state: o.state };
    o.state_history.push({ from: o.state, to: OrderState.CANCELLED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: 'admin_force: ' + reason } as any);
    o.state = OrderState.CANCELLED;
    await o.save();
    await this.logAction(admin, 'force_cancel_order', 'order', id, reason, before, { state: o.state });
    return o.toObject();
  }

  async forceCompleteOrder(admin: any, id: string, reason: string) {
    const o = await this.orderModel.findOne({ id });
    if (!o) throw new NotFoundException();
    const before = { state: o.state };
    o.state_history.push({ from: o.state, to: OrderState.DELIVERED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason } as any);
    o.state = OrderState.DELIVERED;
    await o.save();
    await this.logAction(admin, 'force_complete_order', 'order', id, reason, before, { state: o.state });
    return o.toObject();
  }

  async forceReassignOrder(admin: any, id: string, new_pharmacy_id: string, reason: string) {
    const o = await this.orderModel.findOne({ id });
    if (!o) throw new NotFoundException();
    const before = { pharmacy_id: o.pharmacy_id, state: o.state };
    o.pharmacy_id = new_pharmacy_id;
    o.state = OrderState.PHARMACY_RECEIVED;
    o.state_history.push({ from: before.state, to: OrderState.PHARMACY_RECEIVED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: 'reassigned: ' + reason } as any);
    await o.save();
    await this.logAction(admin, 'force_reassign_order', 'order', id, reason, before, { pharmacy_id: new_pharmacy_id });
    return o.toObject();
  }

  // ===== LAB BOOKINGS =====
  async forceCancelLab(admin: any, id: string, reason: string) {
    const b = await this.labs.findOne({ id });
    if (!b) throw new NotFoundException();
    const before = { state: b.state };
    b.state_history.push({ from: b.state, to: LabBookingState.CANCELLED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
    b.state = LabBookingState.CANCELLED;
    await b.save();
    await this.logAction(admin, 'force_cancel_lab', 'lab_booking', id, reason, before, { state: b.state });
    return b.toObject();
  }
  async forceCompleteLab(admin: any, id: string, reason: string) {
    const b = await this.labs.findOne({ id });
    if (!b) throw new NotFoundException();
    const before = { state: b.state };
    b.state_history.push({ from: b.state, to: LabBookingState.REPORTED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
    b.state = LabBookingState.REPORTED;
    await b.save();
    await this.logAction(admin, 'force_complete_lab', 'lab_booking', id, reason, before, { state: b.state });
    return b.toObject();
  }
  async overrideLabInsurance(admin: any, id: string, status: 'approved' | 'rejected', reason: string) {
    const b = await this.labs.findOne({ id });
    if (!b) throw new NotFoundException();
    const before = { insurance_status: b.insurance_status };
    b.insurance_status = status;
    if (status === 'rejected') b.rejection_reason = reason;
    await b.save();
    await this.logAction(admin, 'override_insurance_lab', 'lab_booking', id, reason, before, { insurance_status: status });
    return b.toObject();
  }

  // ===== RADIOLOGY BOOKINGS =====
  async forceCancelRad(admin: any, id: string, reason: string) {
    const b = await this.rads.findOne({ id });
    if (!b) throw new NotFoundException();
    const before = { state: b.state };
    b.state_history.push({ from: b.state, to: RadiologyBookingState.CANCELLED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
    b.state = RadiologyBookingState.CANCELLED;
    await b.save();
    await this.logAction(admin, 'force_cancel_radiology', 'radiology_booking', id, reason, before, { state: b.state });
    return b.toObject();
  }
  async forceCompleteRad(admin: any, id: string, reason: string) {
    const b = await this.rads.findOne({ id });
    if (!b) throw new NotFoundException();
    const before = { state: b.state };
    b.state_history.push({ from: b.state, to: RadiologyBookingState.REPORT_PUBLISHED, by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason });
    b.state = RadiologyBookingState.REPORT_PUBLISHED;
    await b.save();
    await this.logAction(admin, 'force_complete_radiology', 'radiology_booking', id, reason, before, { state: b.state });
    return b.toObject();
  }
  async overrideRadInsurance(admin: any, id: string, status: 'approved' | 'rejected', reason: string) {
    const b = await this.rads.findOne({ id });
    if (!b) throw new NotFoundException();
    const before = { insurance_status: b.insurance_status };
    b.insurance_status = status;
    if (status === 'rejected') b.rejection_reason = reason;
    await b.save();
    await this.logAction(admin, 'override_insurance_radiology', 'radiology_booking', id, reason, before, { insurance_status: status });
    return b.toObject();
  }

  
  // ===== APPOINTMENTS =====
  async forceCancelAppt(admin: any, id: string, reason: string) {
    const a = await this.appts.findOne({ id });
    if (!a) throw new NotFoundException();
    const before = { status: a.status };
    a.state_history = a.state_history || [];
    a.state_history.push({ from: a.status, to: 'CANCELLED', by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason } as any);
    a.status = 'CANCELLED';
    await a.save();
    await this.logAction(admin, 'force_cancel_appointment', 'appointment', id, reason, before, { status: a.status });
    return a.toObject();
  }
  async forceConfirmAppt(admin: any, id: string, reason: string) {
    const a = await this.appts.findOne({ id });
    if (!a) throw new NotFoundException();
    const before = { status: a.status };
    a.state_history = a.state_history || [];
    a.state_history.push({ from: a.status, to: 'CONFIRMED', by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason } as any);
    a.status = 'CONFIRMED';
    await a.save();
    await this.logAction(admin, 'force_confirm_appointment', 'appointment', id, reason, before, { status: a.status });
    return a.toObject();
  }
  async forceRescheduleAppt(admin: any, id: string, new_time: string, reason: string) {
    const a = await this.appts.findOne({ id });
    if (!a) throw new NotFoundException();
    const before = { status: a.status, slot_start: a.slot_start };
    a.state_history = a.state_history || [];
    a.state_history.push({ from: a.status, to: 'RESCHEDULED', by_user_id: admin.id, by_role: 'admin', at: new Date(), note: reason } as any);
    a.status = 'RESCHEDULED';
    a.slot_start = new Date(new_time);
    a.slot_end = new Date(new Date(new_time).getTime() + 30*60000); // 30 min later
    await a.save();
    await this.logAction(admin, 'force_reschedule_appointment', 'appointment', id, reason, before, { status: a.status, slot_start: a.slot_start });
    return a.toObject();
  }

// ===== PROVIDERS =====
  async suspendProvider(admin: any, provider_id: string, reason: string) {
    const u = await this.userModel.findOne({ id: provider_id });
    if (!u) throw new NotFoundException();
    const before = { active: (u as any).active };
    (u as any).active = false;
    await u.save();
    await this.logAction(admin, 'suspend_provider', 'provider', provider_id, reason, before, { active: false });
    return { ok: true };
  }
  async unsuspendProvider(admin: any, provider_id: string) {
    const u = await this.userModel.findOne({ id: provider_id });
    if (!u) throw new NotFoundException();
    (u as any).active = true;
    await u.save();
    await this.logAction(admin, 'unsuspend_provider', 'provider', provider_id);
    return { ok: true };
  }

  // ===== IMPERSONATION =====
  async impersonateUser(admin: any, targetUserId: string) {
    const targetUser = (await this.userModel.findOne({ id: targetUserId }).lean()) as any;
    if (!targetUser) throw new NotFoundException('Target user not found');

    const payload = {
      id: targetUser.id,
      email: targetUser.email,
      phone: targetUser.phone,
      role: targetUser.role,
      full_name: targetUser.full_name,
      permissions: targetUser.permissions || [],
      impersonator: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
      }
    };

    const token = await this.jwtService.signAsync(payload);

    await this.logAction(admin, 'impersonate_user', 'user', targetUserId, 'Technical Support troubleshooting session started', null, { target_role: targetUser.role });

    return {
      access_token: token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        full_name: targetUser.full_name,
      }
    };
  }

  // ===== ACTIONS LOG =====
  async listActions(filter: { action?: string; admin_id?: string; target_type?: string; limit?: number }) {
    const q: any = {};
    if (filter.action) q.action = filter.action;
    if (filter.admin_id) q.admin_id = filter.admin_id;
    if (filter.target_type) q.target_type = filter.target_type;
    return this.log.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(Math.min(filter.limit || 200, 500)).lean();
  }
}

@Controller('admin/authority')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminAuthorityController {
  constructor(private svc: AdminAuthorityService) {}
  @Post('appointments/:id/force-cancel') fca(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelAppt(u, id, b.reason || ''); }
  @Post('appointments/:id/force-confirm') fcoappt(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceConfirmAppt(u, id, b.reason || ''); }
  @Post('appointments/:id/force-reschedule') fra(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceRescheduleAppt(u, id, b.new_time, b.reason || ''); }
  @Post('orders/:id/force-cancel') fco(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelOrder(u, id, b.reason || ''); }
  @Post('orders/:id/force-complete') fkco(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCompleteOrder(u, id, b.reason || ''); }
  @Post('orders/:id/force-reassign') frr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceReassignOrder(u, id, b.pharmacy_id, b.reason || ''); }

  @Post('labs/:id/force-cancel') fcl(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelLab(u, id, b.reason || ''); }
  @Post('labs/:id/force-complete') fkcl(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCompleteLab(u, id, b.reason || ''); }
  @Post('labs/:id/override-insurance') oil(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.overrideLabInsurance(u, id, b.status, b.reason || ''); }

  @Post('radiology/:id/force-cancel') fcr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelRad(u, id, b.reason || ''); }
  @Post('radiology/:id/force-complete') fkcr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCompleteRad(u, id, b.reason || ''); }
  @Post('radiology/:id/override-insurance') oir(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.overrideRadInsurance(u, id, b.status, b.reason || ''); }

  @Post('providers/:id/suspend') susp(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.suspendProvider(u, id, b.reason || ''); }
  @Post('providers/:id/unsuspend') unsp(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.unsuspendProvider(u, id); }
  @Post('users/:id/impersonate') impersonate(@Param('id') targetUserId: string, @CurrentUser() admin: any) { return this.svc.impersonateUser(admin, targetUserId); }

  @Get('actions') log(@Query() q: any) { return this.svc.listActions({ action: q?.action, admin_id: q?.admin_id, target_type: q?.target_type, limit: q?.limit ? Number(q.limit) : undefined }); }
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'Order', schema: OrderSchema },
    { name: 'User', schema: UserSchema },
    { name: 'LabBooking', schema: LabBookingSchema },
    { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
    { name: 'AdminActionLog', schema: AdminActionLogSchema },
    { name: 'Appointment', schema: AppointmentSchema },
  ])],
  controllers: [AdminAuthorityController],
  providers: [AdminAuthorityService],
  exports: [AdminAuthorityService],
})
export class AdminAuthorityModule {}
