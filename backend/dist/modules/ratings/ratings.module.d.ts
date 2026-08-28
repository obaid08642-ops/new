import { Connection } from 'mongoose';
export declare class RatingsService {
    private readonly conn;
    constructor(conn: Connection);
    private get ratings();
    private get profiles();
    submit(user: any, body: {
        entity_type: string;
        entity_id: string;
        provider_id: string;
        score: number;
        comment?: string;
    }): Promise<{
        ok: boolean;
        updated: boolean;
        entity_id: string;
        created?: undefined;
    } | {
        ok: boolean;
        created: boolean;
        entity_id: string;
        updated?: undefined;
    }>;
    private recompute;
    forProvider(providerId: string, page?: number, limit?: number): Promise<any>;
    mine(userId: string, entityType: string, entityId: string): Promise<any>;
}
export declare class RatingsController {
    private readonly svc;
    constructor(svc: RatingsService);
    submit(user: any, body: any): Promise<{
        ok: boolean;
        updated: boolean;
        entity_id: string;
        created?: undefined;
    } | {
        ok: boolean;
        created: boolean;
        entity_id: string;
        updated?: undefined;
    }>;
    forProvider(id: string, page?: string, limit?: string): Promise<any>;
    mine(user: any, et: string, eid: string): Promise<any>;
}
export declare class RatingsModule {
}
