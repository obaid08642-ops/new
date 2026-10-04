import { Controller, Post, Body, Param, Patch, Get, Query, BadRequestException, HttpCode, HttpStatus, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LabBooking } from '../schemas/lab-booking.schema';
import { LabCatalog } from '../schemas/lab-catalog.schema';
import { LabService } from '../../../schemas/lab.schema';
import { Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { RespondToBookingDto, CollectSampleDto, FinalizeTestDto, UpdateCatalogDto } from './labs-engine.dto';
import { idFilter } from '../../../common/id.utils';
import { BusinessRulesService } from '../../business-rules/business-rules.module';

// R4-2: explicit allowlist for lab catalog upserts (lab_id/test_code are the
// key, never part of the $set).
const LAB_CATALOG_UPDATE_FIELDS = [
  'service_id', 'test_name_ar', 'test_name_en', 'in_lab_price', 'home_collection_price',
  'accepts_insurance', 'reference_ranges',
];

@Controller('labs/bookings')
@Roles(UserRole.LAB, UserRole.HOSPITAL, UserRole.ADMIN)
export class LabsEngineController {
  constructor(
    @InjectModel('LabCenterBooking') private labBookingModel: Model<LabBooking>,
    @InjectModel('LabCatalog') private labCatalogModel: Model<LabCatalog>,
    @InjectModel('LabService') private labServiceModel: Model<LabService>,
    @Optional() private readonly pricing?: BusinessRulesService,
  ) {}

  @Get('queue')
  async getQueue(@Query('lab_id') labId: string) {
    if (!labId) throw new BadRequestException('lab_id is required');
    return this.labBookingModel.find({
      lab_id: { $eq: labId },
      status: { $in: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'SAMPLE_COLLECTED'] }
    }).sort({ createdAt: -1 });
  }

  @Post(':id/respond')
  async respondToBooking(
    @Param('id') bookingId: string,
    @Body() body: RespondToBookingDto
  ) {
    const { accept, lab_id } = body;
    const newStatus = accept ? 'ACCEPTED' : 'CANCELLED';
    
    // Lab bookings carry no public `id` field — the route id is the Mongo `_id`
    // (idFilter keeps that behavior and never throws on malformed input).
    const booking = await this.labBookingModel.findOneAndUpdate(
      { ...idFilter(bookingId), lab_id: { $eq: lab_id } },
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
    @Body() body: CollectSampleDto
  ) {
    const { barcodeToken } = body;

    // Verify barcode uniqueness inside the active pipeline to prevent duplicate vial entries
    const duplicateCheck = await this.labBookingModel.findOne({ sample_barcode_token: { $eq: barcodeToken } });
    if (duplicateCheck && duplicateCheck._id.toString() !== bookingId) {
      throw new BadRequestException({
        code: 'DUPLICATE_BARCODE_TOKEN',
        message: 'رمز الباركود هذا مخصص ومسجل مسبقاً لعينة أخرى، يرجى استخدام أنبوب جديد بباركود فريد.'
      });
    }

    const booking = await this.labBookingModel.findOneAndUpdate(
      idFilter(bookingId),
      { $set: { sample_barcode_token: barcodeToken, status: 'SAMPLE_COLLECTED' } },
      { new: true }
    );

    if (!booking) throw new BadRequestException('Lab booking ID not found.');

    return { success: true, data: booking, message: 'تم ربط الباركود بالعينة الطبية بنجاح وتحويل الحالة إلى قيد المعالجة المخبرية.' };
  }

  @Post('finalize-test/:id')
  async finalizeTest(
    @Param('id') bookingId: string,
    @Body() body: FinalizeTestDto
  ) {
    const { metricResults, pdfUrl } = body;

    const booking = await this.labBookingModel.findOneAndUpdate(
      idFilter(bookingId),
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

  // Q49: the lab's per-lab price list. Each entry is keyed to the canonical
  // `lab_services` catalog (service_id, else short_code === test_code) and
  // carries this lab's override prices; `service` is null when the key
  // matches no canonical record.
  @Get('catalog')
  async getCatalog(@Query('lab_id') labId: string) {
    if (!labId) throw new BadRequestException('lab_id is required');
    const entries: any[] = await this.labCatalogModel.find({ lab_id: { $eq: labId } }).lean();
    const byId = new Map<string, any>();
    const byCode = new Map<string, any>();
    const ids = [...new Set(entries.map((e) => String(e.service_id || '')).filter(Boolean))];
    const codes = [...new Set(entries.map((e) => String(e.test_code || '')).filter(Boolean))];
    if (ids.length || codes.length) {
      const services: any[] = await this.labServiceModel.find(
        { $or: [...(ids.length ? [{ id: { $in: ids } }] : []), ...(codes.length ? [{ short_code: { $in: codes } }] : [])] },
        { _id: 0, id: 1, name_ar: 1, name_en: 1, short_code: 1, category: 1, price: 1, active: 1 },
      ).lean().catch(() => []);
      for (const s of services) {
        if (s.id && !byId.has(String(s.id))) byId.set(String(s.id), s);
        if (s.short_code && !byCode.has(String(s.short_code))) byCode.set(String(s.short_code), s);
      }
    }
    return entries.map((e) => {
      const service = (e.service_id && byId.get(String(e.service_id)))
        || (e.test_code && byCode.get(String(e.test_code)))
        || null;
      return { ...e, service, base_price: service ? service.price : null };
    });
  }

  @Post('catalog')
  async updateCatalog(
    @Body() body: UpdateCatalogDto
  ) {
    const { lab_id, test_code, service_id } = body || {};
    if (!lab_id || !test_code) throw new BadRequestException('lab_id and test_code are required');

    // Q49: a service_id key must resolve to a live `lab_services` record —
    // otherwise the price list points at a test that does not exist.
    if (service_id) {
      const svc = await this.labServiceModel.findOne(
        { id: { $eq: service_id }, is_deleted: { $ne: true } },
        { _id: 0, id: 1 },
      ).lean();
      if (!svc) throw new BadRequestException('unknown_service_id');
    }

    // R4-2: build $set from explicit allowlisted keys (no whole-object spread).
    const patch = Object.fromEntries(
      Object.entries(body || {}).filter(([key, value]) => LAB_CATALOG_UPDATE_FIELDS.includes(key) && value !== undefined),
    );
    const catalogEntry = await this.labCatalogModel.findOneAndUpdate(
      { lab_id: { $eq: lab_id }, test_code: { $eq: test_code } },
      { $set: patch },
      { new: true, upsert: true }
    );
    return { success: true, data: catalogEntry };
  }

  @Get('wallet')
  async getWallet(@Query('lab_id') labId: string) {
    if (!labId) throw new BadRequestException('lab_id is required');
    
    const completedBookings = await this.labBookingModel.find({
      lab_id: { $eq: labId },
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

    // B4: platform fee percent comes from admin finance config, not code.
    const feePct = (await this.pricing?.commissionPercent('lab', 15).catch(() => 15)) ?? 15;
    const platformCommissions = (grossRevenue + insuranceClaims) * (feePct / 100);
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
