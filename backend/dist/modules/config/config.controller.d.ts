import { ConfigService } from './config.service';
export declare class ConfigController {
    private readonly configService;
    constructor(configService: ConfigService);
    getConfig(): Promise<{
        version: string;
        features: Record<string, boolean>;
        feature_rollouts: Record<string, number>;
        pricing: any;
        contact: any;
    }>;
}
