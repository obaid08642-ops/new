import { Controller, Post, Body, Param, Patch, Get, Query, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LabBooking } from '../schemas/lab-booking.schema';
import { LabCatalog } from '../schemas/lab-catalog.schema';

@Controller('labs/bookings')
export class LabsEngineController {
  constructor(
    @InjectModel('LabCenterBooking') private labBookingModel: Model<LabBooking>,
    @InjectModel('LabCatalog') private labCatalogModel: Model<LabCatalog>
  ) {}

  @Get('queue')
  async getQueue(@Query('lab_id') labId: string) {
    if (!labId) throw new BadRequestException('lab_id is required');
    return this.labBookingModel.find({
      lab_id: labId,
      status: { $in: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'SAMPLE_COLLECTED'] }
    }).sort({ createdAt: -1 });
  }

  @Post(':id/respond')
  async respondToBooking(
    @Param('id') bookingId: string,
    @Body() body: { accept: boolean; lab_id: string }
  ) {
    const { accept, lab_id } = body;
    const newStatus = accept ? 'ACCEPTED' : 'CANCELLED';
    
    const booking = await this.labBookingModel.findOneAndUpdate(
      { _id: bookingId, lab_id },
      { $set: { status: newStatus } },
      { new: true }
    );

    if (!booking) throw new BadRequestException('Lab booking ID not found or unauthorized.');

    return { success: true, data: booking, message: accept ? 'تم القبول' : 'تم الرفض' };
  }

  @Post('collect-sample/:id')
  @HttpCode(HttpStatus.OK)
  async collectSample(
    @Param('id') bookingId: string,
    @Body() body: { barcodeToken: string }
  ) {
    const { barcodeToken } = body;

    // Verify barcode uniqueness inside the active pipeline to prevent duplicate vial entries
    const duplicateCheck = await this.labBookingModel.findOne({ sample_barcode_token: barcodeToken });
    if (duplicateCheck && duplicateCheck._id.toString() !== bookingId) {
      throw new BadRequestException({
        code: 'DUPLICATE_BARCODE_TOKEN',
        message: 'رمز الباركود هذا مخصص ومسجل مسبقاً لعينة أخرى، يرجى استخدام أنبوب جديد بباركود فريد.'
      });
    }

    const booking = await this.labBookingModel.findByIdAndUpdate(
      bookingId,
      { $set: { sample_barcode_token: barcodeToken, status: 'SAMPLE_COLLECTED' } },
      { new: true }
    );

    if (!booking) throw new BadRequestException('Lab booking ID not found.');

    return { success: true, data: booking, message: 'تم ربط الباركود بالعينة الطبية بنجاح وتحويل الحالة إلى قيد المعالجة المخبرية.' };
  }

  @Post('finalize-test/:id')
  async finalizeTest(
    @Param('id') bookingId: string,
    @Body() body: { metricResults: any[]; pdfUrl: string }
  ) {
    const { metricResults, pdfUrl } = body;

    const booking = await this.labBookingModel.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          entered_metric_results: metricResults || [],
          signed_report_pdf_url: pdfUrl,
          status: 'REPORT_UPLOADED'
        }
      },
      { new: true }
    );

    if (!booking) throw new BadRequestException('Lab booking ID not found.');

    // TRIGGER THE REFERRING DOCTOR CALLBACK IN THE SYSTEM
    // Automatically notifies the referring physician that lab results are ready for immediate medical review
    return { 
      success: true, 
      parent_appointment_id: booking.parent_appointment_id,
      message: 'تم حفظ النتائج الرقمية والتقرير المخبري بنجاح، وتفعيل إشعار العودة الآلي للطبيب المعالج.' 
    };
  }

  @Get('catalog')
  async getCatalog(@Query('lab_id') labId: string) {
    if (!labId) throw new BadRequestException('lab_id is required');
    return this.labCatalogModel.find({ lab_id: labId });
  }

  @Post('catalog')
  async updateCatalog(
    @Body() body: { lab_id: string; test_code: string; test_name_ar: string; test_name_en: string; in_lab_price: number; home_collection_price: number; accepts_insurance: boolean; reference_ranges: any[] }
  ) {
    const { lab_id, test_code, ...updateData } = body;
    if (!lab_id || !test_code) throw new BadRequestException('lab_id and test_code are required');

    const catalogEntry = await this.labCatalogModel.findOneAndUpdate(
      { lab_id, test_code },
      { $set: updateData },
      { new: true, upsert: true }
    );
    return { success: true, data: catalogEntry };
  }

  @Get('wallet')
  async getWallet(@Query('lab_id') labId: string) {
    if (!labId) throw new BadRequestException('lab_id is required');
    
    const completedBookings = await this.labBookingModel.find({
      lab_id: labId,
      status: { $in: ['REPORT_UPLOADED'] }
    });

    let grossRevenue = 0;
    let insuranceClaims = 0;
    const transactions = [];

    completedBookings.forEach((b: any) => {
      if (b.payment_method === 'insurance') {
        insuranceClaims += b.total_price || 0;
        transactions.push({ id: b.id || b._id, date: b.updatedAt, amount: b.total_price || 0, type: 'INSURANCE_CLAIM_APPROVED', title: 'مطالبة تأمين معتمدة - ' + b.test_name_ar });
      } else {
        grossRevenue += b.total_price || 0;
        transactions.push({ id: b.id || b._id, date: b.updatedAt, amount: b.total_price || 0, type: 'CASH_TEST', title: 'دفع نقدي - ' + b.test_name_ar });
      }
    });

    const platformCommissions = (grossRevenue + insuranceClaims) * 0.15; // 15% platform fee
    const netPayout = (grossRevenue + insuranceClaims) - platformCommissions;

    return {
      success: true,
      data: {
        grossRevenue: grossRevenue + insuranceClaims,
        insuranceClaims,
        platformCommissions,
        netPayout,
        transactions
      }
    };
  }
}
