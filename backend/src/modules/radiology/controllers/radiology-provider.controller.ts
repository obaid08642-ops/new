import { Controller, Post, Get, Query, Body, Param, BadRequestException, ForbiddenException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RadiologyBookingState } from '../../../schemas/radiology.schema';
import { RadiologyBooking } from '../schemas/radiology-booking.schema';
import { CurrentUser, JwtAuthGuard } from '../../../common/auth.guard';
@Controller('radiology/provider')
@UseGuards(JwtAuthGuard)
export class RadiologyProviderController {
  constructor(
    @InjectModel('RadiologyCenterBooking') private radBookingModel: Model<RadiologyBooking>,
    @InjectModel('RadiologyService') private radServiceModel: Model<any>,
    @InjectModel('RadiologyMachine') private radMachineModel: Model<any>
  ) {}

  @Get('queue')
  async getProviderQueue(@CurrentUser() user: any, @Query('provider_id') providerId?: string) {
    const pId = this.resolveProviderId(user, providerId);
    // Return pending acceptance and active scans
    const bookings = await this.radBookingModel.find({
      radiology_center_id: pId,
      $or: [
        { status: 'PENDING_ACCEPTANCE' },
        { status: 'ACCEPTED' },
        { status: 'CHECKED_IN' },
        { status: 'SCANNING_COMPLETED' }
      ]
    }).sort({ createdAt: -1 }).lean();
    return bookings;
  }

  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  async respondBooking(
    @CurrentUser() user: any,
    @Param('id') bookingId: string,
    @Body() body: { accept: boolean }
  ) {
    const { accept } = body;
    const booking = await this.radBookingModel.findOne(this.bookingScope(user, bookingId));
    if (!booking) throw new BadRequestException('Booking not found');

    if (accept) {
      booking.status = 'ACCEPTED';
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
    @CurrentUser() user: any,
    @Param('id') bookingId: string,
    @Body() body: { machineId: string }
  ) {
    const { machineId } = body;

    // Check if machine is already busy for this period to block conflicts
    // In a real app we'd check time slots, here we check active statuses
    const conflict = await this.radBookingModel.findOne({
      radiology_center_id: this.resolveProviderId(user),
      allocated_machine_id: machineId,
      status: { $in: ['ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED'] }
    });

    if (conflict && conflict.id !== bookingId) {
      throw new BadRequestException({
        code: 'MACHINE_CONFLICT_RESERVED',
        message: 'هذا الجهاز محجوز حالياً لهذه الفترة الزمنية.'
      });
    }

    const booking = await this.radBookingModel.findOneAndUpdate(
      this.bookingScope(user, bookingId),
      { $set: { allocated_machine_id: machineId, status: 'CHECKED_IN' } },
      { new: true }
    );

    if (!booking) throw new BadRequestException('Booking not found');

    return { success: true, data: booking, message: 'تم تخصيص وحجز جهاز الفحص بنجاح للطلب.' };
  }

  @Post('finalize-scan/:id')
  async finalizeScan(
    @CurrentUser() user: any,
    @Param('id') bookingId: string,
    @Body() body: { reportText: string; files: string[]; pdfUrl: string }
  ) {
    const { reportText, files, pdfUrl } = body;

    const booking = await this.radBookingModel.findOneAndUpdate(
      this.bookingScope(user, bookingId),
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

    return { 
      success: true, 
      parent_appointment_id: (booking as any).parent_appointment_id?.toString?.() ?? null,
      message: 'تم حفظ تقرير الأشعة والصور الطبية بنجاح.'
    };
  }

  @Get('wallet')
  async getWallet(@CurrentUser() user: any, @Query('provider_id') providerId?: string) {
    const pId = this.resolveProviderId(user, providerId);
    
    // Sum total completed/published for gross revenue and insurance
    const completedBookings = await this.radBookingModel.find({
      radiology_center_id: pId,
      status: { $in: ['SCANNING_COMPLETED', 'REPORT_UPLOADED'] }
    });

    let grossRevenue = 0;
    let insuranceClaims = 0;
    
    const transactions = [];

    completedBookings.forEach(b => {
      const bAny = b as any;
      if (bAny.payment_method === 'insurance') {
        insuranceClaims += bAny.total_price || bAny.total || 0;
        transactions.push({ id: b.id, date: bAny.updatedAt, amount: bAny.total_price || bAny.total, type: 'INSURANCE_CLAIM_APPROVED', title: 'مطالبة تأمين معتمدة - ' + (b.scan_name_ar || 'فحص') });
      } else {
        grossRevenue += bAny.total_price || bAny.total || 0;
        transactions.push({ id: b.id, date: bAny.updatedAt, amount: bAny.total_price || bAny.total, type: 'CASH_SCAN', title: 'دفع نقدي - ' + (b.scan_name_ar || 'فحص') });
      }
    });

    const deductedCommissions = (grossRevenue + insuranceClaims) * 0.10; // 10% platform fee

    return {
      grossRevenue,
      insuranceClaims,
      deductedCommissions,
      transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }

  @Get('catalog')
  async getCatalog(@CurrentUser() user: any) {
    this.resolveProviderId(user);
    const services = await this.radServiceModel.find({ active: true });
    return services;
  }

  @Post('catalog/:id')
  async updateCatalogItem(@CurrentUser() user: any, @Param('id') serviceId: string, @Body() body: any) {
    if (!this.isAdmin(user)) throw new ForbiddenException('Radiology catalog changes require administrative approval');
    const updated = await this.radServiceModel.findOneAndUpdate(
      { id: serviceId },
      { $set: body },
      { new: true }
    );
    return updated;
  }

  @Get('inventory')
  async getInventory(@CurrentUser() user: any, @Query('provider_id') providerId?: string) {
    const pId = this.resolveProviderId(user, providerId);
    const machines = await this.radMachineModel.find({ provider_id: pId, is_active: true });
    return machines;
  }

  @Post('inventory')
  async addMachine(@CurrentUser() user: any, @Body() body: any) {
    const pId = this.resolveProviderId(user);
    const machine = new this.radMachineModel({
      provider_id: pId,
      name: body.name,
      type: body.type,
      is_active: true
    });
    await machine.save();
    return machine;
  }

  private bookingScope(user: any, bookingId: string) {
    const scope: Record<string, unknown> = { id: bookingId };
    if (!this.isAdmin(user)) scope.radiology_center_id = this.resolveProviderId(user);
    return scope;
  }

  private resolveProviderId(user: any, requestedProviderId?: string): string {
    if (this.isAdmin(user)) {
      if (!requestedProviderId) throw new BadRequestException('provider_id is required for administrative radiology operations');
      return requestedProviderId;
    }
    if (user?.role !== 'radiology' && user?.provider_type !== 'radiology') {
      throw new ForbiddenException('Radiology provider access is required');
    }
    const providerId = user?.provider_account_id || user?.provider_profile_id || user?.id;
    if (!providerId) throw new ForbiddenException('Radiology provider identity is missing from the token');
    return String(providerId);
  }

  private isAdmin(user: any): boolean {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }
}
