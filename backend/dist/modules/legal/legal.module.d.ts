import { Connection } from 'mongoose';
import { Request } from 'express';
import { LegalEnterpriseService } from './legal-enterprise.service';
export declare class LegalService {
    private readonly conn;
    private readonly enterprise;
    constructor(conn: Connection, enterprise: LegalEnterpriseService);
    private get policies();
    private get acceptances();
    private get financeConfig();
    private ensureFinanceConfig;
    getPolicy(key: string, lang?: string): Promise<{
        key: any;
        title: any;
        version: any;
        effective_date: any;
        last_updated: any;
        change_log: any;
        content: any;
        language: string;
    }>;
    listPolicies(): Promise<any[]>;
    upsertPolicy(adminId: string, key: string, patch: any): Promise<{
        created: boolean;
        version: any;
        updated?: undefined;
    } | {
        updated: boolean;
        version: string;
        created?: undefined;
    }>;
    accept(user: any, key: string, req: Request): Promise<{
        ok: boolean;
        already_accepted: boolean;
        version: any;
        accepted?: undefined;
        archive_id?: undefined;
        sha256?: undefined;
        pdf?: undefined;
    } | {
        ok: boolean;
        accepted: boolean;
        version: any;
        archive_id: `${string}-${string}-${string}-${string}-${string}`;
        sha256: string;
        pdf: string;
        already_accepted?: undefined;
    }>;
    pendingAcceptances(user: any): Promise<any[]>;
    getCommissions(): Promise<any>;
    updateCommissions(adminId: string, patch: any): Promise<{
        ok: boolean;
        config: any;
    }>;
    commissionFor(providerId: string, serviceType: string): Promise<{
        percent: any;
        source: string;
    }>;
}
export declare class LegalController {
    private readonly svc;
    constructor(svc: LegalService);
    list(): Promise<any[]>;
    policy(key: string, lang?: string): Promise<{
        key: any;
        title: any;
        version: any;
        effective_date: any;
        last_updated: any;
        change_log: any;
        content: any;
        language: string;
    }>;
    pending(user: any): Promise<any[]>;
    accept(user: any, key: string, req: Request): Promise<{
        ok: boolean;
        already_accepted: boolean;
        version: any;
        accepted?: undefined;
        archive_id?: undefined;
        sha256?: undefined;
        pdf?: undefined;
    } | {
        ok: boolean;
        accepted: boolean;
        version: any;
        archive_id: `${string}-${string}-${string}-${string}-${string}`;
        sha256: string;
        pdf: string;
        already_accepted?: undefined;
    }>;
    upsert(adminId: string, key: string, body: any): Promise<{
        created: boolean;
        version: any;
        updated?: undefined;
    } | {
        updated: boolean;
        version: string;
        created?: undefined;
    }>;
    commissions(): Promise<any>;
    updateCommissions(adminId: string, body: any): Promise<{
        ok: boolean;
        config: any;
    }>;
    commissionFor(pid: string, st: string): Promise<{
        percent: any;
        source: string;
    }>;
}
export declare class LegalModule {
}
