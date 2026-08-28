import { Request, Response } from 'express';
import { Connection } from 'mongoose';
import { LegalEnterpriseService } from './legal-enterprise.service';
export declare class LegalEnterpriseController {
    private readonly svc;
    private readonly conn;
    constructor(svc: LegalEnterpriseService, conn: Connection);
    private meta;
    policyPdf(key: string, res: Response): Promise<Response<any, Record<string, any>>>;
    archivePdf(id: string, res: Response): Promise<Response<any, Record<string, any>>>;
    verifyArchive(id: string): Promise<{
        found: boolean;
        valid?: undefined;
        sha256?: undefined;
        recomputed?: undefined;
    } | {
        found: boolean;
        valid: boolean;
        sha256: any;
        recomputed: string;
    }>;
    commissionHistory(limit?: string): Promise<any[]>;
    auditLog(action?: string, adminId?: string, limit?: string): Promise<any[]>;
    settlements(user: any, from?: string, to?: string): Promise<any>;
    settlementsExcel(user: any, res: Response, from?: string, to?: string): Promise<void>;
    settlementsPdf(user: any, res: Response, from?: string, to?: string): Promise<void>;
    licenseRun(): Promise<void>;
    getMatrix(user: any): Promise<any>;
    setMatrix(user: any, body: {
        companies: string[];
    }): Promise<{
        ok: boolean;
        provider_id: string;
        supported_companies: string[];
    }> | {
        ok: boolean;
        error: string;
    };
    sla(user: any, days?: string): Promise<any>;
    getConsents(user: any): Promise<any>;
    setConsent(user: any, type: string, body: {
        value: boolean;
    }, req: Request): Promise<{
        ok: boolean;
        type: string;
        value: boolean;
    }> | {
        ok: boolean;
        error: any;
    };
    diff(key: string, from?: string): Promise<{
        error: string;
        key?: undefined;
        current_version?: undefined;
        change_log?: undefined;
        diff_from_previous?: undefined;
    } | {
        key: string;
        current_version: any;
        change_log: any;
        diff_from_previous: {
            key: string;
            added_words: number;
            removed_words: number;
            added: string[];
            removed: string[];
        } | {
            note: string;
        };
        error?: undefined;
    }>;
    snapshot(user: any, policy: any, req: Request): Promise<{
        archive_id: `${string}-${string}-${string}-${string}-${string}`;
        sha256: string;
    }>;
}
