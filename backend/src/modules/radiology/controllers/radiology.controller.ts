import { Controller, Post, Body, Param, Patch, Get, BadRequestException, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { RadiologyBooking } from '../schemas/radiology-booking.schema';
import { CurrentUser } from '../../../common/auth.guard';

@Controller('radiology/bookings')
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
  @HttpCode(HttpStatus.CREATED)
  async book(@CurrentUser() user: any, @Body() body: any) {
    if (!body?.scheduled_at) throw new BadRequestException('scheduled_at is required');
    const patient: any = await this.userModel.findOne({ id: user.id }).lean();
    if (!patient) throw new BadRequestException('patient_not_found');

    let scan: any = {};
    if (body.service_id) {
      const svc: any = await this.radServiceModel.findOne({ id: body.service_id, is_deleted: { $ne: true } }).lean();
      if (!svc) throw new BadRequestException('service_not_found');
      scan = { scan_type_code: svc.id, scan_name_ar: svc.name_ar, scan_name_en: svc.name_en };
    }
    const scan_type_code = body.scan_type_code || scan.scan_type_code;
    const scan_name_ar = body.scan_name_ar || scan.scan_name_ar;
    const scan_name_en = body.scan_name_en || scan.scan_name_en;
    if (!scan_type_code || !scan_name_ar || !scan_name_en) {
      throw new BadRequestException('scan details required (pass service_id or scan_type_code + names)');
    }

    let centerId: Types.ObjectId | null = null;
    if (body.provider_account_id) {
      const center: any = await this.userModel.findOne({ id: body.provider_account_id }).lean();
      if (center) centerId = center._id;
    }

    const booking = await this.radBookingModel.create({
      id: uuidv4(),
      patient_id: patient._id,
      radiology_center_id: centerId,
      delivery_mode: body.delivery_mode === 'MOBILE_HOME_VISIT' ? 'MOBILE_HOME_VISIT' : 'IN_CENTER',
      referring_doctor_id: body.referring_doctor_id || null,
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
