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

  async triage(body: any, patientId?: string) {
    const prompt = `Perform medical triage based on symptoms: ${JSON.stringify(body)}. Return ONLY valid JSON with these keys: "urgency" (emergency, urgent, or routine), "specialty_suggestions" (array of strings, e.g. ["طب عام", "باطنة"]), "reasoning" (string explanation in Arabic).`;
    let result: any;
    try {
      const text = await this.gen('triage', prompt);
      result = JSON.parse(this.cleanJson(text));
    } catch (e) {
      result = { urgency: 'routine', specialty_suggestions: ['طب عام'], reasoning: 'تعذر التحليل، يرجى استشارة طبيب عام.' };
    }
    // Persist every triage session — provider-less feature whose reports must be
    // visible to the admin analytics console (entity "triage" in custom-report).
    try {
      await this.triageSessions.insertOne({
        patient_id: patientId || 'guest',
        symptoms: body?.symptoms ?? body ?? null,
        body_region: body?.body_region || body?.region || null,
        urgency: result.urgency || 'routine',
        specialty_suggestions: result.specialty_suggestions || [],
        reasoning: result.reasoning || null,
        createdAt: new Date(),
      });
    } catch { /* persistence must never break triage */ }
    // S20: AI-scenario notification hook
    try {
      this.eventEmitter?.emit('ai.triage_completed', {
        patient_id: patientId || 'guest',
        urgency: result.urgency || 'routine',
      });
    } catch { /* notification must never break triage */ }
    return result;
  }

  /** Patient's own triage history — powers the symptom timeline screen. */
  async triageHistory(patientId: string, limit = 50): Promise<any[]> {
    return this.triageSessions
      .find({ patient_id: patientId }, { projection: { _id: 0, patient_id: 0 } })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
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

  async triageChat(messages: any[]) {
    try {
      const history = messages.map(m => `[${m.role}]: ${m.content}`).join('\n');
      const prompt = `You are an AI medical assistant for 'Nabdah Plus'. Provide a concise, helpful response.\n\nConversation:\n${history}\n[assistant]:`;
      return { response: await this.gen('triageChat', prompt) };
    } catch (e) {
      this.logger.error(e);
      return { response: "عذراً، أواجه صعوبة في الاتصال. يرجى المحاولة لاحقاً." };
    }
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

  async skinAnalysis(base64: string, area?: string) {
    try {
      const prompt = `Act as a dermatologist. Analyze this skin issue on the ${area || 'body'}. Return JSON with: { "condition": "name", "confidence": "high/medium/low", "recommendation": "text" }`;
      const text = await this.genVision('skinAnalysis', prompt, base64);
      return JSON.parse(this.cleanJson(text));
    } catch (e) {
      return { condition: "Unknown", confidence: "low", recommendation: "Please consult a doctor." };
    }
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
   * EPIC4/S21: ownership-checked report analysis. Loads the medical report
   * from DB (patient-scoped), builds a plain-text rendering, and analyzes it
   * via the AI gateway. `text` fallback allows analyzing pasted content.
   */
  async analyzeReportForPatient(patientId: string, reportId?: string, freeText?: string): Promise<any> {
    let text = (freeText || '').trim();
    if (reportId) {
      const r: any = await this.conn.collection('medicalreports').findOne({
        $or: [{ id: reportId }, { tracking_id: reportId }],
      } as any);
      if (!r) throw new NotFoundException('التقرير غير موجود');
      if (String(r.patient_id) !== String(patientId)) {
        throw new ForbiddenException('لا تملك صلاحية تحليل هذا التقرير');
      }
      text = [
        r.title_ar || r.title_en,
        r.summary ? `الملخص: ${r.summary}` : '',
        r.diagnosis ? `التشخيص: ${r.diagnosis}` : '',
        r.body || '',
        r.recommendations ? `التوصيات: ${r.recommendations}` : '',
      ].filter(Boolean).join('\n');
    }
    if (!text) throw new BadRequestException('report_id or text is required');
    const analysis = await this.analyzeMedicalReport(text.slice(0, 8000));
    return {
      ok: true,
      disclaimer: 'هذا التحليل للاسترشاد فقط ولا يغني عن استشارة طبيب مختص.',
      ...analysis,
    };
  }

  async analyzeMedicalReport(text: string): Promise<any> {
    this.logger.log('Sending medical report for AI analysis');
    const prompt = `You are a medical assistant analyzing a health report or prescription.
Please extract the following information and return it in valid JSON format:
- summary: A brief summary of the report
- critical: Boolean indicating if immediate attention is needed
- medications: Array of strings if any medications are listed
- recommendations: Array of string recommendations

Here is the report text:
${text}

Return ONLY valid JSON.`;

    try {
      const result = await this.gen('analyzeMedicalReport', prompt);
      return JSON.parse(this.cleanJson(result));
    } catch (e) {
      this.logger.error('Failed to parse AI response', e);
      throw new Error('AI_PARSE_ERROR');
    }
  }
}
