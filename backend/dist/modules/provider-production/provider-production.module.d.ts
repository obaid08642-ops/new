import { Connection } from 'mongoose';
export declare class ProviderProductionService {
    private readonly conn;
    constructor(conn: Connection);
    private assertApprovedOperationalAccount;
    orderInsuranceDecision(user: any, orderId: string, body: any): Promise<{
        ok: boolean;
        insurance_status: string;
        copay_amount: number;
        patient_share: number;
        insurer_share: number;
        waiting_state: string;
        items: any[];
    }>;
    private bookingCoverageDecision;
    labCoverageDecision(user: any, id: string, body: any): Promise<{
        ok: boolean;
        booking_id: string;
        insurance_status: string;
        next_state: string;
        copay_amount: number;
    }>;
    radiologyCoverageDecision(user: any, id: string, body: any): Promise<{
        ok: boolean;
        booking_id: string;
        insurance_status: string;
        next_state: string;
        copay_amount: number;
    }>;
    homecareCoverageDecision(user: any, id: string, body: any): Promise<{
        ok: boolean;
        booking_id: string;
        insurance_status: string;
        next_state: string;
        copay_amount: number;
    }>;
    private emitSafe;
    listCrmPatients(user: any): Promise<{
        patient_id: string;
        name: any;
        is_vip: boolean;
        is_favorite: boolean;
        is_blocked: boolean;
        updated_at: any;
    }[]>;
    getCrm(user: any, patientId: string): Promise<any>;
    putCrm(user: any, patientId: string, data: any): Promise<{
        tags: any;
        notes: any;
        vip: boolean;
        favorite: boolean;
        blocked: boolean;
        blocked_reason: string;
    }>;
    myReferrals(user: any): Promise<any[]>;
    createReferral(user: any, body: any): Promise<{
        _id: any;
        id: `${string}-${string}-${string}-${string}-${string}`;
        referrer_doctor_id: any;
        appointment_id: string;
        patient_id: string;
        patient_name: any;
        target_type: string;
        target_provider_id: string;
        target_name: string;
        requested_tests: any;
        referral_code: string;
        notes: string;
        urgent: boolean;
        status: string;
        created_at: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    referralNetwork(user: any): Promise<{
        id: string;
        name: any;
        name_en: any;
        type: any;
    }[]>;
    listPromotions(user: any): Promise<any[]>;
    createPromotion(user: any, body: any): Promise<{
        _id: any;
        id: `${string}-${string}-${string}-${string}-${string}`;
        provider_account_id: any;
        provider_id: any;
        title_ar: string;
        title_en: string;
        original_price: number;
        discounted_price: number;
        start_date: Date;
        end_date: Date;
        target_parameters: any;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private technicianCollection;
    listTechnicians(user: any): Promise<any[]>;
    createTechnician(user: any, body: any): Promise<any>;
    updateTechnician(user: any, techId: string, body: any): Promise<any>;
    deleteTechnician(user: any, techId: string): Promise<{
        ok: boolean;
    }>;
    claimAction(user: any, claimId: string, action: 'resubmit' | 'approve' | 'reject', body: any): Promise<{
        ok: boolean;
        claim_id: string;
        claim_status: string;
        acted_by: any;
        acted_at: string;
        claim: any;
    }>;
    inboundReports(user: any): Promise<({
        id: string;
        kind: "LAB";
        booking_id: any;
        patient_name: any;
        test_name: any;
        status: string;
        report_url: any;
        dicom_viewer_url: any;
        published_at: any;
        created_at: any;
    } | {
        id: string;
        kind: "RADIOLOGY";
        booking_id: any;
        patient_name: any;
        test_name: any;
        status: any;
        report_url: any;
        dicom_viewer_url: any;
        published_at: any;
        created_at: any;
    })[]>;
    getAvailability(user: any): Promise<any>;
    patchAvailability(user: any, body: any): Promise<any>;
}
export declare class ProviderProductionController {
    private readonly svc;
    constructor(svc: ProviderProductionService);
    orderInsurance(u: any, id: string, b: any): Promise<{
        ok: boolean;
        insurance_status: string;
        copay_amount: number;
        patient_share: number;
        insurer_share: number;
        waiting_state: string;
        items: any[];
    }>;
    labCoverage(u: any, id: string, b: any): Promise<{
        ok: boolean;
        booking_id: string;
        insurance_status: string;
        next_state: string;
        copay_amount: number;
    }>;
    radCoverage(u: any, id: string, b: any): Promise<{
        ok: boolean;
        booking_id: string;
        insurance_status: string;
        next_state: string;
        copay_amount: number;
    }>;
    nursingCoverage(u: any, id: string, b: any): Promise<{
        ok: boolean;
        booking_id: string;
        insurance_status: string;
        next_state: string;
        copay_amount: number;
    }>;
    listCrmPatients(u: any): Promise<{
        patient_id: string;
        name: any;
        is_vip: boolean;
        is_favorite: boolean;
        is_blocked: boolean;
        updated_at: any;
    }[]>;
    getCrm(u: any, p: string): Promise<any>;
    postCrm(u: any, p: string, b: any): Promise<{
        tags: any;
        notes: any;
        vip: boolean;
        favorite: boolean;
        blocked: boolean;
        blocked_reason: string;
    }>;
    putCrm(u: any, p: string, b: any): Promise<{
        tags: any;
        notes: any;
        vip: boolean;
        favorite: boolean;
        blocked: boolean;
        blocked_reason: string;
    }>;
    myReferrals(u: any): Promise<any[]>;
    createReferral(u: any, b: any): Promise<{
        _id: any;
        id: `${string}-${string}-${string}-${string}-${string}`;
        referrer_doctor_id: any;
        appointment_id: string;
        patient_id: string;
        patient_name: any;
        target_type: string;
        target_provider_id: string;
        target_name: string;
        requested_tests: any;
        referral_code: string;
        notes: string;
        urgent: boolean;
        status: string;
        created_at: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    referralNetwork(u: any): Promise<{
        id: string;
        name: any;
        name_en: any;
        type: any;
    }[]>;
    listPromotions(u: any): Promise<any[]>;
    createPromotion(u: any, b: any): Promise<{
        _id: any;
        id: `${string}-${string}-${string}-${string}-${string}`;
        provider_account_id: any;
        provider_id: any;
        title_ar: string;
        title_en: string;
        original_price: number;
        discounted_price: number;
        start_date: Date;
        end_date: Date;
        target_parameters: any;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listTechs(u: any): Promise<any[]>;
    createTech(u: any, b: any): Promise<any>;
    updateTech(u: any, id: string, b: any): Promise<any>;
    deleteTech(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    claimResubmit(u: any, id: string, b: any): Promise<{
        ok: boolean;
        claim_id: string;
        claim_status: string;
        acted_by: any;
        acted_at: string;
        claim: any;
    }>;
    claimApprove(u: any, id: string, b: any): Promise<{
        ok: boolean;
        claim_id: string;
        claim_status: string;
        acted_by: any;
        acted_at: string;
        claim: any;
    }>;
    claimReject(u: any, id: string, b: any): Promise<{
        ok: boolean;
        claim_id: string;
        claim_status: string;
        acted_by: any;
        acted_at: string;
        claim: any;
    }>;
    inboundReports(u: any): Promise<({
        id: string;
        kind: "LAB";
        booking_id: any;
        patient_name: any;
        test_name: any;
        status: string;
        report_url: any;
        dicom_viewer_url: any;
        published_at: any;
        created_at: any;
    } | {
        id: string;
        kind: "RADIOLOGY";
        booking_id: any;
        patient_name: any;
        test_name: any;
        status: any;
        report_url: any;
        dicom_viewer_url: any;
        published_at: any;
        created_at: any;
    })[]>;
    getAvailability(u: any): Promise<any>;
    patchAvailability(u: any, b: any): Promise<any>;
}
export declare class ProviderProductionModule {
}
