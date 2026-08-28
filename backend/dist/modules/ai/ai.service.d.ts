import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
import { AiGatewayService } from './ai-gateway.service';
export declare class AiService {
    private readonly conn;
    private readonly gateway;
    private readonly eventEmitter?;
    private readonly logger;
    constructor(conn: Connection, gateway: AiGatewayService, eventEmitter?: EventEmitter2);
    private get triageSessions();
    private cleanJson;
    private requirePatientId;
    private requiredText;
    private optionalText;
    private selectedValues;
    private gen;
    private genVision;
    getAiConfig(): Promise<{
        mode: any;
        pinned_provider: any;
        providers: {
            key: any;
            enabled: any;
            model: any;
            vision_model: any;
            priority: any;
            daily_quota: any;
            used_today: any;
            has_key: boolean;
            note: any;
        }[];
    }>;
    updateAiConfig(body: any): Promise<{
        success: boolean;
        note: string;
        requested: any;
        current: {
            mode: any;
            pinned_provider: any;
            providers: {
                key: any;
                enabled: any;
                model: any;
                vision_model: any;
                priority: any;
                daily_quota: any;
                used_today: any;
                has_key: boolean;
                note: any;
            }[];
        };
    }>;
    triage(body: any, patientId?: string): Promise<{
        care_level: string;
        selected_red_flags: string[];
        notice: string;
        diagnosis: any;
        treatment: any;
    }>;
    triageHistory(patientId: string, limit?: number): Promise<any[]>;
    voiceToOrder(transcript: string): Promise<{
        response: string;
    }>;
    voiceToOrderFile(audioBuffer: Buffer): Promise<any>;
    parseExcel(fileBuffer: Buffer): Promise<{
        success: boolean;
        items: {
            medicine_id: any;
            raw_name_string: string;
            requested_quantity: number;
            notes: string;
        }[];
    }>;
    prescriptionOcr(base64: string): Promise<any>;
    copilotSuggest(notes: string): Promise<{
        response: string;
    }>;
    triageChat(): Promise<never>;
    ocrTranslate(base64: string, lang: string): Promise<any>;
    skinAnalysis(body: any, patientId?: string): Promise<{
        care_level: string;
        selected_areas: string[];
        selected_observations: string[];
        image_analysis: boolean;
        diagnosis: any;
        treatment: any;
        notice: string;
    }>;
    medicineImageSearch(base64: string): Promise<any>;
    barcodeLookup(code: string): Promise<any>;
    analyzeMeal(query: string, base64?: string): Promise<any>;
    generateDietPlan(body: any): Promise<any>;
    generateExercisePlan(body: {
        goal?: string;
        level?: string;
        days_per_week?: number;
        location?: string;
        notes?: string;
    }): Promise<{
        plan: any;
        tips: any;
    }>;
    analyzeReportForPatient(): Promise<never>;
}
