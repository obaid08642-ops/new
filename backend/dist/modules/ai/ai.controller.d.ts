import { AiService } from './ai.service';
import { AiGatewayService } from './ai-gateway.service';
export declare class AiController {
    private svc;
    private gateway;
    constructor(svc: AiService, gateway: AiGatewayService);
    getConfig(): Promise<{
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
    updateConfig(body: any): Promise<{
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
    gatewayStatus(): void;
    updateProvider(key: any, body: any): void;
    setMode(body: {
        mode: 'auto' | 'manual';
        pinned?: any;
    }): void;
    usage(days?: string): void;
    triage(req: any, body: any): Promise<{
        care_level: string;
        selected_red_flags: string[];
        notice: string;
        diagnosis: any;
        treatment: any;
    }>;
    triageHistory(req: any, limit?: string): Promise<any[]>;
    voice(file: any, body: {
        transcript?: string;
    }): Promise<any>;
    ocr(body: {
        image_base64?: string;
        imageBase64?: string;
    }): Promise<any>;
    parseExcel(file: any): Promise<{
        success: boolean;
        items: {
            medicine_id: any;
            raw_name_string: string;
            requested_quantity: number;
            notes: string;
        }[];
    }>;
    copilotSuggest(body: {
        notes: string;
    }): Promise<{
        response: string;
    }>;
    ocrTranslate(body: {
        image_base64: string;
        target_lang?: string;
    }): Promise<any>;
    skinAnalysis(req: any, body: any): Promise<{
        care_level: string;
        selected_areas: string[];
        selected_observations: string[];
        image_analysis: boolean;
        diagnosis: any;
        treatment: any;
        notice: string;
    }>;
    medicineImageSearch(body: {
        image_base64: string;
    }): Promise<any>;
    barcodeLookup(body: {
        code: string;
    }): Promise<any>;
    analyzeMeal(body: {
        query: string;
        image_base64?: string;
    }): Promise<any>;
    analyzeReport(): Promise<never>;
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
    generateDietPlan(body: {
        goal: string;
        gender: string;
        weight: number;
        height: number;
        age: number;
        targetWeight: number;
        activity: string;
        diet: string;
        allergies: string;
    }): Promise<any>;
}
