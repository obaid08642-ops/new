import { Controller, Post, Body, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProcurementRequest } from '../schemas/procurement-request.schema';
import { ProcurementService } from '../services/procurement.service';
import { JwtAuthGuard, Roles, CurrentUser } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { Medicine } from '../../../schemas/medicine.schema';

/**
 * Pharmacy → warehouse procurement ("طلب عرض سعر من المستودع").
 * The pharmacy uploads a shortage list (file / scanned image / free text),
 * the AI gateway extracts item names, each name is matched against the live
 * medicine catalog, and the items land in a category-grouped cart
 * (أدوية / غير دوائية) before the request goes to the admin for a quotation.
 */
@Controller('pharmacy/procurement')
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(
    @InjectModel(ProcurementRequest.name) private procurementModel: Model<ProcurementRequest>,
    @InjectModel(Medicine.name) private medicineModel: Model<Medicine>,
    private readonly procurementService: ProcurementService,
    private readonly ai: AiGatewayService,
  ) {}

  /** Submit a B2B warehouse price-quote request — admin reviews it and issues a quotation. */
  @Post('submit-request')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createProcurementRequest(@CurrentUser() user: any, @Body() dto: any) {
    // Identity always comes from the verified token — never from the body (IDOR-safe).
    const items = (Array.isArray(dto.items) ? dto.items : []).slice(0, 500).map((it: any) => ({
      medicine_id: it.medicine_id && Types.ObjectId.isValid(it.medicine_id) ? new Types.ObjectId(it.medicine_id) : null,
      raw_name_string: String(it.raw_name_string || it.name || '').slice(0, 300),
      requested_quantity: Math.max(1, Math.min(Number(it.requested_quantity || it.quantity) || 1, 100000)),
      category_group: it.category_group === 'non_medical' ? 'non_medical' : 'medical',
      notes: it.notes ? String(it.notes).slice(0, 500) : undefined,
    })).filter((it: any) => it.raw_name_string);
    if (items.length === 0 && !dto.fileUrl) throw new BadRequestException('items_or_file_required');

    const request = await this.procurementModel.create({
      pharmacy_id: String(user.id),
      created_by: String(user.id),
      items,
      uploaded_file_url: dto.fileUrl ? String(dto.fileUrl).slice(0, 1000) : null,
      status: 'PENDING_ADMIN_REVIEW',
    });
    return { success: true, procurement_id: request._id, message: 'تم إرسال طلب النواقص بنجاح وجاري مراجعته من قبل إدارة المستودعات.' };
  }

  /** Pharmacy sees ONLY its own requests (ownership enforced via token id). */
  @Get('my-requests')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async listRequests(@CurrentUser() user: any) {
    const list = await this.procurementModel.find({ pharmacy_id: String(user.id) }).sort({ createdAt: -1 });
    return { success: true, data: list };
  }

  /** Pharmacy approves / cancels a quotation the admin issued. */
  @Post(':id/feedback')
  @Roles(UserRole.PHARMACY)
  async feedback(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.procurementService.submitPharmacyFeedback(user.id, id, {
      status: dto?.status,
      pharmacyFeedback: dto?.pharmacyFeedback,
    } as any);
  }

  /**
   * AI file/image analysis: extract item names (+quantities) from an uploaded
   * shortage list, then match each against the catalog and classify into
   * أدوية / غير دوائية so the pharmacy cart is pre-grouped.
   */
  @Post('analyze-file')
  @Roles(UserRole.PHARMACY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async analyzeFile(@CurrentUser() user: any, @Body() body: { file_base64?: string; mime_type?: string; text?: string }) {
    if (!body?.file_base64 && !body?.text) throw new BadRequestException('file_base64 or text is required');
    if (body.file_base64 && body.file_base64.length > 8_000_000) throw new BadRequestException('file too large (max ~6MB)');

    const prompt = [
      'أنت مساعد صيدلاني. استخرج من ' + (body.file_base64 ? 'هذه الصورة/المستند' : 'هذا النص') + ' قائمة الأصناف المطلوبة (أدوية أو مستلزمات).',
      'أرجع JSON فقط بهذا الشكل بدون أي نص إضافي:',
      '{"items":[{"name":"اسم الصنف كما ورد","quantity":10}]}',
      'إن لم تتضح الكمية اجعلها 1. لا تخترع أصنافاً غير موجودة في المصدر.',
    ].join('\n');

    const result = await this.ai.generate({
      prompt,
      feature: 'procurement_analyze',
      imageBase64: body.file_base64,
      mimeType: body.mime_type || 'image/jpeg',
    });

    // Parse the model JSON defensively — models sometimes wrap in prose/fences
    let extracted: { name: string; quantity: number }[] = [];
    try {
      const m = String(result.text || '').match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : result.text);
      if (Array.isArray(parsed?.items)) {
        extracted = parsed.items
          .filter((i: any) => i && i.name)
          .slice(0, 200)
          .map((i: any) => ({ name: String(i.name).slice(0, 300), quantity: Math.max(1, Number(i.quantity) || 1) }));
      }
    } catch { /* fall through with empty list — caller shows raw text */ }

    // Match each extracted name against the live catalog (Arabic/English, tolerant)
    const items = await Promise.all(extracted.map(async (it) => {
      const escaped = it.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const med: any = await this.medicineModel.findOne({
        is_deleted: { $ne: true },
        $or: [
          { name_ar: { $regex: escaped, $options: 'i' } },
          { name_en: { $regex: escaped, $options: 'i' } },
          { active_ingredient: { $regex: escaped, $options: 'i' } },
        ],
      }).lean();
      const categoryGroup = med && med.category && med.category !== 'medications' ? 'non_medical' : 'medical';
      return {
        raw_name_string: it.name,
        requested_quantity: it.quantity,
        matched: !!med,
        medicine_id: med?._id || null,
        medicine_name: med ? (med.name_ar || med.name_en) : null,
        category_group: categoryGroup, // medical = أدوية | non_medical = غير دوائية
      };
    }));

    return {
      ok: true,
      provider: result.provider,
      model: result.model,
      items,
      counts: {
        total: items.length,
        matched: items.filter(i => i.matched).length,
        medical: items.filter(i => i.category_group === 'medical').length,
        non_medical: items.filter(i => i.category_group === 'non_medical').length,
      },
    };
  }
}
