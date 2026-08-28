import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Medicine, MedicineDocument } from '../../schemas/medicine.schema';
import { MedicineRepository } from "./repositories/medicine.repository";
import { RedisService } from '../redis/redis.service';
import { CatalogPublicationService } from '../events/catalog-publication.service';
import { DbLang } from './med-i18n';
export declare class MedicinesService {
    private model;
    private events;
    private redis;
    private readonly conn;
    private readonly publication;
    private static readonly LIST_CACHE_TTL;
    private static readonly AUTOCOMPLETE_CACHE_TTL;
    private readonly logger;
    constructor(model: MedicineRepository, events: EventEmitter2, redis: RedisService, conn: Connection, publication: CatalogPublicationService);
    private get shortageReports();
    private get notifications();
    private get priceHistory();
    private refreshPublicProjection;
    private normalizeSearchText;
    private static readonly SYNONYMS;
    private expandSynonyms;
    private tolerantRegex;
    private publicCatalogFilter;
    publicCatalogFragment(locale: string, category: string): Promise<{
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
    private buildQuery;
    private trackSearch;
    didYouMean(term: string): Promise<{
        suggestion: any;
        alternatives?: undefined;
        query?: undefined;
    } | {
        suggestion: string;
        alternatives: string[];
        query: string;
    }>;
    trendingSearches(limit?: number): Promise<any[]>;
    recentlyViewed(userId: string, limit?: number): Promise<any[]>;
    recentSearches(userId: string, limit?: number): Promise<any[]>;
    private static readonly CARD_PROJECTION;
    private withBadges;
    list(search?: string, category?: string, includeUnverified?: boolean, maxItems?: number, userId?: string): Promise<any[]>;
    paginate(search?: string, category?: string, page?: number, limit?: number, includeUnverified?: boolean): Promise<any>;
    cursorPage(search: string | undefined, category: string | undefined, cursor: string | undefined, limit?: number): Promise<any>;
    private get hotCol();
    generateHotMedicines(): Promise<{
        generated: number;
    }>;
    hot(): Promise<any[]>;
    autocomplete(query: string): Promise<any>;
    invalidateCache(): Promise<void>;
    private extractCodes;
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
    categories(): Promise<any[]>;
    filters(): Promise<{
        categories: any;
        brands: any;
        forms: any;
        sortOptions: string[];
    }>;
    compare(ids: string[]): Promise<any>;
    getById(id: string): Promise<any>;
    getPublicById(id: string): Promise<any>;
    details(id: string, userId?: string, lang?: DbLang): Promise<any>;
    aggregateStock(medicine_id: string): Promise<{
        aggregate_stock: any;
        pharmacies_count: any;
        in_stock: boolean;
    }>;
    alternatives(id: string): Promise<any>;
    createManualEntry(data: Partial<Medicine>, byUserId: string, byRole: string): Promise<MedicineDocument>;
    approve(id: string, by: string): Promise<any>;
    reject(id: string, by: string, reason: string): Promise<any>;
    update(id: string, data: Partial<Medicine>): Promise<any>;
    pendingReview(): Promise<any>;
    createCatalog(data: any, byUserId: string): Promise<MedicineDocument>;
    reportShortage(medicineId: string, reporter: {
        id: string;
        role: string;
    }, body: {
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
    listShortageReports(status?: string, page?: number, limit?: number): Promise<any>;
    approveShortageReport(reportId: string, adminId: string): Promise<{
        ok: boolean;
        badge: string;
    }>;
    rejectShortageReport(reportId: string, adminId: string, reason?: string): Promise<{
        ok: boolean;
    }>;
    clearShortageBadge(medicineId: string, adminId: string): Promise<{
        ok: boolean;
    }>;
    setAvailability(medicineId: string, adminId: string, status: string): Promise<{
        ok: boolean;
        status: string;
    }>;
    private get imageSuggestions();
    private get storageObjects();
    private audit;
    suggestImage(medicineId: string, reporter: {
        id: string;
        role: string;
    }, body: {
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
    listImageSuggestions(status?: string, page?: number, limit?: number): Promise<any>;
    approveImageSuggestion(suggestionId: string, adminId: string): Promise<{
        ok: boolean;
        medicine_id: any;
        new_image: any;
        old_image_deleted: boolean;
    }>;
    rejectImageSuggestion(suggestionId: string, adminId: string, reason?: string): Promise<{
        ok: boolean;
    }>;
    deleteCatalog(id: string): Promise<{
        ok: boolean;
    }>;
    bulkImport(rows: any[], byUserId: string, byRole: string, autoApprove?: boolean): Promise<{
        ok: boolean;
        imported: number;
        failed: number;
        failed_rows: any[];
        needs_review: boolean;
    }>;
    parseCsv(csv: string): any[];
    private splitCsvLine;
    private get changeRequests();
    static readonly EDITABLE_FIELDS: string[];
    static readonly CHANGE_TYPES: string[];
    private pickEditable;
    private notifyAdmin;
    suggestChange(medicineId: string, reporter: {
        id: string;
        role: string;
    }, body: {
        type?: string;
        changes?: any;
        note?: string;
    }): Promise<{
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
    suggestNewItem(reporter: {
        id: string;
        role: string;
    }, body: any): Promise<{
        ok: boolean;
        request_id: string;
        status: string;
    }>;
    listChangeRequests(status?: string, type?: string, page?: number, limit?: number): Promise<any>;
    approveChangeRequest(requestId: string, adminId: string, opts?: {
        overrides?: any;
        approved_fields?: string[];
    }): Promise<{
        ok: boolean;
        applied: any;
    }>;
    rejectChangeRequest(requestId: string, adminId: string, reason?: string): Promise<{
        ok: boolean;
    }>;
    adminListCatalog(opts: {
        q?: string;
        category?: string;
        page?: number;
        limit?: number;
        includeDeleted?: boolean;
    }): Promise<{
        data: any;
        total: any;
        page: number;
        pages: number;
    }>;
    adminCreateCatalog(body: any, adminId: string): Promise<{
        ok: boolean;
        id: any;
    }>;
    adminSetDeleted(medicineId: string, deleted: boolean, adminId: string): Promise<{
        ok: boolean;
        is_deleted: boolean;
    }>;
    getPriceHistory(medicineId: string, page?: number, limit?: number): Promise<{
        data: any[];
        total: number;
        page: number;
        pages: number;
    }>;
    adminCatalogReports(): Promise<{
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
    adminUpdateCatalog(medicineId: string, patch: any, adminId: string): Promise<{
        ok: boolean;
        updated: string[];
        requires_reapproval: boolean;
    }>;
}
