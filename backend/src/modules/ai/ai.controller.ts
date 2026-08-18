import { Body, Controller, Post, Get, Param, Query, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { AiGatewayService } from './ai-gateway.service';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private svc: AiService, private gateway: AiGatewayService) {}

  @Get('config')
  @Roles(UserRole.ADMIN)
  getConfig() {
    return this.svc.getAiConfig();
  }

  @Post('config')
  @Roles(UserRole.ADMIN)
  updateConfig(@Body() body: any) {
    return this.svc.updateAiConfig(body);
  }

  /** AI Gateway admin: full provider registry + mode. */
  @Get('admin/gateway')
  @Roles(UserRole.ADMIN)
  gatewayStatus() {
    return this.gateway.listProviders();
  }

  /** Admin: enable/disable/rekey/re-model/re-priority a provider. */
  @Post('admin/gateway/provider/:key')
  @Roles(UserRole.ADMIN)
  updateProvider(@Param('key') key: any, @Body() body: any) {
    return this.gateway.updateProvider(key, body);
  }

  /** Admin: auto fallback & round-robin OR manual pinned provider. */
  @Post('admin/gateway/mode')
  @Roles(UserRole.ADMIN)
  setMode(@Body() body: { mode: 'auto' | 'manual'; pinned?: any }) {
    return this.gateway.setMode(body?.mode || 'auto', body?.pinned);
  }

  /** Admin: usage/token report per provider+model+feature (with fallback counts). */
  @Get('admin/usage')
  @Roles(UserRole.ADMIN)
  usage(@Query('days') days?: string) {
    return this.gateway.usageReport(parseInt(days || '7'));
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('triage')
  triage(@Req() req: any, @Body() body: any) {
    return this.svc.triage(body, req.user?.id);
  }

  @Get('triage/history')
  triageHistory(@Req() req: any, @Query('limit') limit?: string) {
    return this.svc.triageHistory(req.user?.id, limit === undefined ? 50 : Number(limit));
  }

  @Post('voice-to-order')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('audio', {
    limits: { fileSize: 10 * 1024 * 1024 }, // E5-F5: 10MB cap
    fileFilter: (req, file, cb) => {
      if (!/\.(mp3|m4a|wav|ogg|webm|aac|flac)$/i.test(file.originalname || '')) {
        return cb(new BadRequestException('audio_files_only'), false);
      }
      cb(null, true);
    },
  }))
  voice(@UploadedFile() file: any, @Body() body: { transcript?: string }) {
    if (file) {
      return this.svc.voiceToOrderFile(file.buffer);
    }
    return this.svc.voiceToOrder(body.transcript || '');
  }

  @Throttle({ default: { limit: 15, ttl: 60000 } }) // E5-F4 paid AI quota
  @Post('prescription-ocr')
  ocr(@Body() body: { image_base64?: string; imageBase64?: string }) {
    const base64 = body.image_base64 || body.imageBase64 || '';
    return this.svc.prescriptionOcr(base64);
  }

  @Post('parse-excel')
  @UseInterceptors(FileInterceptor('document', {
    limits: { fileSize: 10 * 1024 * 1024 }, // E5-F5: 10MB cap
    fileFilter: (req, file, cb) => {
      if (!/\.(xls|xlsx|csv)$/i.test(file.originalname || '')) {
        return cb(new BadRequestException('spreadsheet_files_only'), false);
      }
      cb(null, true);
    },
  }))
  parseExcel(@UploadedFile() file: any) {
    if (!file) throw new Error('No file uploaded');
    return this.svc.parseExcel(file.buffer);
  }

  @Throttle({ default: { limit: 15, ttl: 60000 } }) // E5-F4 paid AI quota
  @Post('copilot/suggest')
  copilotSuggest(@Body() body: { notes: string }) {
    return this.svc.copilotSuggest(body.notes || '');
  }

  /** OCR + bilingual translation of a prescription image — uses GEMINI_KEY_OCR */
  @Throttle({ default: { limit: 15, ttl: 60000 } }) // E5-F4 paid AI quota
  @Post('ocr-translate')
  ocrTranslate(@Body() body: { image_base64: string; target_lang?: string }) {
    return this.svc.ocrTranslate(body.image_base64 || '', body.target_lang || 'ar');
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('skin-analysis')
  skinAnalysis(@Req() req: any, @Body() body: any) {
    return this.svc.skinAnalysis(body, req.user?.id);
  }

  @Post('medicine-image-search')
  medicineImageSearch(@Body() body: { image_base64: string }) {
    return this.svc.medicineImageSearch(body.image_base64);
  }

  @Post('barcode-lookup')
  barcodeLookup(@Body() body: { code: string }) {
    return this.svc.barcodeLookup(body.code);
  }

  @Post('analyze-meal')
  analyzeMeal(@Body() body: { query: string; image_base64?: string }) {
    return this.svc.analyzeMeal(body.query || '', body.image_base64);
  }

  /**
   * Automated clinical report interpretation is intentionally unavailable until
   * a clinician-governed review workflow is introduced.
   */
  @Post('analyze-report')
  analyzeReport() {
    return this.svc.analyzeReportForPatient();
  }

  /** EPIC4/S21: AI weekly exercise plan (goal/level/days/location). */
  @Post('generate-exercise-plan')
  generateExercisePlan(@Body() body: { goal?: string; level?: string; days_per_week?: number; location?: string; notes?: string }) {
    return this.svc.generateExercisePlan(body || {});
  }

  @Post('generate-diet-plan')
  generateDietPlan(@Body() body: {
    goal: string;
    gender: string;
    weight: number;
    height: number;
    age: number;
    targetWeight: number;
    activity: string;
    diet: string;
    allergies: string;
  }) {
    return this.svc.generateDietPlan(body);
  }
}

