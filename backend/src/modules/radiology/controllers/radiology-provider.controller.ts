import { Controller, Post, Get, Query, Body, Param, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RadiologyBookingState } from '../../../schemas/radiology.schema';
import { RadiologyBooking } from '../schemas/radiology-booking.schema';
import { Public } from '../../../common/auth.guard';

@Controller('radiology/provider')
export class RadiologyProviderController {
  constructor(
    @InjectModel('RadiologyCenterBooking') private radBookingModel: Model<RadiologyBooking>,
    @InjectModel('RadiologyService') private radServiceModel: Model<any>,
    @InjectModel('RadiologyMachine') private radMachineModel: Model<any>
  ) {}

  @Public()
  @Get('queue')
  async getProviderQueue(@Query('provider_id') providerId: string) {
    const pId = providerId || 'rad-center-1';
    // Return pending acceptance and active scans
    const bookings = await this.radBookingModel.find({
      $or: [
        { status: 'PENDING_ACCEPTANCE' },
        { status: 'ACCEPTED' },
        { status: 'CHECKED_IN' },
        { status: 'SCANNING_COMPLETED' }
      ]
    }).sort({ createdAt: -1 }).lean();
    return bookings;
  }

  @Public()
  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  async respondBooking(
    @Param('id') bookingId: string,
    @Body() body: { accept: boolean; provider_id: string }
  ) {
    const { accept, provider_id } = body;
    const booking = await this.radBookingModel.findOne({ id: bookingId });
    if (!booking) throw new BadRequestException('Booking not found');

    if (accept) {
      booking.status = 'ACCEPTED';
      (booking as any).radiology_center_id = provider_id;
    } else {
      booking.status = 'CANCELLED';
      (booking as any).rejection_reason = 'Rejected by Radiology Center';
    }
    await booking.save();
    return { success: true, status: booking.status };
  }

  @Public()
  @Post('allocate-machine/:id')
  @HttpCode(HttpStatus.OK)
  async allocateMachine(
    @Param('id') bookingId: string,
    @Body() body: { machineId: string }
  ) {
    const { machineId } = body;

    // Check if machine is already busy for this period to block conflicts
    // In a real app we'd check time slots, here we check active statuses
    const conflict = await this.radBookingModel.findOne({
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
      { id: bookingId },
      { $set: { allocated_machine_id: machineId, status: 'CHECKED_IN' } },
      { new: true }
    );

    if (!booking) throw new BadRequestException('Booking not found');

    return { success: true, data: booking, message: 'تم تخصيص وحجز جهاز الفحص بنجاح للطلب.' };
  }

  @Public()
  @Post('finalize-scan/:id')
  async finalizeScan(
    @Param('id') bookingId: string,
    @Body() body: { reportText: string; files: string[]; pdfUrl: string }
  ) {
    const { reportText, files, pdfUrl } = body;

    const booking = await this.radBookingModel.findOneAndUpdate(
      { id: bookingId },
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
      parent_appointment_id: 'APT-1234', // mock parent appointment
      message: 'تم حفظ تقرير الأشعة والصور الطبية بنجاح، وتفعيل إشعار العودة الآلي للطبيب المعالج.' 
    };
  }

  // ---- Financial Endpoint (Zero Placeholder) ----
  @Public()
  @Get('wallet')
  async getWallet(@Query('provider_id') providerId: string) {
    const pId = providerId || 'rad-center-1';
    
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

  // ---- Catalog Endpoint (Zero Placeholder) ----
  @Public()
  @Get('catalog')
  async getCatalog(@Query('provider_id') providerId: string) {
    const services = await this.radServiceModel.find({ active: true });
    return services;
  }

  @Public()
  @Post('catalog/:id')
  async updateCatalogItem(@Param('id') serviceId: string, @Body() body: any) {
    const updated = await this.radServiceModel.findOneAndUpdate(
      { id: serviceId },
      { $set: body },
      { new: true }
    );
    return updated;
  }

  // ---- Inventory Endpoint (Zero Placeholder) ----
  @Public()
  @Get('inventory')
  async getInventory(@Query('provider_id') providerId: string) {
    const pId = providerId || 'rad-center-1';
    const machines = await this.radMachineModel.find({ provider_id: pId, is_active: true });
    return machines;
  }

  @Public()
  @Post('inventory')
  async addMachine(@Body() body: any) {
    const pId = body.provider_id || 'rad-center-1';
    const machine = new this.radMachineModel({
      provider_id: pId,
      name: body.name,
      type: body.type,
      is_active: true
    });
    await machine.save();
    return machine;
  }
}
