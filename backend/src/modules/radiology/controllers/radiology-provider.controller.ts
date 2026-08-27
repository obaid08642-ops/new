import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Param,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RadiologyBooking } from '../schemas/radiology-booking.schema';
import { CurrentUser, JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';

/** Bookings are referenced by their public UUID (`id`); mongo `_id` also accepted. */
function bookingQuery(bookingId: string): any {
  return Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { id: bookingId };
}

@Controller('radiology/provider')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.RADIOLOGY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class RadiologyProviderController {
  constructor(
    @InjectModel('RadiologyCenterBooking') private radBookingModel: Model<RadiologyBooking>,
    @InjectModel('RadiologyService') private radServiceModel: Model<any>,
    @InjectModel('RadiologyMachine') private radMachineModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  private async centerFor(user: any): Promise<any> {
    return this.userModel.findOne({ id: user?.id }).lean();
  }

  private isAdmin(user: any): boolean {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  }

  private async assertBookingAccess(booking: any, user: any, allowPending = false): Promise<any> {
    if (!booking) throw new BadRequestException('Booking not found');
    if (this.isAdmin(user)) return null;
    const center: any = await this.centerFor(user);
    if (!center) throw new ForbiddenException('Radiology provider account not found');
    const assigned = booking.radiology_center_id && String(booking.radiology_center_id) === String(center._id);
    if (!assigned && !(allowPending && booking.status === 'PENDING_ACCEPTANCE')) {
      throw new ForbiddenException('Booking is not assigned to this radiology center');
    }
    return center;
  }

  @Get('queue')
  async getProviderQueue(@Query('provider_id') _providerId: string, @CurrentUser() user: any) {
    if (this.isAdmin(user)) {
      return this.radBookingModel.find({
        status: { $in: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED'] },
      }).sort({ createdAt: -1 }).lean();
    }
    const center: any = await this.centerFor(user);
    if (!center) throw new ForbiddenException('Radiology provider account not found');
    return this.radBookingModel.find({
      $or: [
        { status: 'PENDING_ACCEPTANCE' },
        { radiology_center_id: center._id, status: { $in: ['ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED'] } },
      ],
    }).sort({ createdAt: -1 }).lean();
  }

  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  async respondBooking(
    @Param('id') bookingId: string,
    @Body() body: { accept: boolean },
    @CurrentUser() user: any,
  ) {
    const booking = await this.radBookingModel.findOne(bookingQuery(bookingId));
    await this.assertBookingAccess(booking, user, true);
    if (typeof body?.accept !== 'boolean') throw new BadRequestException('accept (boolean) is required');

    if (body.accept) {
      if (this.isAdmin(user)) throw new ForbiddenException('Admin must not claim a provider booking');
      const center: any = await this.centerFor(user);
      if (!center) throw new ForbiddenException('Radiology provider account not found');
      booking.status = 'ACCEPTED';
      (booking as any).radiology_center_id = center._id;
    } else {
      booking.status = 'CANCELLED';
      (booking as any).rejection_reason = 'Rejected by Radiology Center';
    }
    await booking.save();
    return { success: true, status: booking.status };
  }

  @Post('allocate-machine/:id')
  @HttpCode(HttpStatus.OK)
  async allocateMachine(
    @Param('id') bookingId: string,
    @Body() body: { machineId: string },
    @CurrentUser() user: any,
  ) {
    const { machineId } = body || ({} as any);
    if (!machineId) throw new BadRequestException('machineId is required');
    const booking = await this.radBookingModel.findOne(bookingQuery(bookingId));
    await this.assertBookingAccess(booking, user);

    const conflict = await this.radBookingModel.findOne({
      allocated_machine_id: machineId,
      status: { $in: ['ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED'] },
    });
    if (conflict && String(conflict.id) !== String(bookingId)) {
      throw new BadRequestException({
        code: 'MACHINE_CONFLICT_RESERVED',
        message: 'هذا الجهاز محجوز حالياً لهذه الفترة الزمنية.',
      });
    }

    const updatedBooking = await this.radBookingModel.findOneAndUpdate(
      bookingQuery(bookingId),
      { $set: { allocated_machine_id: machineId, status: 'CHECKED_IN' } },
      { new: true },
    );
    if (!updatedBooking) throw new BadRequestException('Booking not found');
    return { success: true, data: updatedBooking, message: 'تم تخصيص وحجز جهاز الفحص بنجاح للطلب.' };
  }

  @Post('finalize-scan/:id')
  async finalizeScan(
    @Param('id') bookingId: string,
    @Body() body: { reportText: string; files: string[]; pdfUrl: string },
    @CurrentUser() user: any,
  ) {
    const existing = await this.radBookingModel.findOne(bookingQuery(bookingId));
    await this.assertBookingAccess(existing, user);
    const { reportText, files, pdfUrl } = body || ({} as any);
    if (!reportText || !pdfUrl) throw new BadRequestException('reportText and pdfUrl are required');
    throw new BadRequestException('legacy_raw_report_upload_disabled_use_secure_storage_flow');

    const booking = await this.radBookingModel.findOneAndUpdate(
      bookingQuery(bookingId),
      {
        $set: {
          clinical_impression_report: reportText,
          scanned_files_s3_urls: Array.isArray(files) ? files : [],
          signed_report_pdf_url: pdfUrl,
          status: 'REPORT_UPLOADED',
        },
      },
      { new: true },
    );
    if (!booking) throw new BadRequestException('Radiology booking ID not found.');
    return {
      success: true,
      referring_doctor_id: booking.referring_doctor_id || null,
      message: 'تم حفظ تقرير الأشعة والصور الطبية بنجاح، وتفعيل إشعار العودة الآلي للطبيب المعالج.',
    };
  }

  @Get('wallet')
  async getWallet(@Query('provider_id') _providerId: string, @CurrentUser() user: any) {
    const center: any = await this.centerFor(user);
    const centerId = this.isAdmin(user) ? undefined : center?._id;
    if (!this.isAdmin(user) && !center) throw new ForbiddenException('Radiology provider account not found');
    const completedBookings = await this.radBookingModel.find({
      ...(centerId ? { radiology_center_id: centerId } : {}),
      status: { $in: ['SCANNING_COMPLETED', 'REPORT_UPLOADED'] },
    });

    let grossRevenue = 0;
    let insuranceClaims = 0;
    const transactions: any[] = [];
    completedBookings.forEach((b: any) => {
      if (b.payment_method === 'insurance') {
        insuranceClaims += b.total_price || b.total || 0;
        transactions.push({ id: b.id, date: b.updatedAt, amount: b.total_price || b.total, type: 'INSURANCE_CLAIM_APPROVED', title: 'مطالبة تأمين معتمدة - ' + (b.scan_name_ar || 'فحص') });
      } else {
        grossRevenue += b.total_price || b.total || 0;
        transactions.push({ id: b.id, date: b.updatedAt, amount: b.total_price || b.total, type: 'CASH_SCAN', title: 'دفع نقدي - ' + (b.scan_name_ar || 'فحص') });
      }
    });
    const deductedCommissions = (grossRevenue + insuranceClaims) * 0.10;
    return {
      grossRevenue,
      insuranceClaims,
      deductedCommissions,
      transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }

  @Get('catalog')
  async getCatalog(@Query('provider_id') _providerId: string) {
    return this.radServiceModel.find({ active: true, is_deleted: { $ne: true } });
  }

  @Post('catalog/:id')
  async updateCatalogItem(@Param('id') serviceId: string, @Body() body: any, @CurrentUser() user: any) {
    if (!this.isAdmin(user)) throw new ForbiddenException('Only administrators may modify the global radiology catalog');
    const allowed = ['active', 'cash_availability', 'home_visit_supported', 'estimated_duration_minutes', 'price'];
    const patch = Object.fromEntries(Object.entries(body || {}).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(patch).length) throw new BadRequestException('No permitted catalog fields');
    return this.radServiceModel.findOneAndUpdate({ id: serviceId }, { $set: patch }, { new: true });
  }

  @Get('inventory')
  async getInventory(@Query('provider_id') _providerId: string, @CurrentUser() user: any) {
    const pId = this.isAdmin(user) ? undefined : user.id;
    if (!pId && !this.isAdmin(user)) throw new ForbiddenException('Radiology provider account not found');
    return this.radMachineModel.find({ ...(pId ? { provider_id: pId } : {}), is_active: true });
  }

  @Post('inventory')
  async addMachine(@Body() body: any, @CurrentUser() user: any) {
    if (this.isAdmin(user)) throw new ForbiddenException('Admin must not create provider inventory');
    if (!body?.name || !body?.type) throw new BadRequestException('name and type are required');
    const machine = new this.radMachineModel({ provider_id: user.id, name: body.name, type: body.type, is_active: true });
    await machine.save();
    return machine;
  }
}
