import { LedgerService } from '../finance-engine/finance-engine.module';
import { ProviderAuthService } from './services/provider-auth.service';
import { ProviderProfileService } from './services/provider-profile.service';
import { ProviderOperatorsService } from './services/provider-operators.service';
import { ProviderAdminService } from './services/provider-admin.service';
import { ProviderRequestEngineService } from './services/provider-request-engine.service';
import { ProviderNotificationsService } from './services/provider-notifications.service';
import { ProviderScheduleService } from './services/provider-schedule.service';
import { ProviderDashboardService } from './services/provider-dashboard.service';
import { ProviderSeedService } from './services/provider-seed.service';
import { ServiceCapabilityService } from './services/service-capability.service';
import { SchedulingEngineService } from './services/scheduling-engine.service';
import { ProviderScoringService } from './services/provider-scoring.service';
import { ProviderMatchingService } from './services/provider-matching.service';
import { AssignmentStrategyService } from './services/assignment-strategy.service';
import { ProviderImageProcessorService } from './services/provider-image-processor.service';
export declare class ProviderAuthController {
    private readonly svc;
    constructor(svc: ProviderAuthService);
    register(body: any, req: any): Promise<{
        account: {
            id: string;
            email: string;
            provider_type: import("./provider.enums").ProviderType;
            status: import("./provider.enums").ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        otp: {
            sent: boolean;
            cooldown_seconds: number;
            expires_in_seconds: number;
            log_only: boolean;
        };
        required_documents: import("./provider.enums").ProviderDocumentType[];
    }>;
    login(body: any, req: any): Promise<{
        access_token: string;
        refresh_token: string;
        session_id: string;
        provider_id: any;
        provider_type: any;
        role: string;
        permissions: string[];
        profile_status: any;
        account: {
            id: string;
            email: string;
            provider_type: import("./provider.enums").ProviderType;
            status: import("./provider.enums").ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        profile: any;
    }>;
    refresh(body: any, req: any): Promise<{
        access_token: string;
        refresh_token: string;
        provider_id: any;
        provider_type: any;
        role: string;
        permissions: string[];
        profile_status: any;
        account: {
            id: string;
            email: string;
            provider_type: import("./provider.enums").ProviderType;
            status: import("./provider.enums").ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        profile: any;
    }>;
    logout(body: any, req: any): Promise<{
        ok: boolean;
    }>;
    sendOtp(body: any, req: any): Promise<{
        sent: boolean;
        cooldown_seconds: number;
        expires_in_seconds: number;
        log_only: boolean;
    }>;
    verifyEmail(body: any, req: any): Promise<{
        ok: boolean;
        onboarding: boolean;
        account?: undefined;
        token?: undefined;
    } | {
        account: {
            id: string;
            email: string;
            provider_type: import("./provider.enums").ProviderType;
            status: import("./provider.enums").ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        token: string;
        ok?: undefined;
        onboarding?: undefined;
    }>;
    forgot(body: any, req: any): Promise<{
        ok: boolean;
    }>;
    verifyResetCode(body: any, req: any): Promise<{
        ok: boolean;
    }>;
    reset(body: any, req: any): Promise<{
        account: {
            id: string;
            email: string;
            provider_type: import("./provider.enums").ProviderType;
            status: import("./provider.enums").ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        token: string;
    }>;
    me(user: any): Promise<{
        account: {
            id: string;
            email: string;
            provider_type: import("./provider.enums").ProviderType;
            status: import("./provider.enums").ProviderAccountStatus;
            email_verified: boolean;
            onboarding_progress: any;
        };
        profile: any;
        required_documents: any;
    }>;
}
export declare class ProviderProfileController {
    private readonly svc;
    private readonly processor;
    constructor(svc: ProviderProfileService, processor: ProviderImageProcessorService);
    get(u: any): Promise<any>;
    update(u: any, body: any): Promise<any>;
    addPhone(u: any, body: any): Promise<any>;
    removePhone(u: any, pid: string): Promise<any>;
    uploadDoc(u: any, body: any): Promise<any>;
    listDocs(u: any): Promise<{
        documents: any;
        required: any;
        missing: any;
    }>;
    directory(): Promise<{
        id: any;
        name: string;
        spec: any;
        hospital: any;
    }[]>;
    upsertBank(u: any, body: any): Promise<any>;
    getBank(u: any): Promise<any>;
    banks(): readonly [{
        readonly code: "rajhi";
        readonly name_ar: "مصرف الراجحي";
        readonly name_en: "Al Rajhi Bank";
    }, {
        readonly code: "snb";
        readonly name_ar: "البنك الأهلي السعودي";
        readonly name_en: "Saudi National Bank (SNB)";
    }, {
        readonly code: "riyad";
        readonly name_ar: "بنك الرياض";
        readonly name_en: "Riyad Bank";
    }, {
        readonly code: "sab";
        readonly name_ar: "البنك السعودي البريطاني";
        readonly name_en: "SAB (Saudi Awwal Bank)";
    }, {
        readonly code: "alinma";
        readonly name_ar: "مصرف الإنماء";
        readonly name_en: "Alinma Bank";
    }, {
        readonly code: "bsf";
        readonly name_ar: "البنك السعودي الفرنسي";
        readonly name_en: "Banque Saudi Fransi (BSF)";
    }, {
        readonly code: "jazira";
        readonly name_ar: "بنك الجزيرة";
        readonly name_en: "Bank AlJazira";
    }, {
        readonly code: "anb";
        readonly name_ar: "البنك العربي الوطني";
        readonly name_en: "Arab National Bank (ANB)";
    }, {
        readonly code: "albilad";
        readonly name_ar: "بنك البلاد";
        readonly name_en: "Bank AlBilad";
    }, {
        readonly code: "emiratesnbd";
        readonly name_ar: "بنك الإمارات دبي الوطني";
        readonly name_en: "Emirates NBD";
    }, {
        readonly code: "gib";
        readonly name_ar: "بنك الخليج الدولي";
        readonly name_en: "Gulf International Bank";
    }, {
        readonly code: "nbk";
        readonly name_ar: "بنك الكويت الوطني";
        readonly name_en: "NBK";
    }, {
        readonly code: "other";
        readonly name_ar: "بنك آخر";
        readonly name_en: "Other";
    }];
    uploadProfileImage(user: any, body: {
        data_base64: string;
        mime: string;
        original_name: string;
    }): Promise<{
        ok: boolean;
        jobId: any;
        status: string;
    }>;
    getProfileImageStatus(user: any): Promise<{
        owner_id: any;
        owner_type: any;
        originalImageUrl: any;
        processedImageUrl: any;
        mediumImageUrl: any;
        thumbnailImageUrl: any;
        hasTransparentBackground: any;
        processingStatus: any;
        processingProvider: any;
        lastProcessedAt: any;
        error: any;
    }>;
    submit(u: any): Promise<{
        account: any;
        already: boolean;
    } | {
        account: any;
        already?: undefined;
    }>;
    submitDelta(u: any, body: any): Promise<{
        ok: boolean;
        message: string;
        data: {
            id: string;
            provider_id: any;
            requested_changes: any;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
export declare class ProviderOperatorsController {
    private readonly svc;
    constructor(svc: ProviderOperatorsService);
    list(u: any): Promise<any>;
    invite(u: any, body: any): Promise<{
        id: string;
        email: string;
        role: import("./provider.enums").OperatorRole;
        status: import("./schemas").OperatorStatus;
        permissions: import("./provider.enums").OperatorPermission[];
    }>;
    accept(body: any): Promise<{
        id: any;
        status: any;
        role: any;
    }>;
    update(u: any, id: string, body: any): Promise<any>;
    disable(u: any, id: string, body: any): Promise<any>;
    enable(u: any, id: string): Promise<any>;
    revoke(u: any, id: string): Promise<{
        ok: boolean;
    }>;
}
export declare class ProviderAdminController {
    private readonly svc;
    private readonly processor;
    constructor(svc: ProviderAdminService, processor: ProviderImageProcessorService);
    list(u: any, q: any): Promise<any>;
    byUser(u: any, userId: string): Promise<any>;
    detail(u: any, id: string): Promise<any>;
    approve(u: any, id: string, body: any): Promise<any>;
    reject(u: any, id: string, body: any): Promise<any>;
    reprocessImage(id: string): Promise<{
        ok: boolean;
        status: string;
    }>;
    replaceImage(id: string, body: {
        data_base64: string;
        mime: string;
    }): Promise<{
        ok: boolean;
        status: string;
    }>;
    retryFailedJobs(id: string): Promise<{
        ok: boolean;
        retriedCount: any;
    }>;
    getImageLogs(id: string): Promise<any>;
    needsChanges(u: any, id: string, body: any): Promise<any>;
    suspend(u: any, id: string, body: any): Promise<any>;
}
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection } from 'mongoose';
export declare class ProviderRequestsController {
    private readonly svc;
    private readonly reqRepo;
    private readonly events;
    private readonly conn;
    constructor(svc: ProviderRequestEngineService, reqRepo: any, events: EventEmitter2, conn: Connection);
    list(u: any, q: any): Promise<{
        items: any;
        total: any;
        limit: number;
        offset: number;
    }>;
    detail(u: any, id: string): Promise<any>;
    accept(u: any, id: string, body: any): Promise<any>;
    reject(u: any, id: string, body: any): Promise<any>;
    start(u: any, id: string, body: any): Promise<any>;
    complete(u: any, id: string, body: any): Promise<any>;
    cancel(u: any, id: string, body: any): Promise<any>;
    assignStaff(u: any, id: string, body: {
        staff_id: string;
        notes?: string;
    }): Promise<any>;
    getOrders(u: any, id: string): Promise<{
        prescriptions: any;
        labs: any;
    }>;
    endConsultation(u: any, id: string, body: any): Promise<{
        ok: boolean;
        message: string;
        prescriptions: any;
        labs: any;
        state: any;
    }>;
    requestInsuranceCopay(u: any, id: string, body: any): Promise<{
        ok: boolean;
        request_id: string;
        state: string;
        copay_amount: number;
    }>;
    issueSickLeave(u: any, id: string, body: any): Promise<{
        ok: boolean;
        message: string;
        tracking_id: string;
        verify_url: string;
        days: number;
        start_date: Date;
        end_date: Date;
    }>;
    issueMedicalReport(u: any, id: string, body: any): Promise<{
        ok: boolean;
        message: string;
        tracking_id: string;
        verify_url: string;
    }>;
}
export declare class ProviderWalletController {
    private readonly conn;
    private readonly ledger;
    constructor(conn: Connection, ledger: LedgerService);
    private get withdrawals();
    requestWithdrawal(u: any, body: {
        amount?: number;
        iban?: string;
    }): Promise<void>;
}
export declare class ProviderNotificationsController {
    private readonly svc;
    constructor(svc: ProviderNotificationsService);
    list(u: any, q: any): Promise<{
        items: any;
        total: any;
        unread_count: any;
        limit: number;
        offset: number;
    }>;
    markRead(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    markAllRead(u: any): Promise<{
        ok: boolean;
    }>;
}
export declare class ProviderScheduleController {
    private readonly svc;
    constructor(svc: ProviderScheduleService);
    view(u: any, q: any): Promise<{
        mode: string;
        from: Date;
        to: Date;
        count: any;
        days: Record<string, any[]>;
    }>;
}
export declare class ProviderDashboardController {
    private readonly dash;
    private readonly seedSvc;
    constructor(dash: ProviderDashboardService, seedSvc: ProviderSeedService);
    me(u: any): Promise<{
        account: {
            id: any;
            email: any;
            provider_type: any;
            status: any;
            email_verified: any;
            approved_at: any;
        };
        profile: any;
        availability: {
            status: any;
            last_online_at: any;
            last_offline_at: any;
            note: any;
        };
    }>;
    stats(u: any): Promise<{
        today_requests: any;
        pending_requests: any;
        completed_today: any;
        in_progress: any;
        accepted_total: any;
        today_revenue: any;
        currency: string;
    }>;
    recent(u: any, limit?: string): Promise<{
        items: any;
    }>;
    getAvail(u: any): Promise<{
        status: any;
        last_online_at: any;
        last_offline_at: any;
        note: any;
    }>;
    setAvail(u: any, body: any): Promise<{
        status: any;
        last_online_at: any;
        last_offline_at: any;
        note: any;
    }>;
    seed(u: any): Promise<{
        seeded: boolean;
        provider_account_id: any;
        capabilities: {
            pharmacy: number;
            lab: number;
            radiology: number;
            doctor_sessions: number;
            home_care: number;
        };
        zones: number;
        schedule_slots: number;
        requests: number;
        message: string;
    }>;
    seedReset(u: any): Promise<{
        ok: boolean;
        removed: any;
    }>;
}
export declare class ProviderCapabilitiesController {
    private readonly svc;
    constructor(svc: ServiceCapabilityService);
    listPharma(u: any): Promise<any>;
    upsertPharma(u: any, body: any): Promise<any>;
    delPharma(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    listLab(u: any): Promise<any>;
    upsertLab(u: any, body: any): Promise<any>;
    delLab(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    listRad(u: any): Promise<any>;
    upsertRad(u: any, body: any): Promise<any>;
    delRad(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    listDoc(u: any): Promise<any>;
    upsertDoc(u: any, body: any): Promise<any>;
    delDoc(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    listHc(u: any): Promise<any>;
    upsertHc(u: any, body: any): Promise<any>;
    delHc(u: any, id: string): Promise<{
        ok: boolean;
    }>;
}
export declare class ProviderZonesController {
    private readonly svc;
    constructor(svc: ServiceCapabilityService);
    list(u: any): Promise<any>;
    upsert(u: any, body: any): Promise<any>;
    del(u: any, id: string): Promise<{
        ok: boolean;
    }>;
}
export declare class ProviderScheduleSlotsController {
    private readonly svc;
    constructor(svc: SchedulingEngineService);
    list(u: any): Promise<any>;
    upsert(u: any, body: any): Promise<any>;
    del(u: any, id: string): Promise<{
        ok: boolean;
    }>;
}
export declare class ProviderScoreController {
    private readonly svc;
    constructor(svc: ProviderScoringService);
    me(u: any): Promise<any>;
    recompute(u: any): Promise<any>;
}
export declare class AdminMatchingController {
    private readonly matching;
    private readonly assignment;
    constructor(matching: ProviderMatchingService, assignment: AssignmentStrategyService);
    preview(u: any, id: string, limit?: string): Promise<{
        candidates: import("./services/provider-matching.service").MatchCandidate[];
        total_eligible: number;
        total_scanned: number;
    }>;
    previewAdHoc(u: any, body: any): Promise<{
        candidates: import("./services/provider-matching.service").MatchCandidate[];
        total_eligible: number;
        total_scanned: number;
    }>;
    dispatch(u: any, id: string, body: any): Promise<{
        ok: boolean;
        reason: string;
        request_id: string;
        strategy?: undefined;
        assigned_to?: undefined;
        expires_at?: undefined;
        candidates?: undefined;
        broadcasted_to?: undefined;
    } | {
        ok: boolean;
        strategy: any;
        assigned_to: string;
        expires_at: Date;
        candidates: import("./services/provider-matching.service").MatchCandidate[];
        reason?: undefined;
        request_id?: undefined;
        broadcasted_to?: undefined;
    } | {
        ok: boolean;
        strategy: any;
        broadcasted_to: string[];
        expires_at: Date;
        candidates: import("./services/provider-matching.service").MatchCandidate[];
        reason?: undefined;
        request_id?: undefined;
        assigned_to?: undefined;
    } | {
        ok: boolean;
        reason: string;
        request_id?: undefined;
        strategy?: undefined;
        assigned_to?: undefined;
        expires_at?: undefined;
        candidates?: undefined;
        broadcasted_to?: undefined;
    }>;
    assign(u: any, rid: string, pid: string): Promise<any>;
    attempts(u: any, id: string): Promise<any>;
    expireStale(u: any): Promise<{
        expired: number;
        rerouted: number;
        scanned: any;
    }>;
    seedUnassigned(u: any, body: any): Promise<{
        request: any;
        dispatch: {
            ok: boolean;
            reason: string;
            request_id: string;
            strategy?: undefined;
            assigned_to?: undefined;
            expires_at?: undefined;
            candidates?: undefined;
            broadcasted_to?: undefined;
        } | {
            ok: boolean;
            strategy: any;
            assigned_to: string;
            expires_at: Date;
            candidates: import("./services/provider-matching.service").MatchCandidate[];
            reason?: undefined;
            request_id?: undefined;
            broadcasted_to?: undefined;
        } | {
            ok: boolean;
            strategy: any;
            broadcasted_to: string[];
            expires_at: Date;
            candidates: import("./services/provider-matching.service").MatchCandidate[];
            reason?: undefined;
            request_id?: undefined;
            assigned_to?: undefined;
        } | {
            ok: boolean;
            reason: string;
            request_id?: undefined;
            strategy?: undefined;
            assigned_to?: undefined;
            expires_at?: undefined;
            candidates?: undefined;
            broadcasted_to?: undefined;
        };
    }>;
}
