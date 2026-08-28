"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const mongoose_2 = require("mongoose");
const ExcelJS = __importStar(require("exceljs"));
const ai_gateway_service_1 = require("./ai-gateway.service");
let AiService = AiService_1 = class AiService {
    constructor(conn, gateway, eventEmitter) {
        this.conn = conn;
        this.gateway = gateway;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(AiService_1.name);
    }
    get triageSessions() { return this.conn.collection('ai_triage_sessions'); }
    cleanJson(text) {
        return text.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    requirePatientId(patientId) {
        if (typeof patientId !== 'string' || !patientId.trim() || patientId === 'guest') {
            throw new common_1.BadRequestException('patient_identity_required');
        }
        return patientId;
    }
    requiredText(value, field, maxLength) {
        if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
            throw new common_1.BadRequestException(`${field}_invalid`);
        }
        return value.trim();
    }
    optionalText(value, field, maxLength) {
        if (value === undefined || value === null || value === '')
            return undefined;
        if (typeof value !== 'string' || value.trim().length > maxLength) {
            throw new common_1.BadRequestException(`${field}_invalid`);
        }
        return value.trim();
    }
    selectedValues(value, allowed, field, maxCount) {
        if (value === undefined || value === null)
            return [];
        if (!Array.isArray(value) || value.length > maxCount || value.some((item) => typeof item !== 'string' || !allowed.includes(item))) {
            throw new common_1.BadRequestException(`${field}_invalid`);
        }
        return [...new Set(value)];
    }
    async gen(feature, prompt) {
        const r = await this.gateway.generate({ prompt, feature });
        return r.text;
    }
    async genVision(feature, prompt, base64, mimeType = 'image/jpeg') {
        const r = await this.gateway.generate({ prompt, feature, imageBase64: base64, mimeType });
        return r.text;
    }
    async getAiConfig() {
        return this.gateway.listProviders();
    }
    async updateAiConfig(body) {
        return {
            success: true,
            note: 'المزود النشط يُغيَّر عبر متغير البيئة AI_PROVIDER (gemini|openai|openrouter|groq) — بدون تعديل كود',
            requested: body,
            current: await this.gateway.listProviders(),
        };
    }
    async triage(body, patientId) {
        const ownerId = this.requirePatientId(patientId);
        const symptoms = this.requiredText(body?.symptoms, 'symptoms', 1000);
        const bodyRegion = this.optionalText(body?.body_region ?? body?.region, 'body_region', 80);
        const redFlags = this.selectedValues(body?.red_flags, [
            'chest_pain', 'breathing_difficulty', 'fainting_or_unresponsive', 'heavy_bleeding',
            'new_confusion', 'severe_allergic_reaction', 'severe_injury', 'none',
        ], 'red_flags', 8);
        if (redFlags.includes('none') && redFlags.length > 1)
            throw new common_1.BadRequestException('red_flags_invalid');
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
        try {
            this.eventEmitter?.emit('ai.triage_completed', { patient_id: ownerId, care_level: careLevel });
        }
        catch { }
        return result;
    }
    async triageHistory(patientId, limit = 50) {
        const ownerId = this.requirePatientId(patientId);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100)
            throw new common_1.BadRequestException('limit_invalid');
        return this.triageSessions
            .find({ patient_id: ownerId }, { projection: { _id: 0, patient_id: 0 } })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }
    async voiceToOrder(transcript) {
        const prompt = `Convert this voice transcript to a pharmacy order JSON: ${transcript}`;
        return { response: await this.gen('voiceToOrder', prompt) };
    }
    async voiceToOrderFile(audioBuffer) {
        try {
            const prompt = `Listen to this audio file and extract the requested medicines.
Return ONLY valid JSON with this exact structure:
{ "items": [ { "medicine_id": null, "raw_name_string": "medicine name", "requested_quantity": 1, "notes": "from voice" } ] }`;
            const text = await this.genVision('voiceToOrderFile', prompt, audioBuffer.toString('base64'), 'audio/mp4');
            return JSON.parse(this.cleanJson(text));
        }
        catch (e) {
            this.logger.error(e);
            return { items: [] };
        }
    }
    async parseExcel(fileBuffer) {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(fileBuffer);
            const sheet = workbook.worksheets[0];
            if (!sheet)
                return { success: false, items: [] };
            const headerRow = sheet.getRow(1);
            const headers = Array.from({ length: headerRow.cellCount }, (_, index) => headerRow.getCell(index + 1).text.trim());
            const data = [];
            sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber === 1 || data.length >= 1_000)
                    return;
                const record = {};
                headers.forEach((header, index) => {
                    if (!header)
                        return;
                    const cell = row.getCell(index + 1);
                    record[header] = cell.value ?? cell.text;
                });
                if (Object.values(record).some((value) => value !== null && value !== undefined && value !== ''))
                    data.push(record);
            });
            const items = data.map((row) => {
                const name = row['Name'] || row['اسم الدواء'] || row['Item'] || row['name'] || Object.values(row)[0] || 'Unknown';
                const qty = row['Quantity'] || row['الكمية'] || row['Qty'] || row['quantity'] || 1;
                const notes = row['Notes'] || row['ملاحظات'] || '';
                return {
                    medicine_id: null,
                    raw_name_string: String(name),
                    requested_quantity: parseInt(String(qty), 10) || 1,
                    notes: String(notes)
                };
            });
            return { success: true, items };
        }
        catch (e) {
            this.logger.error('Failed to parse Excel file', e);
            return { success: false, items: [] };
        }
    }
    async prescriptionOcr(base64) {
        return this.ocrTranslate(base64, 'ar');
    }
    async copilotSuggest(notes) {
        const prompt = `Suggest clinical follow-ups for these notes: ${notes}`;
        return { response: await this.gen('copilotSuggest', prompt) };
    }
    async triageChat() {
        throw new common_1.BadRequestException('guided_triage_required');
    }
    async ocrTranslate(base64, lang) {
        try {
            const prompt = `Extract text from this image and translate to ${lang}. Return ONLY valid JSON with this exact structure: { "items": [ { "medicine_id": null, "raw_name_string": "medicine name extracted", "requested_quantity": 1, "notes": "from OCR" } ] }`;
            const text = await this.genVision('ocrTranslate', prompt, base64);
            const res = JSON.parse(this.cleanJson(text));
            return res.items ? res : { items: [] };
        }
        catch (e) {
            this.logger.error(e);
            return { items: [] };
        }
    }
    async skinAnalysis(body, patientId) {
        const ownerId = this.requirePatientId(patientId);
        if (body?.image_base64 || body?.imageBase64)
            throw new common_1.BadRequestException('skin_photo_analysis_unavailable');
        if (body?.acknowledge_limitations !== true)
            throw new common_1.BadRequestException('skin_limitations_acknowledgement_required');
        const area = this.selectedValues(body?.areas, ['face', 'hand', 'back', 'body', 'other'], 'areas', 5);
        if (!area.length)
            throw new common_1.BadRequestException('areas_invalid');
        const observations = this.selectedValues(body?.observations, [
            'new_or_changing', 'growing_or_changed_colour_texture', 'painful_or_itchy',
            'bleeding_or_crusting', 'not_healing_over_four_weeks', 'none',
        ], 'observations', 6);
        if (observations.includes('none') && observations.length > 1)
            throw new common_1.BadRequestException('observations_invalid');
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
    async medicineImageSearch(base64) {
        try {
            const prompt = `Identify this medicine packaging. Return JSON: { "name": "medicine name", "active_ingredient": "ingredient" }`;
            const text = await this.genVision('medicineImageSearch', prompt, base64);
            return JSON.parse(this.cleanJson(text));
        }
        catch (e) {
            return { name: "Unknown", active_ingredient: "Unknown" };
        }
    }
    async barcodeLookup(code) {
        const prompt = `Identify the medicine with barcode ${code}. Return JSON: { "name": "medicine name", "active_ingredient": "ingredient" }`;
        try {
            const text = await this.gen('barcodeLookup', prompt);
            return JSON.parse(this.cleanJson(text));
        }
        catch (e) {
            return { name: "Unknown", active_ingredient: "Unknown" };
        }
    }
    async analyzeMeal(query, base64) {
        try {
            const prompt = `Analyze this meal: ${query}. Return JSON with { "calories": number, "protein": number, "carbs": number, "fat": number }`;
            const text = base64
                ? await this.genVision('analyzeMeal', prompt, base64)
                : await this.gen('analyzeMeal', prompt);
            return JSON.parse(this.cleanJson(text));
        }
        catch (e) {
            throw new common_1.InternalServerErrorException('meal_analysis_failed');
        }
    }
    async generateDietPlan(body) {
        try {
            const prompt = `Generate a 7-day diet plan for: ${JSON.stringify(body)}. Return valid JSON: { "plan": [{ "day": 1, "meals": [...] }] }`;
            const text = await this.gen('generateDietPlan', prompt);
            return JSON.parse(this.cleanJson(text));
        }
        catch (e) {
            return { plan: [] };
        }
    }
    async generateExercisePlan(body) {
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
            if (!Array.isArray(parsed?.plan))
                return { plan: [], tips: [] };
            return { plan: parsed.plan, tips: Array.isArray(parsed.tips) ? parsed.tips : [] };
        }
        catch (e) {
            return { plan: [], tips: [] };
        }
    }
    async analyzeReportForPatient() {
        throw new common_1.BadRequestException('report_ai_analysis_unavailable');
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __param(2, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        ai_gateway_service_1.AiGatewayService,
        event_emitter_1.EventEmitter2])
], AiService);
//# sourceMappingURL=ai.service.js.map