// @ts-nocheck
import { Body, Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private svc: AiService) {}

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

  @Public()
  @Post('triage')
  triage(@Body() body: any) {
    return this.svc.triage(body);
  }

  @Post('voice-to-order')
  @UseInterceptors(FileInterceptor('audio'))
  voice(@UploadedFile() file: any, @Body() body: { transcript?: string }) {
    if (file) {
      return this.svc.voiceToOrderFile(file.buffer);
    }
    return this.svc.voiceToOrder(body.transcript || '');
  }

  @Post('prescription-ocr')
  ocr(@Body() body: { image_base64?: string; imageBase64?: string }) {
    const base64 = body.image_base64 || body.imageBase64 || '';
    return this.svc.prescriptionOcr(base64);
  }

  @Post('parse-excel')
  @UseInterceptors(FileInterceptor('document'))
  parseExcel(@UploadedFile() file: any) {
    if (!file) throw new Error('No file uploaded');
    return this.svc.parseExcel(file.buffer);
  }

  @Post('copilot/suggest')
  copilotSuggest(@Body() body: { notes: string }) {
    return this.svc.copilotSuggest(body.notes || '');
  }

  @Post('triage/chat')
  triageChat(@Body() body: { messages: { role: 'user' | 'assistant' | 'system'; content: string }[] }) {
    return this.svc.triageChat(body.messages || []);
  }

  /** OCR + bilingual translation of a prescription image — uses GEMINI_KEY_OCR */
  @Post('ocr-translate')
  ocrTranslate(@Body() body: { image_base64: string; target_lang?: string }) {
    return this.svc.ocrTranslate(body.image_base64 || '', body.target_lang || 'ar');
  }

  @Post('skin-analysis')
  skinAnalysis(@Body() body: { image_base64: string; area?: string }) {
    return this.svc.skinAnalysis(body.image_base64, body.area);
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

