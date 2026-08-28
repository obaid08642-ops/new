import { Connection } from 'mongoose';
export declare class LegalEnterpriseService {
    private readonly conn;
    private readonly logger;
    constructor(conn: Connection);
    private get acceptances();
    private get policies();
    private get archives();
    private get commissionHistory();
    private get auditLog();
    private get consents();
    private get providerInsurance();
    snapshotAcceptance(user: any, policy: any, reqMeta: {
        ip?: string;
        device?: string;
        platform?: string;
        user_agent?: string;
    }): Promise<{
        archive_id: `${string}-${string}-${string}-${string}-${string}`;
        sha256: string;
    }>;
    buildPdf(title: string, lines: string[]): Buffer;
    acceptancePdf(acceptanceId: string): Promise<{
        pdf: Buffer;
        sha256: string;
    } | null>;
    verifyArchive(acceptanceId: string): Promise<{
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
    recordCommissionChange(adminId: string, before: any, after: any, reqMeta: {
        ip?: string;
        device?: string;
    }): Promise<void>;
    getCommissionHistory(limit?: number): Promise<any[]>;
    recordAudit(adminId: string, action: string, target: string, before: any, after: any, reqMeta: {
        ip?: string;
        device?: string;
    }): Promise<void>;
    getAuditLog(filter: {
        action?: string;
        admin_id?: string;
        limit?: number;
    }): Promise<any[]>;
    settlementData(providerId: string, from?: string, to?: string): Promise<any>;
    settlementExcel(providerId: string, from?: string, to?: string): Promise<Buffer>;
    settlementPdf(providerId: string, from?: string, to?: string): Promise<Buffer>;
    licenseMonitor(): Promise<void>;
    private notify;
    licenseMonitorRun(): Promise<void>;
    getProviderInsurance(providerId: string): Promise<any>;
    setProviderInsurance(providerId: string, companies: string[]): Promise<{
        ok: boolean;
        provider_id: string;
        supported_companies: string[];
    }>;
    acceptsInsurance(providerId: string, companyId: string): Promise<any>;
    providerSla(providerId: string, days?: number, userRole?: string): Promise<any>;
    static CONSENT_TYPES: string[];
    getConsents(userId: string): Promise<any>;
    setConsent(userId: string, type: string, value: boolean, meta: {
        ip?: string;
        device?: string;
    }): Promise<{
        ok: boolean;
        type: string;
        value: boolean;
    }>;
    diffVersions(key: string, v1Content: string, v2Content: string): Promise<{
        key: string;
        added_words: number;
        removed_words: number;
        added: string[];
        removed: string[];
    }>;
}
