import { Model } from 'mongoose';
import { ProviderType, ProviderStatus } from '../../common/enums';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { UserDocument } from '../../schemas/user.schema';
import { EventBusService } from '../events/event-bus.service';
import { ContractPdfService } from './contract-pdf.service';
export declare class ProviderOnboardingService {
    private userModel;
    private providerModel;
    private bus;
    private contracts;
    constructor(userModel: Model<UserDocument>, providerModel: Model<ProviderProfileDocument>, bus: EventBusService, contracts: ContractPdfService);
    private typeToRole;
    start(body: {
        phone: string;
        password?: string;
        full_name?: string;
        email?: string;
        type: ProviderType;
    }): Promise<{
        ok: boolean;
        user_id: any;
        profile_id: any;
        type: ProviderType;
        step: number;
    }>;
    private snapshotStep;
    step2(user: any, body: any): Promise<ProviderProfile & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    step3(user: any, body: any): Promise<ProviderProfile & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getMyProfile(user: any): Promise<import("mongoose").FlattenMaps<ProviderProfileDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    submit(user: any, body?: any): Promise<ProviderProfile & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    private generateAndStoreContract;
    private ensureContract;
    getContractForOwner(user: any): Promise<any>;
    getContractForAdmin(accountOrProfileId: string): Promise<any>;
    setContractVisibility(accountOrProfileId: string, visible: boolean): Promise<{
        ok: boolean;
        visible_to_provider: boolean;
    }>;
    private mirrorToModerationQueue;
    getProgress(user: any): Promise<{
        started: boolean;
    } | {
        id: any;
        slug?: string;
        user_id: string;
        account_id?: string;
        type: ProviderType;
        status: ProviderStatus;
        name_ar: string;
        name_en?: string;
        license_number?: string;
        scfhs_license_number?: string;
        cr_number?: string;
        moh_license_number?: string;
        sfda_license_number?: string;
        tax_number?: string;
        license_expiry_date?: Date;
        license_status: string;
        license_documents: string[];
        license_verified: boolean;
        public_eligibility: boolean;
        indexing_eligibility: boolean;
        medical_review_status: string;
        last_reviewed?: Date;
        provenance?: string;
        verification_logs: Array<{
            status: string;
            verified_by?: string;
            verified_at: Date;
            notes?: string;
        }>;
        city?: string;
        district?: string;
        address?: string;
        location?: {
            lat: number;
            lng: number;
        };
        rating: number;
        reviews_count: number;
        rating_avg: number;
        rating_count: number;
        iban?: string;
        bank_account_name?: string;
        specialty?: string;
        sub_specialties: string[];
        title?: string;
        years_experience?: number;
        consultation_modes: string[];
        price_clinic?: number;
        price_online?: number;
        price_home?: number;
        hospital?: string;
        facility_id?: string;
        radiation_safety_license?: string;
        available_equipment_text?: string;
        clinic_images: string[];
        academic_degree?: string;
        bio?: string;
        languages: string[];
        accepted_insurance: string[];
        accepts_insurance: boolean;
        insurance_clinic: boolean;
        insurance_online: boolean;
        insurance_home: boolean;
        insurance_contracts: import("../../schemas/insurance.schema").InsuranceNetworkContract[];
        has_insurance_officer: boolean;
        pharmacy_chain?: string;
        has_own_drivers: boolean;
        delivery_radius_km?: number;
        has_own_delivery: boolean;
        delivery_mode: string;
        max_delivery_radius_km: number;
        estimated_delivery_time?: string;
        delivery_fee?: number;
        free_delivery_above?: number;
        min_order_sar?: number;
        express_delivery: boolean;
        express_fee?: number;
        express_minutes?: number;
        rx_dispensing: boolean;
        otc_selling: boolean;
        enabled_categories: string[];
        gender?: string;
        nationality?: string;
        pricingModel?: string[];
        priceVisit?: number;
        priceHour?: number;
        priceDay?: number;
        priceMonth?: number;
        rating_details?: {
            quality: number;
            punctuality: number;
            communication: number;
        };
        test_categories: string[];
        coverage_radius_km: number;
        home_visit_supported: boolean;
        home_visit_radius_km?: number;
        accepts_cash: boolean;
        doctors_roster: Array<{
            doctor_user_id?: string;
            name: string;
            email?: string;
            specialty: string;
            modes: string[];
            price_clinic?: number;
            price_online?: number;
            price_home?: number;
            insurance_clinic?: boolean;
            insurance_online?: boolean;
            insurance_home?: boolean;
            clinic_images?: string[];
            working_hours?: {
                day: string;
                open: string;
                close: string;
                open_evening?: string;
                close_evening?: string;
                closed?: boolean;
            }[];
        }>;
        lab_roster: any[];
        radiology_roster: any[];
        nursing_roster: any[];
        nursing_services: Array<{
            key: string;
            name_ar: string;
            name_en?: string;
            price: number;
            requires_prescription?: boolean;
        }>;
        equipment_list: string[];
        gender_pref: string;
        onboarding_step: number;
        onboarding_completed: boolean;
        signer_name?: string;
        signer_role?: string;
        signature_url?: string;
        working_hours: {
            day: string;
            open: string;
            close: string;
            open_evening?: string;
            close_evening?: string;
            closed?: boolean;
        }[];
        commission_rate?: number;
        national_id?: string;
        clinic_name?: string;
        display_name_ar?: string;
        display_name_en?: string;
        profile_photo?: string;
        logo?: string;
        clinic_duration?: number;
        video_duration?: number;
        home_transport_fee?: boolean;
        home_transport_price?: number;
        vacation_date?: string;
        schedule_video?: any[];
        schedule_clinic?: Array<{
            day: string;
            open?: string;
            close?: string;
            open_evening?: string;
            close_evening?: string;
            closed?: boolean;
        }>;
        schedule_home?: any[];
        registration_steps?: Record<string, any[]>;
        rejected_reason?: string;
        approved_at?: Date;
        approved_by?: string;
        _id: import("mongoose").Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors?: import("mongoose").Error.ValidationError;
        isNew: boolean;
        schema: import("mongoose").Schema;
        __v: number;
        started: boolean;
    }>;
    unifiedSearch(q: {
        service?: string;
        type?: ProviderType;
        city?: string;
        home_visit?: boolean;
        insurance?: string;
    }): Promise<any[]>;
    private summarizeCaps;
}
export declare class ProviderOnboardingController {
    private svc;
    constructor(svc: ProviderOnboardingService);
    start(b: any): Promise<{
        ok: boolean;
        user_id: any;
        profile_id: any;
        type: ProviderType;
        step: number;
    }>;
    myProfile(u: any): Promise<import("mongoose").FlattenMaps<ProviderProfileDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    step2(u: any, b: any): Promise<ProviderProfile & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    step3(u: any, b: any): Promise<ProviderProfile & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    submit(u: any, b: any): Promise<ProviderProfile & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    progress(u: any): Promise<{
        started: boolean;
    } | {
        id: any;
        slug?: string;
        user_id: string;
        account_id?: string;
        type: ProviderType;
        status: ProviderStatus;
        name_ar: string;
        name_en?: string;
        license_number?: string;
        scfhs_license_number?: string;
        cr_number?: string;
        moh_license_number?: string;
        sfda_license_number?: string;
        tax_number?: string;
        license_expiry_date?: Date;
        license_status: string;
        license_documents: string[];
        license_verified: boolean;
        public_eligibility: boolean;
        indexing_eligibility: boolean;
        medical_review_status: string;
        last_reviewed?: Date;
        provenance?: string;
        verification_logs: Array<{
            status: string;
            verified_by?: string;
            verified_at: Date;
            notes?: string;
        }>;
        city?: string;
        district?: string;
        address?: string;
        location?: {
            lat: number;
            lng: number;
        };
        rating: number;
        reviews_count: number;
        rating_avg: number;
        rating_count: number;
        iban?: string;
        bank_account_name?: string;
        specialty?: string;
        sub_specialties: string[];
        title?: string;
        years_experience?: number;
        consultation_modes: string[];
        price_clinic?: number;
        price_online?: number;
        price_home?: number;
        hospital?: string;
        facility_id?: string;
        radiation_safety_license?: string;
        available_equipment_text?: string;
        clinic_images: string[];
        academic_degree?: string;
        bio?: string;
        languages: string[];
        accepted_insurance: string[];
        accepts_insurance: boolean;
        insurance_clinic: boolean;
        insurance_online: boolean;
        insurance_home: boolean;
        insurance_contracts: import("../../schemas/insurance.schema").InsuranceNetworkContract[];
        has_insurance_officer: boolean;
        pharmacy_chain?: string;
        has_own_drivers: boolean;
        delivery_radius_km?: number;
        has_own_delivery: boolean;
        delivery_mode: string;
        max_delivery_radius_km: number;
        estimated_delivery_time?: string;
        delivery_fee?: number;
        free_delivery_above?: number;
        min_order_sar?: number;
        express_delivery: boolean;
        express_fee?: number;
        express_minutes?: number;
        rx_dispensing: boolean;
        otc_selling: boolean;
        enabled_categories: string[];
        gender?: string;
        nationality?: string;
        pricingModel?: string[];
        priceVisit?: number;
        priceHour?: number;
        priceDay?: number;
        priceMonth?: number;
        rating_details?: {
            quality: number;
            punctuality: number;
            communication: number;
        };
        test_categories: string[];
        coverage_radius_km: number;
        home_visit_supported: boolean;
        home_visit_radius_km?: number;
        accepts_cash: boolean;
        doctors_roster: Array<{
            doctor_user_id?: string;
            name: string;
            email?: string;
            specialty: string;
            modes: string[];
            price_clinic?: number;
            price_online?: number;
            price_home?: number;
            insurance_clinic?: boolean;
            insurance_online?: boolean;
            insurance_home?: boolean;
            clinic_images?: string[];
            working_hours?: {
                day: string;
                open: string;
                close: string;
                open_evening?: string;
                close_evening?: string;
                closed?: boolean;
            }[];
        }>;
        lab_roster: any[];
        radiology_roster: any[];
        nursing_roster: any[];
        nursing_services: Array<{
            key: string;
            name_ar: string;
            name_en?: string;
            price: number;
            requires_prescription?: boolean;
        }>;
        equipment_list: string[];
        gender_pref: string;
        onboarding_step: number;
        onboarding_completed: boolean;
        signer_name?: string;
        signer_role?: string;
        signature_url?: string;
        working_hours: {
            day: string;
            open: string;
            close: string;
            open_evening?: string;
            close_evening?: string;
            closed?: boolean;
        }[];
        commission_rate?: number;
        national_id?: string;
        clinic_name?: string;
        display_name_ar?: string;
        display_name_en?: string;
        profile_photo?: string;
        logo?: string;
        clinic_duration?: number;
        video_duration?: number;
        home_transport_fee?: boolean;
        home_transport_price?: number;
        vacation_date?: string;
        schedule_video?: any[];
        schedule_clinic?: Array<{
            day: string;
            open?: string;
            close?: string;
            open_evening?: string;
            close_evening?: string;
            closed?: boolean;
        }>;
        schedule_home?: any[];
        registration_steps?: Record<string, any[]>;
        rejected_reason?: string;
        approved_at?: Date;
        approved_by?: string;
        _id: import("mongoose").Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors?: import("mongoose").Error.ValidationError;
        isNew: boolean;
        schema: import("mongoose").Schema;
        __v: number;
        started: boolean;
    }>;
    myContract(u: any): Promise<{
        pdf_base64: any;
        sha256: any;
        generated_at: any;
    }>;
    adminContract(u: any, id: string): Promise<{
        pdf_base64: any;
        sha256: any;
        visible_to_provider: any;
        generated_at: any;
        signer_name: any;
        signer_role: any;
    }>;
    adminContractVisibility(u: any, id: string, b: any): Promise<{
        ok: boolean;
        visible_to_provider: boolean;
    }>;
}
export declare class UnifiedSearchController {
    private svc;
    constructor(svc: ProviderOnboardingService);
    search(q: any): Promise<any[]>;
}
export declare class ProviderOnboardingModule {
}
