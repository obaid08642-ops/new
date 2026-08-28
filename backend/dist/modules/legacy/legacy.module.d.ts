import { Connection } from 'mongoose';
export declare class LegacyService {
    private conn;
    constructor(conn: Connection);
    report(): Promise<{
        error: string;
        collections?: undefined;
        legacy_total?: undefined;
        canonical_total?: undefined;
        generated_at?: undefined;
    } | {
        collections: any[];
        legacy_total: number;
        canonical_total: number;
        generated_at: Date;
        error?: undefined;
    }>;
    usageMap(): Promise<{
        pharmacy_orders: {
            canonical: string;
            readers: string[];
            writers: string[];
            status: string;
        };
        pharmacy_allocations: {
            canonical: string;
            readers: string[];
            writers: string[];
            status: string;
        };
        pharmacy_broadcasts: {
            canonical: string;
            readers: string[];
            writers: string[];
            status: string;
        };
        provideraccountprofiles: {
            canonical: string;
            readers: string[];
            writers: string[];
            status: string;
        };
    }>;
}
export declare class LegacyController {
    private svc;
    constructor(svc: LegacyService);
    report(): Promise<{
        error: string;
        collections?: undefined;
        legacy_total?: undefined;
        canonical_total?: undefined;
        generated_at?: undefined;
    } | {
        collections: any[];
        legacy_total: number;
        canonical_total: number;
        generated_at: Date;
        error?: undefined;
    }>;
    usageMap(): Promise<{
        pharmacy_orders: {
            canonical: string;
            readers: string[];
            writers: string[];
            status: string;
        };
        pharmacy_allocations: {
            canonical: string;
            readers: string[];
            writers: string[];
            status: string;
        };
        pharmacy_broadcasts: {
            canonical: string;
            readers: string[];
            writers: string[];
            status: string;
        };
        provideraccountprofiles: {
            canonical: string;
            readers: string[];
            writers: string[];
            status: string;
        };
    }>;
}
export declare class LegacyModule {
}
