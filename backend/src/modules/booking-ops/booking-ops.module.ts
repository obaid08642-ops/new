/**
 * Additive Booking Operations Module
 * Reuses existing schemas + business-rules + workflow-engine. NO new state system.
 * Provides:
 *   - GET  /booking/flow/invoice/:type/:id       — derives invoice from booking
 *   - GET  /booking/flow/payment/:type/:id       — derived payment state
 *   - POST /booking/flow/payment/:type/:id/mark  — admin/provider marks paid/failed
 *   - POST /booking/flow/attachments/:type/:id   — attach document (base64)
 *   - GET  /booking/flow/attachments/:type/:id   — list attachments
 *   - POST /booking/flow/contact/:type/:id       — request provider contact
 */
import { Module, Controller, Get, Post, Param, Body, UseGuards, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { OrderSchema, OrderDocument } from '../../schemas/order.schema';
import { LabBookingSchema, LabBooking } from '../../schemas/lab.schema';
import { RadiologyBookingSchema, RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema, HomeCareBooking } from '../../schemas/home-care.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { ServiceDomain } from '../../common/enums';

@Schema({ collection: 'booking_attachments', timestamps: true })
export class BookingAttachment extends Document {
  @Prop({ required: true, index: true }) booking_kind: string;
  @Prop({ required: true, index: true }) booking_id: string;
  @Prop({ required: true }) by_user_id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) mime: string;
  @Prop({ required: true }) base64: string;
  @Prop() purpose: string; // insurance_card | prescription | referral | report | other
}
export const BookingAttachmentSchema = SchemaFactory.createForClass(BookingAttachment);

@Injectable()
export class BookingOpsService {
  constructor(
    @InjectModel('Order') private orders: Model<OrderDocument>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('HomeCareBooking') private home: Model<HomeCareBooking>,
    @InjectModel(Appointment.name) private appts: Model<any>,
    @InjectModel('ProviderProfile') private providers: Model<any>,
    @InjectModel('BookingAttachment') private attachments: Model<BookingAttachment>,
  ) {}

  private kindAliases: Record<string, ServiceDomain> = {
    pharmacy: 'pharmacy', order: 'pharmacy',
    lab: 'lab', lab_booking: 'lab',
    radiology: 'radiology', radiology_booking: 'radiology',
    nursing: 'nursing', home_care: 'nursing', nursing_booking: 'nursing',
    consultation: 'consultation', doctor: 'consultation', appointment: 'consultation',
  };

  private async fetchEntity(kind: ServiceDomain, id: string, user: any): Promise<any> {
    const ownership = user?.role === 'admin' ? {} : { patient_id: user.id };
    if (kind === 'pharmacy') return this.orders.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    if (kind === 'lab') return this.labs.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    if (kind === 'radiology') return this.rads.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    if (kind === 'nursing') return this.home.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    if (kind === 'consultation') return this.appts.findOne({ id, ...ownership }, { _id: 0, __v: 0 }).lean();
    return null;
  }

  /** Derived invoice payload (no new schema needed). */
  async invoice(user: any, type: string, id: string) {
    const kind = this.kindAliases[type];
    if (!kind) throw new BadRequestException('invalid_type');
    const e = await this.fetchEntity(kind, id, user);
    if (!e) throw new NotFoundException();
    const subtotal = e.subtotal ?? e.total ?? e.price ?? 0;
    const taxRate = 0.15;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const insuranceDiscount = e.insurance_provider ? Math.round(subtotal * 0.8 * 100) / 100 : 0;
    const total = e.total ?? Math.max(0, subtotal - insuranceDiscount) + tax;
    return {
      booking_id: id, kind, tracking_id: e.tracking_id || id,
      patient_id: e.patient_id, provider_id: e.pharmacy_id || e.provider_account_id || e.doctor_user_id,
      items: e.items || [{ name_ar: e.service_name_ar || 'خدمة', price: subtotal }],
      payment_method: e.payment_method || 'cash',
      insurance_provider: e.insurance_provider,
      breakdown: { subtotal, tax, insurance_discount: insuranceDiscount, delivery_fee: e.delivery_fee || 0, total },
      issued_at: e.createdAt,
      currency: 'SAR',
    };
  }

  /** Derived payment state from booking fields. */
  async payment(user: any, type: string, id: string) {
    const kind = this.kindAliases[type];
    if (!kind) throw new BadRequestException('invalid_type');
    const e = await this.fetchEntity(kind, id, user);
    if (!e) throw new NotFoundException();
    const status = e.payment_status || (e.payment_method === 'cash' ? 'cash_on_delivery'
      : e.payment_method === 'insurance' ? (e.insurance_status === 'approved' ? 'covered' : 'awaiting_insurance')
      : 'pending');
    return {
      booking_id: id, kind, payment_method: e.payment_method || 'cash',
      payment_status: status, insurance_provider: e.insurance_provider,
      insurance_status: e.insurance_status, amount: e.total || e.price || 0,
      paid_at: e.paid_at || null, transaction_id: e.transaction_id || null,
    };
  }

  /** Admin/provider marks payment status. */
  async markPayment(user: any, type: string, id: string, body: { status?: string; transaction_id?: string; insurance_status?: 'pending' | 'verified' | 'approved' | 'rejected' }) {
    if (!['admin', 'provider', 'pharmacy', 'lab', 'radiology', 'doctor'].includes(user.role)) {
      throw new BadRequestException('not_authorized');
    }
    const kind = this.kindAliases[type];
    if (!kind) throw new BadRequestException('invalid_type');
    const Model: any = kind === 'pharmacy' ? this.orders
      : kind === 'lab' ? this.labs
      : kind === 'radiology' ? this.rads
      : kind === 'nursing' ? this.home
      : this.appts;
    const set: any = {};
    if (body.status) {
      set.payment_status = body.status;
      set.transaction_id = body.transaction_id || null;
      set.paid_at = body.status === 'paid' ? new Date() : null;
    }
    if (body.insurance_status) {
      // map 'verified' -> 'approved' for legacy schemas
      set.insurance_status = body.insurance_status === 'verified' ? 'approved' : body.insurance_status;
    }
    await Model.updateOne({ id }, { $set: set });
    return { ok: true, ...set };
  }

  async addAttachment(user: any, type: string, id: string, body: { name: string; mime: string; base64: string; purpose?: string }) {
    const kind = this.kindAliases[type];
    if (!kind) throw new BadRequestException('invalid_type');
    const e = await this.fetchEntity(kind, id, user);
    if (!e) throw new NotFoundException();
    return this.attachments.create({
      booking_kind: kind, booking_id: id, by_user_id: user.id,
      name: body.name, mime: body.mime, base64: body.base64, purpose: body.purpose || 'other',
    });
  }

  async listAttachments(user: any, type: string, id: string) {
    const kind = this.kindAliases[type];
    if (!kind) throw new BadRequestException('invalid_type');
    return this.attachments.find({ booking_kind: kind, booking_id: id }, { base64: 0, _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean();
  }

  async getAttachment(user: any, type: string, id: string, attachmentId: string) {
    const kind = this.kindAliases[type];
    return this.attachments.findOne({ _id: attachmentId, booking_kind: kind, booking_id: id }, { __v: 0 }).lean();
  }
}

@Controller('booking/flow')
@UseGuards(JwtAuthGuard)
export class BookingOpsController {
  constructor(private svc: BookingOpsService) {}
  @Get('invoice/:type/:id') invoice(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.invoice(u, t, id); }
  @Get('payment/:type/:id') payment(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.payment(u, t, id); }
  @Post('payment/:type/:id/mark') mark(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.markPayment(u, t, id, b); }
  @Post('attachments/:type/:id') addAtt(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.addAttachment(u, t, id, b); }
  @Get('attachments/:type/:id') listAtt(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.listAttachments(u, t, id); }
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'Order', schema: OrderSchema },
    { name: 'LabBooking', schema: LabBookingSchema },
    { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
    { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
    { name: Appointment.name, schema: AppointmentSchema },
    { name: 'ProviderProfile', schema: ProviderProfileSchema },
    { name: 'BookingAttachment', schema: BookingAttachmentSchema },
  ])],
  controllers: [BookingOpsController],
  providers: [BookingOpsService],
  exports: [BookingOpsService],
})
export class BookingOpsModule {}
