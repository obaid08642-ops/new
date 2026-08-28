import { Connection } from 'mongoose';
export type AiProviderName = 'gemini' | 'openai' | 'openrouter' | 'groq';
export interface AiGenerateOptions {
    prompt: string | any[];
    feature: string;
    imageBase64?: string;
    mimeType?: string;
    jsonExpected?: boolean;
}
export interface AiGenerateResult {
    text: string;
    provider: AiProviderName;
    model: string;
    elapsed_ms: number;
}
export declare class AiProviderService {
    private readonly conn;
    private readonly logger;
    private genAI;
    private cachedProvider;
    constructor(conn: Connection);
    get activeProvider(): AiProviderName;
    setActiveProvider(provider: AiProviderName): Promise<{
        ok: boolean;
        active_provider: AiProviderName;
    }>;
    private trackUsage;
    usageReport(days?: number): Promise<import("bson").Document[]>;
    private providerChain;
    private hasKey;
    private modelFor;
    generate(opts: AiGenerateOptions): Promise<AiGenerateResult>;
    private generateGemini;
    private generateOpenAiCompat;
    getConfig(): {
        active_provider: AiProviderName;
        configured: {
            gemini: boolean;
            openai: boolean;
            openrouter: boolean;
            groq: boolean;
        };
        models: {
            text: string;
            vision: string;
        };
        switchable_via: string;
    };
}
