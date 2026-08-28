import { MedicinesService } from './medicines.service';
export declare class MedicinesController {
    private svc;
    constructor(svc: MedicinesService);
    list(search: string, q: string, category: string, page?: string, limit?: string, cursor?: string, auth?: string): Promise<any>;
    private optionalUserId;
    autocomplete(q: string): Promise<any>;
    lookupBarcode(body: {
        code: string;
    }): Promise<{
        found: boolean;
        source: string;
        medicine: any;
        codes_tried?: undefined;
        ai_lookup_recommended?: undefined;
    } | {
        found: boolean;
        source: string;
        medicine: any;
        codes_tried: string[];
        ai_lookup_recommended?: undefined;
    } | {
        found: boolean;
        source: string;
        medicine: any;
        codes_tried: string[];
        ai_lookup_recommended: boolean;
    }>;
    byBarcode(code: string): Promise<{
        found: boolean;
        source: string;
        medicine: any;
        codes_tried?: undefined;
        ai_lookup_recommended?: undefined;
    } | {
        found: boolean;
        source: string;
        medicine: any;
        codes_tried: string[];
        ai_lookup_recommended?: undefined;
    } | {
        found: boolean;
        source: string;
        medicine: any;
        codes_tried: string[];
        ai_lookup_recommended: boolean;
    }>;
    categoriesList(): Promise<any[]>;
    filters(): Promise<{
        categories: any;
        brands: any;
        forms: any;
        sortOptions: string[];
    }>;
    compare(body: {
        ids: string[];
    }): Promise<any>;
    hot(): Promise<any[]>;
    didYouMean(q: string): Promise<{
        suggestion: any;
        alternatives?: undefined;
        query?: undefined;
    } | {
        suggestion: string;
        alternatives: string[];
        query: string;
    }>;
    trending(limit?: string): Promise<any[]>;
    recent(user: any, limit?: string): Promise<any[]>;
    regenerateHot(): Promise<{
        generated: number;
    }>;
    reportShortage(id: string, user: any, body: {
        note?: string;
        quantity_available?: number;
    }): Promise<{
        ok: boolean;
        report_id: any;
        note: string;
        status?: undefined;
    } | {
        ok: boolean;
        report_id: string;
        status: string;
        note?: undefined;
    }>;
    shortageReports(status?: string, page?: string, limit?: string): Promise<any>;
    approveShortage(reportId: string, by: string): Promise<{
        ok: boolean;
        badge: string;
    }>;
    rejectShortage(reportId: string, by: string, body: {
        reason?: string;
    }): Promise<{
        ok: boolean;
    }>;
    clearBadge(id: string, by: string): Promise<{
        ok: boolean;
    }>;
    setAvailability(id: string, by: string, body: {
        status: string;
    }): Promise<{
        ok: boolean;
        status: string;
    }>;
    suggestImage(id: string, user: any, body: {
        storage_id?: string;
        image_url?: string;
        note?: string;
    }): Promise<{
        ok: boolean;
        suggestion_id: any;
        note: string;
        status?: undefined;
    } | {
        ok: boolean;
        suggestion_id: string;
        status: string;
        note?: undefined;
    }>;
    imageSuggestions(status?: string, page?: string, limit?: string): Promise<any>;
    approveImage(suggestionId: string, by: string): Promise<{
        ok: boolean;
        medicine_id: any;
        new_image: any;
        old_image_deleted: boolean;
    }>;
    rejectImage(suggestionId: string, by: string, body: {
        reason?: string;
    }): Promise<{
        ok: boolean;
    }>;
    suggestChange(id: string, user: any, body: any): Promise<{
        ok: boolean;
        request_id: any;
        note: string;
        status?: undefined;
    } | {
        ok: boolean;
        request_id: string;
        status: string;
        note?: undefined;
    }>;
    suggestNewItem(user: any, body: any): Promise<{
        ok: boolean;
        request_id: string;
        status: string;
    }>;
    changeRequests(status?: string, type?: string, page?: string, limit?: string): Promise<any>;
    approveChange(requestId: string, by: string, body?: {
        overrides?: any;
        approved_fields?: string[];
    }): Promise<{
        ok: boolean;
        applied: any;
    }>;
    rejectChange(requestId: string, by: string, body: {
        reason?: string;
    }): Promise<{
        ok: boolean;
    }>;
    adminUpdateCatalog(id: string, body: any, by: string): Promise<{
        ok: boolean;
        updated: string[];
        requires_reapproval: boolean;
    }>;
    adminCatalog(q?: string, category?: string, page?: string, limit?: string, includeDeleted?: string): Promise<{
        data: any;
        total: any;
        page: number;
        pages: number;
    }>;
    adminCreate(body: any, by: string): Promise<{
        ok: boolean;
        id: any;
    }>;
    adminDelete(id: string, body: {
        restore?: boolean;
    }, by: string): Promise<{
        ok: boolean;
        is_deleted: boolean;
    }>;
    priceHistory(id: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: number;
        page: number;
        pages: number;
    }>;
    adminReports(): Promise<{
        top_selling: {
            medicine_id: any;
            name: any;
            qty: any;
            revenue: any;
        }[];
        top_by_usage: {
            medicine_id: any;
            name: any;
            usage_count: any;
            price: any;
        }[];
        most_unavailable: any;
        generated_at: Date;
    }>;
    recentlyViewed(user: any, limit?: string): Promise<any[]>;
    one(id: string): Promise<any>;
    details(id: string, auth?: string, lang?: string, acceptLang?: string): Promise<any>;
    alts(id: string): Promise<any>;
    createManual(body: any, user: any): Promise<import("../../schemas/medicine.schema").MedicineDocument>;
    pendingLegacyDisabled(): never;
    createCatalogLegacyDisabled(): never;
    deleteCatalogLegacyDisabled(): never;
    approveLegacyDisabled(): never;
    rejectLegacyDisabled(): never;
    updateLegacyDisabled(): never;
    importJson(body: {
        rows: any[];
        auto_approve?: boolean;
    }, by: string): Promise<{
        ok: boolean;
        imported: number;
        failed: number;
        failed_rows: any[];
        needs_review: boolean;
    }>;
    importCsv(body: {
        csv: string;
        auto_approve?: boolean;
    }, by: string): Promise<{
        ok: boolean;
        imported: number;
        failed: number;
        failed_rows: any[];
        needs_review: boolean;
    }>;
}
export declare class PublicCatalogController {
    private svc;
    constructor(svc: MedicinesService);
    fragment(locale: string, category: string): Promise<{
        id: any;
        slug: any;
        name: any;
        category: any;
        form: any;
        strength: any;
        price: number;
        image: any;
        requires_prescription: boolean;
        availability_status: any;
    }[]>;
}
