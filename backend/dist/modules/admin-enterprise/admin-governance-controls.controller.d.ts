import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
export declare class AdminGovernanceControlsController {
    private readonly conn;
    private readonly audit;
    constructor(conn: Connection, audit: AdminAuditService);
    homeCuration(): Promise<any>;
    saveHomeCuration(body: any, me: any): Promise<{
        key: string;
        version: number;
        sections: any;
        updated_by: any;
        updatedAt: Date;
    }>;
    featureFlags(): Promise<{
        data: any[];
        stores: {
            canonical: number;
            legacy: number;
        };
    }>;
    saveFeatureFlag(body: any, me: any): Promise<{
        key: string;
        enabled: any;
        rollout_percentage: number;
        updated_by: any;
        updatedAt: Date;
        source: string;
    }>;
}
