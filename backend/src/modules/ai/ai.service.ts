import { InternalServerErrorException, Injectable, Logger, Optional, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
import * as xlsx from 'xlsx';
import { AiGatewayService } from './ai-gateway.service';

/**
 * AI features service — ALL generation goes through the AI Gateway,
 * so the active provider (gemini/openai/openrouter/groq) is switched via
 * the AI_PROVIDER env var with zero code changes. Method signatures and
 * JSON-response contracts are unchanged for callers.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly gateway: AiGatewayService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  private get triageSessions() { return this.conn.collection('ai_triage_sessions'); }

  private cleanJson(text: string): string {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  private requirePatientId(patientId?: string): string {
    if (typeof patientId !== 'string' || !patientId.trim() || patientId === 'guest') {
      throw new BadRequestException('patient_identity_required');
    }
    return patientId;
  }

  private requiredText(value: unknown, field: string, maxLength: number): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
      throw new BadRequestException(`${field}_invalid`);
    }
    return value.trim();
  }

  private optionalText(value: unknown, field: string, maxLength: number): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || value.trim().length > maxLength) {
      throw new BadRequestException(`${field}_invalid`);
    }
    return value.trim();
  }

  private selectedValues(value: unknown, allowed: readonly string[], field: string, maxCount: number): string[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > maxCount || value.some((item) => typeof item !== 'string' || !allowed.includes(item))) {
      throw new BadRequestException(`${field}_invalid`);
    }
    return [...new Set(value)];
  }

  private async gen(feature: string, prompt: string): Promise<string> {
    const r = await this.gateway.generate({ prompt, feature });
    return r.text;
  }

  private async genVision(feature: string, prompt: string, base64: string, mimeType = 'image/jpeg'): Promise<string> {
    const r = await this.gateway.generate({ prompt, feature, imageBase64: base64, mimeType });
    return r.text;
  }

  async getAiConfig() {
    return this.gateway.listProviders();
  }

  async updateAiConfig(body: any) {
    // Runtime switching happens via AI_PROVIDER env; this endpoint reports
    // what would apply so the admin portal stays honest about it.
    return {
      success: true,
      note: 'المزود النشط يُغيَّر عبر متغير البيئة AI_PROVIDER (gemini|openai|openrouter|groq) — بدون تعديل كود',
      requested: body,
      current: await this.gateway.listProviders(),
    };
  }

  /**
   * Guided triage, not diagnosis. The care level is derived only from explicit
   * red flags selected by the patient; no model predicts a disease or treatment.
   */
  async triage(body: any, patientId?: string) {
    const ownerId = this.requirePatientId(patientId);
    const symptoms = this.requiredText(body?.symptoms, 'symptoms', 1000);
    const bodyRegion = this.optionalText(body?.body_region ?? body?.region, 'body_region', 80);
    const redFlags = this.selectedValues(body?.red_flags, [
      'chest_pain', 'breathing_difficulty', 'fainting_or_unresponsive', 'heavy_bleeding',
      'new_confusion', 'severe_allergic_reaction', 'severe_injury', 'none',
    ], 'red_flags', 8);
    if (redFlags.includes('none') && redFlags.length > 1) throw new BadRequestException('red_flags_invalid');

    const emergencyFlags = new Set(['chest_pain', 'breathing_difficulty', 'fainting_or_unresponsive', 'heavy_bleeding', 'new_confusion', 'severe_allergic_reaction', 'severe_injury']);
    const careLevel = redFlags.some((flag) => emergencyFlags.has(flag)) ? 'emergency' : 'consultation';
    const result = {
      care_level: careLevel,
      selected_red_flags: redFlags,
      notice: careLevel === 'emergency'
        ? 'selected_emergency_signs_require_local_emergency_services'
        : 'this_is_guidance_not_a_diagnosis_consult_a_clinician_if_symptoms_persist_or_worsen',
      diagnosis: null,
      treatment: null,
    };

    await this.triageSessions.insertOne({
      patient_id: ownerId,
      symptoms,
      body_region: bodyRegion ?? null,
      red_flags: redFlags,
      care_level: careLevel,
      createdAt: new Date(),
    });
    try { this.eventEmitter?.emit('ai.triage_completed', { patient_id: ownerId, care_level: careLevel }); } catch { /* notification is non-blocking */ }
    return result;
  }

  /** Patient's own guided-triage history; no AI interpretation is persisted. */
  async triageHistory(patientId: string, limit = 50): Promise<any[]> {
    const ownerId = this.requirePatientId(patientId);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('limit_invalid');
    return this.triageSessions
      .find({ patient_id: ownerId }, { projection: { _id: 0, patient_id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async voiceToOrder(transcript: string) {
    const prompt = `Convert this voice transcript to a pharmacy order JSON: ${transcript}`;
    return { response: await this.gen('voiceToOrder', prompt) };
  }

  async voiceToOrderFile(audioBuffer: Buffer) {
    try {
      const prompt = `Listen to this audio file and extract the requested medicines.
Return ONLY valid JSON with this exact structure:
{ "items": [ { "medicine_id": null, "raw_name_string": "medicine name", "requested_quantity": 1, "notes": "from voice" } ] }`;
      const text = await this.genVision('voiceToOrderFile', prompt, audioBuffer.toString('base64'), 'audio/mp4');
      return JSON.parse(this.cleanJson(text));
    } catch (e) {
      this.logger.error(e);
      return { items: [] };
    }
  }

  async parseExcel(fileBuffer: Buffer) {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet) as any[];

      // Map basic excel row to the requested checklist array format
      const items = data.map((row: any) => {
        const name = row['Name'] || row['اسم الدواء'] || row['Item'] || row['name'] || Object.values(row)[0] || 'Unknown';
        const qty = row['Quantity'] || row['الكمية'] || row['Qty'] || row['quantity'] || 1;
        const notes = row['Notes'] || row['ملاحظات'] || '';
        return {
          medicine_id: null,
          raw_name_string: String(name),
          requested_quantity: parseInt(qty) || 1,
          notes: String(notes)
        };
      });

      return { success: true, items };
    } catch (e) {
      this.logger.error('Failed to parse Excel file', e);
      return { success: false, items: [] };
    }
  }

  async prescriptionOcr(base64: string) {
    return this.ocrTranslate(base64, 'ar');
  }

  async copilotSuggest(notes: string) {
    const prompt = `Suggest clinical follow-ups for these notes: ${notes}`;
    return { response: await this.gen('copilotSuggest', prompt) };
  }

  /** Free-form diagnostic chat is intentionally unavailable; use the structured guided-triage contract. */
  async triageChat(): Promise<never> {
    throw new BadRequestException('guided_triage_required');
  }

  async ocrTranslate(base64: string, lang: string) {
    try {
      const prompt = `Extract text from this image and translate to ${lang}. Return ONLY valid JSON with this exact structure: { "items": [ { "medicine_id": null, "raw_name_string": "medicine name extracted", "requested_quantity": 1, "notes": "from OCR" } ] }`;
      const text = await this.genVision('ocrTranslate', prompt, base64);
      const res = JSON.parse(this.cleanJson(text));
      return res.items ? res : { items: [] };
    } catch (e) {
      this.logger.error(e);
      return { items: [] };
    }
  }

  /**
   * Skin self-check guidance, not image analysis or dermatology diagnosis.
   * A photo is deliberately rejected until a clinically governed, privacy-reviewed
   * imaging workflow has been approved for the deployment region.
   */
  async skinAnalysis(body: any, patientId?: string) {
    const ownerId = this.requirePatientId(patientId);
    if (body?.image_base64 || body?.imageBase64) throw new BadRequestException('skin_photo_analysis_unavailable');
    if (body?.acknowledge_limitations !== true) throw new BadRequestException('skin_limitations_acknowledgement_required');
    const area = this.selectedValues(body?.areas, ['face', 'hand', 'back', 'body', 'other'], 'areas', 5);
    if (!area.length) throw new BadRequestException('areas_invalid');
    const observations = this.selectedValues(body?.observations, [
      'new_or_changing', 'growing_or_changed_colour_texture', 'painful_or_itchy',
      'bleeding_or_crusting', 'not_healing_over_four_weeks', 'none',
    ], 'observations', 6);
    if (observations.includes('none') && observations.length > 1) throw new BadRequestException('observations_invalid');
    const note = this.optionalText(body?.note, 'note', 500);
    const concernSignals = new Set(['new_or_changing', 'growing_or_changed_colour_texture', 'painful_or_itchy', 'bleeding_or_crusting', 'not_healing_over_four_weeks']);
    const needsClinicalAssessment = observations.some((item) => concernSignals.has(item));
    const result = {
      care_level: needsClinicalAssessment ? 'clinical_assessment' : 'self_observation',
      selected_areas: area,
      selected_observations: observations,
      image_analysis: false,
      diagnosis: null,
      treatment: null,
      notice: needsClinicalAssessment
        ? 'selected_skin_changes_should_be_assessed_by_a_clinician'
        : 'this_check_cannot_rule_out_a_skin_condition_seek_clinical_advice_for_any_new_or_worsening_change',
    };
    await this.conn.collection('ai_skin_self_checks').insertOne({
      patient_id: ownerId,
      areas: area,
      observations,
      note: note ?? null,
      care_level: result.care_level,
      createdAt: new Date(),
    });
    return result;
  }

  async medicineImageSearch(base64: string) {
    try {
      const prompt = `Identify this medicine packaging. Return JSON: { "name": "medicine name", "active_ingredient": "ingredient" }`;
      const text = await this.genVision('medicineImageSearch', prompt, base64);
      return JSON.parse(this.cleanJson(text));
    } catch (e) {
      return { name: "Unknown", active_ingredient: "Unknown" };
    }
  }

  async barcodeLookup(code: string) {
    const prompt = `Identify the medicine with barcode ${code}. Return JSON: { "name": "medicine name", "active_ingredient": "ingredient" }`;
    try {
      const text = await this.gen('barcodeLookup', prompt);
      return JSON.parse(this.cleanJson(text));
    } catch (e) {
      return { name: "Unknown", active_ingredient: "Unknown" };
    }
  }

  async analyzeMeal(query: string, base64?: string) {
    try {
      const prompt = `Analyze this meal: ${query}. Return JSON with { "calories": number, "protein": number, "carbs": number, "fat": number }`;
      const text = base64
        ? await this.genVision('analyzeMeal', prompt, base64)
        : await this.gen('analyzeMeal', prompt);
      return JSON.parse(this.cleanJson(text));
    } catch (e) {
      // Never fabricate nutrition values — surface the failure to the caller
      throw new InternalServerErrorException('meal_analysis_failed');
    }
  }

  async generateDietPlan(body: any) {
    try {
      const prompt = `Generate a 7-day diet plan for: ${JSON.stringify(body)}. Return valid JSON: { "plan": [{ "day": 1, "meals": [...] }] }`;
      const text = await this.gen('generateDietPlan', prompt);
      return JSON.parse(this.cleanJson(text));
    } catch (e) {
      return { plan: [] };
    }
  }

  /**
   * EPIC4/S21: AI-generated weekly exercise plan (replaces a hardcoded
   * gym plan in the patient app). Real gateway call; empty plan on failure.
   */
  async generateExercisePlan(body: { goal?: string; level?: string; days_per_week?: number; location?: string; notes?: string }) {
    try {
      const days = Math.min(Math.max(Number(body?.days_per_week) || 3, 1), 6);
      const prompt = `You are a certified fitness coach. Generate a weekly workout plan in ARABIC for:
- goal: ${body?.goal || 'لياقة عامة'}
- level: ${body?.level || 'مبتدئ'}
- training days per week: ${days}
- location: ${body?.location || 'gym'} (gym=equipment available, home=no equipment, outdoor=walking/running)
${body?.notes ? `- notes/conditions: ${body.notes}` : ''}
Return ONLY valid JSON in this exact shape:
{ "plan": [ { "day": "السبت", "muscle": "صدر + ترايسبس", "exercises": ["تمرين × مجموعات"], "duration": 45 } ], "tips": ["نصيحة"] }
Use Arabic day names starting from السبت, include rest days marked as "راحة", and keep exercises realistic for the location and level.`;
      const text = await this.gen('generateExercisePlan', prompt);
      const parsed = JSON.parse(this.cleanJson(text));
      if (!Array.isArray(parsed?.plan)) return { plan: [], tips: [] };
      return { plan: parsed.plan, tips: Array.isArray(parsed.tips) ? parsed.tips : [] };
    } catch (e) {
      return { plan: [], tips: [] };
    }
  }

  /**
   * Automated interpretation of clinical reports is intentionally unavailable.
   * The patient can view the clinician-authored report through /health/reports;
   * the service must not infer urgency, diagnoses, medicines, or treatment from
   * a document outside a clinically governed review workflow.
   */
  async analyzeReportForPatient(): Promise<never> {
    throw new BadRequestException('report_ai_analysis_unavailable');
  }
}
