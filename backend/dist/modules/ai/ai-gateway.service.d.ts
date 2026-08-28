import { Connection } from 'mongoose';
export type AiProviderName = 'gemini' | 'openai' | 'groq' | 'cerebras' | 'openrouter' | 'deepseek' | 'qwen' | 'replicate';
export interface ProviderConfig {
    key: AiProviderName;
    enabled: boolean;
    api_key: string;
    model: string;
    vision_model?: string;
    priority: number;
    daily_quota: number;
    used_today: number;
    usage_date: string;
    base_url?: string;
    note?: string;
}
export interface AiGenerateOptions {
    prompt: string | any[];
    feature: string;
    imageBase64?: string;
    mimeType?: string;
}
export interface AiGenerateResult {
    text: string;
    provider: AiProviderName;
    model: string;
    elapsed_ms: number;
    fell_back: boolean;
}
export declare class AiGatewayService {
    private readonly conn;
    private readonly logger;
    private genAI;
    private registryCache;
    constructor(conn: Connection);
    private get providers();
    private get settings();
    private ensureRegistry;
    private loadRegistry;
    private today;
    private attemptChain;
    generate(opts: AiGenerateOptions): Promise<AiGenerateResult>;
    private modelFor;
    private generateGemini;
    private generateOpenAiCompat;
    private recordUsage;
    listProviders(): Promise<{
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
    updateProvider(key: AiProviderName, patch: Partial<Pick<ProviderConfig, 'enabled' | 'api_key' | 'model' | 'vision_model' | 'daily_quota' | 'priority'>>): Promise<{
        ok: boolean;
        key: AiProviderName;
        patch: Partial<Pick<ProviderConfig, "model" | "priority" | "enabled" | "api_key" | "vision_model" | "daily_quota">>;
    }>;
    setMode(mode: 'auto' | 'manual', pinned?: AiProviderName | null): Promise<{
        ok: boolean;
        mode: "auto" | "manual";
        pinned_provider: AiProviderName;
    }>;
    usageReport(days?: number): Promise<import("bson").Document[]>;
}
