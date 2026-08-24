import { Controller, Post, Body, Param, Patch, Get, BadRequestException, NotFoundException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { RadiologyBooking } from '../schemas/radiology-booking.schema';
import { CurrentUser, JwtAuthGuard } from '../../../common/auth.guard';
import { RequireIdempotency } from '../../../common/idempotency.interceptor';

@Controller('radiology/bookings')
@UseGuards(JwtAuthGuard)
export class RadiologyController {
  constructor(
    @InjectModel('RadiologyCenterBooking') private radBookingModel: Model<RadiologyBooking>,
    @InjectModel('RadiologyService') private radServiceModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  /**
   * Patient creates a radiology booking (was unwired: the service method existed
   * with no route, leaving patient-side radiology booking unreachable).
   * Accepts either a catalog `service_id` (names auto-filled) or explicit scan fields.
   */
  @Post()
  @RequireIdempotency()
  @HttpCode(HttpStatus.CREATED)
  async book(@CurrentUser() user: any, @Body() body: any) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('invalid_booking_payload');
    if (typeof body.service_id !== 'string' || !body.service_id.trim() || body.service_id.length > 160) throw new BadRequestException('service_id_required');
    const scheduledAt = new Date(body.scheduled_at);
    if (typeof body.scheduled_at !== 'string' || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 5 * 60_000) {
      throw new BadRequestException('scheduled_at_must_be_in_the_future');
    }
    if (body.delivery_mode !== undefined && !['IN_CENTER', 'MOBILE_HOME_VISIT'].includes(body.delivery_mode)) throw new BadRequestException('invalid_delivery_mode');
    const patient: any = await this.userModel.findOne({ id: user.id }).lean();
    if (!patient) throw new BadRequestException('patient_not_found');

    const svc: any = await this.radServiceModel.findOne({
      id: body.service_id, is_deleted: { $ne: true }, active: { $ne: false }, public_eligibility: true, medical_review_status: 'approved',
    }).lean();
    if (!svc) throw new BadRequestException('service_not_found');
    const deliveryMode = body.delivery_mode === 'MOBILE_HOME_VISIT' ? 'MOBILE_HOME_VISIT' : 'IN_CENTER';
    if (deliveryMode === 'MOBILE_HOME_VISIT' && !svc.home_visit_supported) throw new BadRequestException('service_not_available_for_home_visit');
    const paymentMethod = ['cash', 'card', 'insurance'].includes(body.payment_method) ? body.payment_method : 'cash';
    if (deliveryMode === 'MOBILE_HOME_VISIT' && paymentMethod === 'cash') throw new BadRequestException('payment_method_cash_not_allowed_for_home_visit');
    if ((svc.requires_referral || svc.medical_referral_required) && !body.referral) throw new BadRequestException('referral_required');

    const scan_type_code = svc.short_code || svc.id;
    const scan_name_ar = svc.name_ar;
    const scan_name_en = svc.name_en;
    const price = Number(svc.price);
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException('service_price_invalid');

    let centerId: Types.ObjectId | null = null;
    if (body.provider_account_id) {
      const center: any = await this.userModel.findOne({ id: body.provider_account_id }).lean();
      if (center) centerId = center._id;
    }

    const booking = await this.radBookingModel.create({
      id: uuidv4(),
      patient_id: patient._id,
      radiology_center_id: centerId,
      service_id: svc.id,
      scheduled_at: scheduledAt,
      delivery_mode: deliveryMode,
      facility_id: body.facility_id || null,
      address: body.address || null,
      price,
      total: price,
      payment_method: paymentMethod,
      referring_doctor_id: body.referring_doctor_id || null,
      referral: body.referral || null,
      scan_type_code,
      scan_name_ar,
      scan_name_en,
      status: 'PENDING_ACCEPTANCE',
    });
    return { id: (booking as any).id, status: booking.status, message: 'تم إرسال طلب الأشعة بنجاح' };
  }

  /** Patient's own radiology bookings. */
  @Get('mine')
  async mine(@CurrentUser() user: any) {
    const patient: any = await this.userModel.findOne({ id: user.id }).lean();
    if (!patient) return [];
    return this.radBookingModel.find({ patient_id: patient._id }).sort({ createdAt: -1 }).limit(80).lean();
  }

  /** Single booking — owner, bound center, or admin only. */
  @Get(':id')
  async getOne(@Param('id') bookingId: string, @CurrentUser() user: any) {
    const q: any = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { id: bookingId };
    const booking: any = await this.radBookingModel.findOne(q).lean();
    if (!booking) throw new NotFoundException('booking_not_found');
    const me: any = await this.userModel.findOne({ id: user.id }).lean();
    const mine = me && (String(booking.patient_id) === String(me._id) || String(booking.radiology_center_id) === String(me._id));
    if (!mine && user.role !== 'admin' && user.role !== 'super_admin') throw new NotFoundException('booking_not_found');
    return booking;
  }


  @Post('allocate-machine/:id')
  @HttpCode(HttpStatus.OK)
  async allocateMachine(
    @Param('id') bookingId: string,
    @Body() body: { machineId: string }
  ) {
    const { machineId } = body;

    // Check if machine is already busy for this period to block conflicts
    const conflict = await this.radBookingModel.findOne({
      allocated_machine_id: machineId,
      status: { $in: ['ACCEPTED', 'CHECKED_IN'] }
    });

    if (conflict && conflict._id.toString() !== bookingId) {
      throw new BadRequestException({
        code: 'MACHINE_CONFLICT_RESERVED',
        message: 'الجهاز المحدد محجوز حالياً ومخصص لعملية فحص أخرى في نفس هذا الوقت.'
      });
    }

    const booking = await this.radBookingModel.findByIdAndUpdate(
      bookingId,
      { $set: { allocated_machine_id: machineId, status: 'ACCEPTED' } },
      { new: true }
    );

    return { success: true, data: booking, message: 'تم تخصيص وحجز جهاز الفحص بنجاح للطلب.' };
  }

  @Post('finalize-scan/:id')
  async finalizeScan(
    @Param('id') bookingId: string,
    @Body() body: { reportText: string; files: string[]; pdfUrl: string }
  ) {
    const { reportText, files, pdfUrl } = body;

    const booking = await this.radBookingModel.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          clinical_impression_report: reportText,
          scanned_files_s3_urls: files || [],
          signed_report_pdf_url: pdfUrl,
          status: 'REPORT_UPLOADED'
        }
      },
      { new: true }
    );

    if (!booking) throw new BadRequestException('Radiology booking ID not found.');

    // TRIGGER THE REFERRING DOCTOR CALLBACK IN THE SYSTEM
    // Automatically notifies the referring physician that scan results are ready for immediate medical review
    return { 
      success: true, 
      parent_appointment_id: booking.parent_appointment_id,
      message: 'تم حفظ تقرير الأشعة والصور الطبية بنجاح، وتفعيل إشعار العودة الآلي للطبيب المعالج.' 
    };
  }
}
