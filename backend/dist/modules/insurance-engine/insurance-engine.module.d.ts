import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InsuranceCompanyDocument } from '../../schemas/insurance.schema';
import { FraudService } from '../finance-engine/finance-engine.module';
export declare class InsuranceServiceRequest {
    id: string;
    patient_id: string;
    patient_name?: string;
    provider_id: string;
    booking_id?: string;
    booking_kind?: string;
    service_type?: string;
    channel?: string;
    price: number;
    policy: {
        company_id: string;
        company_name?: string;
        plan_class?: string;
        member_id?: string;
        policy_number?: string;
        card_image_url?: string;
    };
    state: string;
    copay_percent?: number;
    copay_amount?: number;
    rejection_reason?: string;
    decided_by?: string;
    decided_at?: Date;
    payment_id?: string;
    copay_paid_at?: Date;
    history: {
        state: string;
        at: Date;
        by: string;
        note?: string;
    }[];
    documents: string[];
    resubmission_count: number;
    appeal?: {
        reason: string;
        documents: string[];
        state: string;
        filed_at: Date;
        filed_by: string;
        decided_by?: string;
        decided_at?: Date;
        decision_note?: string;
    };
}
export declare const InsuranceServiceRequestSchema: import("mongoose").Schema<InsuranceServiceRequest, Model<InsuranceServiceRequest, any, any, any, import("mongoose").Document<unknown, any, InsuranceServiceRequest, any, {}> & InsuranceServiceRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InsuranceServiceRequest, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<InsuranceServiceRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<InsuranceServiceRequest> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class RefundRequest {
    id: string;
    patient_id: string;
    booking_id: string;
    booking_kind?: string;
    amount_paid: number;
    refund_percent: number;
    refund_amount: number;
    policy_note_ar?: string;
    reason?: string;
    moyasar_payment_id?: string;
    state: string;
    executed_at?: Date;
    history: {
        state: string;
        at: Date;
        by: string;
        note?: string;
    }[];
}
export declare const RefundRequestSchema: import("mongoose").Schema<RefundRequest, Model<RefundRequest, any, any, any, import("mongoose").Document<unknown, any, RefundRequest, any, {}> & RefundRequest & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RefundRequest, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<RefundRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<RefundRequest> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class PlatformLedgerEntry {
    id: string;
    order_id?: string;
    booking_id?: string;
    provider_id: string;
    service_type: string;
    gross_amount: number;
    commission_rate: number;
    commission_amount: number;
    net_provider_amount: number;
    payment_method: string;
    state: string;
}
export declare const PlatformLedgerEntrySchema: import("mongoose").Schema<PlatformLedgerEntry, Model<PlatformLedgerEntry, any, any, any, import("mongoose").Document<unknown, any, PlatformLedgerEntry, any, {}> & PlatformLedgerEntry & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PlatformLedgerEntry, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PlatformLedgerEntry>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PlatformLedgerEntry> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class CommissionRule {
    service_type: string;
    rate: number;
    active: boolean;
}
export declare const CommissionRuleSchema: import("mongoose").Schema<CommissionRule, Model<CommissionRule, any, any, any, import("mongoose").Document<unknown, any, CommissionRule, any, {}> & CommissionRule & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CommissionRule, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CommissionRule>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CommissionRule> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class FinanceCoreService {
    private ledger;
    private rules;
    constructor(ledger: Model<any>, rules: Model<any>);
    rateFor(serviceType: string): Promise<number>;
    accrue(input: {
        order_id?: string;
        booking_id?: string;
        provider_id: string;
        service_type: string;
        amount: number;
        payment_method?: string;
    }): Promise<any>;
    providerSummary(providerId: string): Promise<any>;
    platformSummary(): Promise<{
        total_commission: number;
        by_service: any[];
    }>;
}
export declare class QuoteController {
    quote(q: any): {
        service_type: any;
        channel: any;
        price: number;
        currency: string;
        allowed_methods: string[];
        insurance_applicable: boolean;
        notes_ar: string;
    };
}
export declare class InsuranceFlowService {
    private requests;
    private companies;
    private patients;
    private events;
    private transactions;
    private orders;
    private labs;
    private radiology;
    private homeCare;
    private appointments;
    constructor(requests: Model<any>, companies: Model<InsuranceCompanyDocument>, patients: Model<any>, events: EventEmitter2, transactions: Model<any>, orders: Model<any>, labs: Model<any>, radiology: Model<any>, homeCare: Model<any>, appointments: Model<any>);
    private push;
    companiesList(): Promise<(import("mongoose").FlattenMaps<InsuranceCompanyDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    savePolicy(user: any, body: any): Promise<{
        ok: boolean;
        policy: {
            company_id: any;
            company_name: any;
            plan_class: any;
            member_id: any;
            policy_number: any;
            card_image_url: any;
            saved_at: Date;
        };
    }>;
    myPolicy(user: any): Promise<{
        has_policy: boolean;
        policy: any;
    }>;
    private bookingModel;
    createRequest(user: any, body: any): Promise<any>;
    resubmit(user: any, id: string, body: {
        documents?: any[];
        note?: string;
    }): Promise<any>;
    appeal(user: any, id: string, body: {
        reason: string;
        documents?: any[];
    }): Promise<any>;
    myRequests(user: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    providerQueue(user: any, state?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    adminAll(state?: string): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    adminStats(): Promise<{
        by_state: Record<string, any>;
        total: any;
    }>;
    getOne(id: string, user: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    decide(user: any, id: string, body: any): Promise<any>;
    payCopay(user: any, id: string, body: any): Promise<any>;
    settleVerifiedCopay(event: any): Promise<void>;
    cancel(user: any, id: string): Promise<{
        ok: boolean;
    }>;
}
export declare class InsuranceFlowController {
    private readonly svc;
    constructor(svc: InsuranceFlowService);
    companies(): Promise<(import("mongoose").FlattenMaps<InsuranceCompanyDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    savePolicy(u: any, b: any): Promise<{
        ok: boolean;
        policy: {
            company_id: any;
            company_name: any;
            plan_class: any;
            member_id: any;
            policy_number: any;
            card_image_url: any;
            saved_at: Date;
        };
    }>;
    myPolicy(u: any): Promise<{
        has_policy: boolean;
        policy: any;
    }>;
    coverageCheck(u: any, q: any): Promise<{
        eligible: boolean;
        policy: any;
        service_type: any;
        note_ar: string;
    }>;
    benefits(u: any): Promise<{
        has_policy: boolean;
        policy: any;
        benefits: {
            key: string;
            note_ar: string;
        }[];
    }>;
    createRequest(u: any, b: any): Promise<any>;
    myRequests(u: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    one(u: any, id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    payCopay(u: any, id: string, b: any): Promise<any>;
    cancel(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    resubmit(u: any, id: string, b: any): Promise<any>;
    appeal(u: any, id: string, b: any): Promise<any>;
    providerQueue(u: any, state?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    decide(u: any, id: string, b: any): Promise<any>;
    paymentConfirm(u: any, b: any): Promise<any>;
    claimsMy(u: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
export declare class InsuranceAliasController {
    private readonly svc;
    constructor(svc: InsuranceFlowService);
    payCopay(u: any, b: any): Promise<any>;
    verify(u: any): Promise<{
        has_policy: boolean;
        policy: any;
    }>;
}
export declare class RefundService {
    private refunds;
    private events;
    private readonly fraud;
    constructor(refunds: Model<any>, events: EventEmitter2, fraud: FraudService);
    policyFor(scheduledAt?: Date): {
        hours_before: number;
        percent: number;
        note_ar: string;
    };
    request(user: any, body: any): Promise<any>;
    myRefunds(user: any): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    adminQueue(): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    decide(user: any, id: string, approve: boolean, note?: string): Promise<any>;
}
export declare class RefundController {
    private readonly svc;
    constructor(svc: RefundService);
    request(u: any, b: any): Promise<any>;
    my(u: any): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    preview(s?: string): {
        refund_percent: number;
        note_ar: string;
        windows: {
            hours_before: number;
            percent: number;
            note_ar: string;
        }[];
    };
}
export declare class AdminFinanceCoreController {
    private readonly refunds;
    private readonly finance;
    constructor(refunds: RefundService, finance: FinanceCoreService);
    summary(): Promise<{
        total_commission: number;
        by_service: any[];
    }>;
    refundsQueue(): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    decideRefund(u: any, id: string, b: any): Promise<any>;
}
export declare class AdminInsuranceController {
    private readonly svc;
    constructor(svc: InsuranceFlowService);
    all(state?: string): import("mongoose").Query<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[], any, {}, any, "find", {}>;
    stats(): Promise<{
        by_state: Record<string, any>;
        total: any;
    }>;
}
export declare class FinanceCoreController {
    private readonly finance;
    constructor(finance: FinanceCoreService);
    accrue(b: any): Promise<any>;
    providerSummary(u: any): Promise<any>;
}
export declare class InsuranceEngineModule {
}
