import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as xlsx from 'xlsx';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
  }

  private getModel(modelName = "gemini-1.5-pro-latest") {
    return this.genAI.getGenerativeModel({ model: modelName });
  }

  private async generateWithFallback(
    promptPayload: string | any[],
    featureName: string,
    primaryModel = "gemini-1.5-pro-latest",
    fallbackModel = "gemini-1.5-flash"
  ) {
    const startTime = Date.now();
    try {
      const result = await this.getModel(primaryModel).generateContent(promptPayload);
      const usage = result.response.usageMetadata;
      this.logger.log(`[AI][${featureName}] Model: ${primaryModel} | Tokens: ${usage?.totalTokenCount} | Time: ${Date.now() - startTime}ms`);
      return result;
    } catch (err: any) {
      this.logger.warn(`[AI][${featureName}] Primary model (${primaryModel}) failed: ${err.message}. Retrying with fallback (${fallbackModel})...`);
      try {
        const fallbackStartTime = Date.now();
        const fallbackResult = await this.getModel(fallbackModel).generateContent(promptPayload);
        const fallbackUsage = fallbackResult.response.usageMetadata;
        this.logger.log(`[AI][${featureName}] Fallback Model: ${fallbackModel} | Tokens: ${fallbackUsage?.totalTokenCount} | Time: ${Date.now() - fallbackStartTime}ms`);
        return fallbackResult;
      } catch (fallbackErr: any) {
        this.logger.error(`[AI][${featureName}] Both primary and fallback models failed.`);
        throw fallbackErr;
      }
    }
  }

  async getAiConfig() {
    return { provider: 'gemini', models: ['gemini-1.5-pro-latest', 'gemini-1.5-flash'] };
  }

  async updateAiConfig(body: any) {
    return { success: true, updated: body };
  }

  async triage(body: any) {
    const prompt = `Perform medical triage based on symptoms: ${JSON.stringify(body)}. Return ONLY valid JSON with these keys: "urgency" (emergency, urgent, or routine), "specialty_suggestions" (array of strings, e.g. ["طب عام", "باطنة"]), "reasoning" (string explanation in Arabic).`;
    try {
      const result = await this.generateWithFallback(prompt, 'triage', 'gemini-1.5-pro-latest', 'gemini-1.5-flash');
      return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
    } catch (e) {
      return { urgency: 'routine', specialty_suggestions: ['طب عام'], reasoning: 'تعذر التحليل، يرجى استشارة طبيب عام.' };
    }
  }

  async voiceToOrder(transcript: string) {
    const prompt = `Convert this voice transcript to a pharmacy order JSON: ${transcript}`;
    const result = await this.getModel('gemini-1.5-flash').generateContent(prompt);
    return { response: result.response.text() };
  }

  async voiceToOrderFile(audioBuffer: Buffer) {
    try {
      const prompt = `Listen to this audio file and extract the requested medicines. 
Return ONLY valid JSON with this exact structure: 
{ "items": [ { "medicine_id": null, "raw_name_string": "medicine name", "requested_quantity": 1, "notes": "from voice" } ] }`;
      
      const result = await this.getModel('gemini-1.5-flash').generateContent([
        prompt,
        { inlineData: { data: audioBuffer.toString('base64'), mimeType: "audio/mp4" } }
      ]);
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '');
      return JSON.parse(responseText);
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
    const result = await this.getModel('gemini-1.5-flash').generateContent(prompt);
    return { response: result.response.text() };
  }

  async triageChat(messages: any[]) {
    try {
      const history = messages.map(m => `[${m.role}]: ${m.content}`).join('\n');
      const prompt = `You are an AI medical assistant for 'Nabdah Plus'. Provide a concise, helpful response.\n\nConversation:\n${history}\n[assistant]:`;
      const result = await this.getModel().generateContent(prompt);
      return { response: result.response.text() };
    } catch (e) {
      this.logger.error(e);
      return { response: "عذراً، أواجه صعوبة في الاتصال. يرجى المحاولة لاحقاً." };
    }
  }

  async ocrTranslate(base64: string, lang: string) {
    try {
      const prompt = `Extract text from this image and translate to ${lang}. Return ONLY valid JSON with this exact structure: { "items": [ { "medicine_id": null, "raw_name_string": "medicine name extracted", "requested_quantity": 1, "notes": "from OCR" } ] }`;
      const result = await this.getModel('gemini-1.5-flash').generateContent([
        prompt,
        { inlineData: { data: base64, mimeType: "image/jpeg" } }
      ]);
      const res = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
      return res.items ? res : { items: [] };
    } catch (e) {
      this.logger.error(e);
      return { items: [] };
    }
  }

  async skinAnalysis(base64: string, area?: string) {
    try {
      const prompt = `Act as a dermatologist. Analyze this skin issue on the ${area || 'body'}. Return JSON with: { "condition": "name", "confidence": "high/medium/low", "recommendation": "text" }`;
      const result = await this.getModel().generateContent([
        prompt,
        { inlineData: { data: base64, mimeType: "image/jpeg" } }
      ]);
      return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
    } catch (e) {
      return { condition: "Unknown", confidence: "low", recommendation: "Please consult a doctor." };
    }
  }

  async medicineImageSearch(base64: string) {
    try {
      const prompt = `Identify this medicine packaging. Return JSON: { "name": "medicine name", "active_ingredient": "ingredient" }`;
      const result = await this.getModel('gemini-1.5-flash').generateContent([
        prompt,
        { inlineData: { data: base64, mimeType: "image/jpeg" } }
      ]);
      return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
    } catch (e) {
      return { name: "Unknown", active_ingredient: "Unknown" };
    }
  }

  async barcodeLookup(code: string) {
    const prompt = `Identify the medicine with barcode ${code}. Return JSON: { "name": "medicine name", "active_ingredient": "ingredient" }`;
    try {
      const result = await this.getModel('gemini-1.5-flash').generateContent(prompt);
      return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
    } catch (e) {
      return { name: "Unknown", active_ingredient: "Unknown" };
    }
  }

  async analyzeMeal(query: string, base64?: string) {
    try {
      const prompt = `Analyze this meal: ${query}. Return JSON with { "calories": number, "protein": number, "carbs": number, "fat": number }`;
      const payload: any[] = [prompt];
      if (base64) payload.push({ inlineData: { data: base64, mimeType: "image/jpeg" } });
      const result = await this.getModel('gemini-1.5-flash').generateContent(payload);
      return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
    } catch (e) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
  }

  async generateDietPlan(body: any) {
    try {
      const prompt = `Generate a 7-day diet plan for: ${JSON.stringify(body)}. Return valid JSON: { "plan": [{ "day": 1, "meals": [...] }] }`;
      const result = await this.getModel('gemini-1.5-flash').generateContent(prompt);
      return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, ''));
    } catch (e) {
      return { plan: [] };
    }
  }

  async analyzeMedicalReport(text: string): Promise<any> {
    this.logger.log('Sending to Gemini for analysis');
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
      const result = await this.generateWithFallback(prompt, 'analyzeMedicalReport', 'gemini-1.5-pro-latest', 'gemini-1.5-flash');
      const textResponse = result.response.text().replace(/```json/g, '').replace(/```/g, '');
      return JSON.parse(textResponse);
    } catch (e) {
      this.logger.error('Failed to parse Gemini response', e);
      throw new Error('AI_PARSE_ERROR');
    }
  }
}
