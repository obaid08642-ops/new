import { Connection } from 'mongoose';
export declare class ConfigService {
    private readonly conn;
    constructor(conn: Connection);
    getClientConfig(): Promise<{
        version: string;
        features: Record<string, boolean>;
        feature_rollouts: Record<string, number>;
        pricing: any;
        contact: any;
    }>;
}
