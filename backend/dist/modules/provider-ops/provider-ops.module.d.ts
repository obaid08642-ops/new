import { StreamableFile } from '@nestjs/common';
import { Connection, Schema } from 'mongoose';
export declare const ProviderWithdrawalSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
    collection: string;
    strict: false;
}, {
    state: string;
    id?: string;
    amount?: number;
    provider_id?: string;
    decided_by?: string;
    decided_at?: NativeDate;
    iban?: string;
    reference?: string;
    reject_reason?: string;
    bank_name?: string;
} & import("mongoose").DefaultTimestampProps, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    state: string;
    id?: string;
    amount?: number;
    provider_id?: string;
    decided_by?: string;
    decided_at?: NativeDate;
    iban?: string;
    reference?: string;
    reject_reason?: string;
    bank_name?: string;
} & import("mongoose").DefaultTimestampProps>, {}, import("mongoose").MergeType<import("mongoose").DefaultSchemaOptions, {
    timestamps: true;
    collection: string;
    strict: false;
}>> & import("mongoose").FlatRecord<{
    state: string;
    id?: string;
    amount?: number;
    provider_id?: string;
    decided_by?: string;
    decided_at?: NativeDate;
    iban?: string;
    reference?: string;
    reject_reason?: string;
    bank_name?: string;
} & import("mongoose").DefaultTimestampProps> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class ProviderOpsService {
    private readonly conn;
    constructor(conn: Connection);
    addLeave(doctorId: string, body: {
        start_date: string;
        end_date: string;
        type: string;
        note?: string;
    }): Promise<{
        ok: boolean;
        leave: {
            id: string;
            doctor_id: string;
            start_date: Date;
            end_date: Date;
            type: string;
            note: string;
            status: string;
            createdAt: Date;
        };
    }>;
    myLeaves(doctorId: string): Promise<any[]>;
    cancelLeave(doctorId: string, leaveId: string): Promise<{
        ok: boolean;
    }>;
    isOnLeave(doctorId: string, when: Date): Promise<boolean>;
    saveTemplate(doctorId: string, body: {
        name: string;
        items: any[];
        notes?: string;
    }): Promise<{
        ok: boolean;
        template: {
            id: string;
            doctor_id: string;
            name: string;
            items: any[];
            notes: string;
            usage_count: number;
            createdAt: Date;
        };
    }>;
    myTemplates(doctorId: string): Promise<any[]>;
    deleteTemplate(doctorId: string, id: string): Promise<{
        ok: boolean;
    }>;
    saveDiagnosis(doctorId: string, body: {
        name_ar: string;
        name_en?: string;
        icd?: string;
        notes?: string;
    }): Promise<{
        ok: boolean;
        diagnosis: {
            usage_count: number;
            createdAt: Date;
            name_ar: string;
            name_en?: string;
            icd?: string;
            notes?: string;
            id: string;
            doctor_id: string;
        };
    }>;
    myDiagnoses(doctorId: string, search?: string): Promise<any[]>;
    blacklistPatient(doctorId: string, patientId: string, reason?: string): Promise<{
        ok: boolean;
        blacklisted: boolean;
    }>;
    unblacklistPatient(doctorId: string, patientId: string): Promise<{
        ok: boolean;
    }>;
    myBlacklist(doctorId: string): Promise<any[]>;
    getPatientCrm(doctorId: string, patientId: string): Promise<any>;
    putPatientCrm(doctorId: string, patientId: string, data: any): Promise<any>;
    isBlacklisted(doctorId: string, patientId: string): Promise<boolean>;
    labQc(user: any, bookingId: string, action: string, body?: any): Promise<{
        ok: boolean;
        action: string;
        booking_id: string;
        state: any;
        priority: any;
    }>;
    private notifyUser;
    nursingChecklist(user: any, bookingId: string, phase: 'before' | 'supplies' | 'after', items: Record<string, boolean>): Promise<{
        ok: boolean;
        phase: "before" | "after" | "supplies";
        completed: number;
        total: number;
    }>;
    nursingSign(user: any, bookingId: string, signatureBase64: string, signerName: string): Promise<{
        ok: boolean;
        signed: boolean;
        signer: string;
        state: string;
    }>;
    nursingTrack(user: any, bookingId: string, lat: number, lng: number): Promise<{
        ok: boolean;
    }>;
    nursingEscalate(user: any, bookingId: string, reason: string): Promise<{
        ok: boolean;
        escalated: boolean;
    }>;
    private ownedAmbulanceMission;
    ambulanceEta(user: any, bookingId: string, fromLat: number, fromLng: number): Promise<{
        eta_minutes: any;
        note: string;
        distance_km?: undefined;
    } | {
        eta_minutes: number;
        distance_km: number;
        note?: undefined;
    }>;
    ambulanceHandover(user: any, bookingId: string, body: {
        hospital_provider_account_id: string;
        notes?: string;
    }): Promise<{
        ok: boolean;
        state: string;
        handover_reference: string;
    }>;
    ambulanceComplete(user: any, bookingId: string, body: {
        summary: string;
        outcome: string;
        vitals?: any;
    }): Promise<{
        ok: boolean;
        state: string;
    }>;
    invoicePdf(orderId: string, requester: any): Promise<any>;
    toggleInstantAvailability(user: any): Promise<{
        instant_available: boolean;
    }>;
    statsToday(providerId: string): Promise<any>;
    statsPeriod(providerId: string, period: 'week' | 'month' | 'year'): Promise<any>;
    providerReviews(providerId: string): Promise<any[]>;
    replyReview(providerId: string, ratingId: string, reply: string): Promise<{
        ok: boolean;
    }>;
    getProviderSetting(providerId: string, key: string, def: any): Promise<any>;
    setProviderSetting(providerId: string, key: string, value: any): Promise<{
        ok: boolean;
    }>;
    endConsultation(user: any, body: any): Promise<{
        ok: boolean;
        state: string;
    }>;
    creditEarning(providerId: string, serviceType: string, gross: number, refType: string, refId: string): Promise<any>;
    walletLedger(providerId: string, limit?: number): Promise<any>;
}
export declare class ProviderOpsController {
    private readonly svc;
    constructor(svc: ProviderOpsService);
    addLeave(u: any, b: any): Promise<{
        ok: boolean;
        leave: {
            id: string;
            doctor_id: string;
            start_date: Date;
            end_date: Date;
            type: string;
            note: string;
            status: string;
            createdAt: Date;
        };
    }>;
    leaves(u: any): Promise<any[]>;
    cancelLeave(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    saveTemplate(u: any, b: any): Promise<{
        ok: boolean;
        template: {
            id: string;
            doctor_id: string;
            name: string;
            items: any[];
            notes: string;
            usage_count: number;
            createdAt: Date;
        };
    }>;
    templates(u: any): Promise<any[]>;
    delTemplate(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    saveDx(u: any, b: any): Promise<{
        ok: boolean;
        diagnosis: {
            usage_count: number;
            createdAt: Date;
            name_ar: string;
            name_en?: string;
            icd?: string;
            notes?: string;
            id: string;
            doctor_id: string;
        };
    }>;
    diagnoses(u: any, s?: string): Promise<any[]>;
    block(u: any, p: string, b: any): Promise<{
        ok: boolean;
        blacklisted: boolean;
    }>;
    unblock(u: any, p: string): Promise<{
        ok: boolean;
    }>;
    blacklist(u: any): Promise<any[]>;
    getCrm(u: any, p: string): Promise<any>;
    putCrm(u: any, p: string, b: any): Promise<any>;
    qc(u: any, id: string, action: string, b: any): Promise<{
        ok: boolean;
        action: string;
        booking_id: string;
        state: any;
        priority: any;
    }>;
    checklist(u: any, id: string, phase: string, b: any): Promise<{
        ok: boolean;
        phase: "before" | "after" | "supplies";
        completed: number;
        total: number;
    }>;
    sign(u: any, id: string, b: any): Promise<{
        ok: boolean;
        signed: boolean;
        signer: string;
        state: string;
    }>;
    track(u: any, id: string, b: any): Promise<{
        ok: boolean;
    }>;
    escalate(u: any, id: string, b: any): Promise<{
        ok: boolean;
        escalated: boolean;
    }>;
    eta(u: any, id: string, lat: string, lng: string): Promise<{
        eta_minutes: any;
        note: string;
        distance_km?: undefined;
    } | {
        eta_minutes: number;
        distance_km: number;
        note?: undefined;
    }>;
    handover(u: any, id: string, b: any): Promise<{
        ok: boolean;
        state: string;
        handover_reference: string;
    }>;
    complete(u: any, id: string, b: any): Promise<{
        ok: boolean;
        state: string;
    }>;
    invoice(u: any, id: string, res: any): Promise<StreamableFile>;
    wallet(u: any, l?: string): Promise<any>;
}
export declare class ProviderCompatController {
    private readonly svc;
    constructor(svc: ProviderOpsService);
    toggleInstantAvailability(u: any): Promise<{
        instant_available: boolean;
    }>;
    wallet(u: any): Promise<{
        available: any;
        escrow: any;
        dues: number;
        earned: any;
    }>;
    walletTx(u: any): Promise<any>;
    statsToday(u: any): Promise<any>;
    statsPeriod(u: any, period?: string): Promise<any>;
    getPricing(u: any): Promise<{
        pricing: any;
    }>;
    putPricing(u: any, b: any): Promise<{
        ok: boolean;
    }>;
    myReviews(u: any): Promise<any[]>;
    replyReview(u: any, id: string, b: any): Promise<{
        ok: boolean;
    }>;
    getHours(u: any): Promise<any>;
    putHours(u: any, b: any): Promise<{
        ok: boolean;
    }>;
    getSched(u: any): Promise<any>;
    postSched(u: any, b: any): Promise<{
        ok: boolean;
    }>;
    endConsultation(u: any, b: any): Promise<{
        ok: boolean;
        state: string;
    }>;
}
export declare class ProviderOpsModule {
}
