import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare const LEDGER_TYPES: readonly ["provider_earning", "provider_debit", "payout", "refund", "commission", "vat", "adjustment", "chargeback", "penalty", "bonus", "referral", "loyalty", "settlement"];
export type LedgerType = typeof LEDGER_TYPES[number];
export declare class LedgerService {
    private readonly conn;
    private readonly logger;
    constructor(conn: Connection);
    private get col();
    append(entry: {
        provider_account_id?: string | null;
        type: LedgerType;
        amount: number;
        state?: 'pending' | 'cleared' | 'locked' | 'released';
        available_at?: Date;
        ref_type?: string;
        ref_id?: string;
        order_id?: string;
        gross?: number;
        commission_percent?: number;
        commission?: number;
        vat?: number;
        description?: string;
        actor_id?: string;
        meta?: any;
    }): Promise<{
        ref_type: string;
        ref_id: string;
        order_id: string;
        gross: number;
        commission_percent: number;
        commission: number;
        vat: number;
        description: string;
        actor_id: string;
        meta: any;
        createdAt: Date;
        available_at?: Date;
        id: string;
        provider_account_id: string;
        type: "commission" | "vat" | "provider_earning" | "provider_debit" | "payout" | "refund" | "adjustment" | "chargeback" | "penalty" | "bonus" | "referral" | "loyalty" | "settlement";
        state: "pending" | "cleared" | "locked" | "released";
        amount: number;
    }>;
    exists(type: LedgerType, refType: string, refId: string): Promise<any>;
    matureEscrow(providerId: string): Promise<void>;
    providerBalance(providerId: string): Promise<{
        available: number;
        pending: number;
        locked: number;
        lifetime_earned: number;
        paid_out: number;
        debits: number;
        negative: boolean;
    }>;
    settlementDelayDays(serviceType?: string): Promise<number>;
}
export declare class CommissionResolver {
    private readonly conn;
    constructor(conn: Connection);
    private get rules();
    resolve(serviceType: string, opts?: {
        providerId?: string;
        category?: string;
        campaignId?: string;
    }): Promise<{
        percent: number;
        source: string;
        rule_id?: string;
    }>;
    setRule(adminId: string, rule: {
        scope: 'service' | 'provider' | 'category' | 'campaign';
        scope_id?: string;
        service_type?: string;
        percent: number;
        effective_from?: Date;
        effective_to?: Date;
    }): Promise<{
        id: string;
        scope: "service" | "category" | "provider" | "campaign";
        scope_id: string;
        service_type: string;
        percent: number;
        effective_from: Date;
        effective_to: Date;
        active: boolean;
        version: any;
        supersedes: any;
        created_by: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    history(filter?: any): Promise<any[]>;
}
export declare class CouponService {
    private readonly conn;
    constructor(conn: Connection);
    private get coupons();
    private get usages();
    validate(userId: string, code: string, ctx: {
        order_total: number;
        provider_id?: string;
        categories?: string[];
    }): Promise<{
        valid: boolean;
        discount: number;
        reason?: string;
        coupon?: any;
    }>;
    apply(userId: string, code: string, orderId: string, ctx: {
        order_total: number;
        provider_id?: string;
        categories?: string[];
    }): Promise<{
        discount: number;
        code: any;
    }>;
    release(orderId: string): Promise<void>;
    ensureIndexes(): Promise<void>;
}
export declare class LoyaltyRedeemService {
    private readonly conn;
    constructor(conn: Connection);
    private config;
    quote(userId: string, orderTotal: number): Promise<{
        enabled: boolean;
        balance: number;
        max_redeem_percent: number;
        point_value_sar: number;
        max_points_for_order: number;
        max_discount_sar: number;
    }>;
    redeem(userId: string, orderId: string, points: number, orderTotal: number): Promise<{
        points: number;
        discount_sar: number;
    }>;
    refundRedemption(userId: string, orderId: string): Promise<{
        points_recredited: number;
    }>;
}
export declare class FraudService {
    private readonly conn;
    private readonly logger;
    constructor(conn: Connection);
    private get alerts();
    raise(opts: {
        userId?: string;
        providerId?: string;
        flagType: string;
        confidence: number;
        details?: any;
        severity?: string;
    }): Promise<any>;
    checkRefundAbuse(userId: string): Promise<boolean>;
    checkPaymentVelocity(userId: string): Promise<boolean>;
    recordCouponFailure(userId: string, code: string): Promise<boolean>;
    detectDuplicatePayments(bookingId: string): Promise<any[]>;
}
export declare class RefundExecutor {
    private readonly conn;
    private readonly ledger;
    private readonly fraud;
    private readonly events;
    private readonly logger;
    constructor(conn: Connection, ledger: LedgerService, fraud: FraudService, events: EventEmitter2);
    private moyasarKey;
    execute(opts: {
        refund_id: string;
        booking_kind: string;
        booking_id: string;
        patient_id: string;
        amount: number;
        reason: string;
        actor_id: string;
    }): Promise<{
        ok: boolean;
        method: string;
        gateway_refund_id?: string;
        provider_debited?: number;
    }>;
}
export declare class CancellationPolicy {
    private readonly conn;
    constructor(conn: Connection);
    forOrder(state: string, actorRole: string, deliveryFee?: number): Promise<{
        refundable_percent: number;
        fee_sar: number;
        fee_reason?: string;
        restore_stock: boolean;
        allowed: boolean;
        block_reason?: string;
    }>;
}
export declare class ReportsService {
    private readonly conn;
    constructor(conn: Connection);
    summary(period?: 'daily' | 'weekly' | 'monthly', fromQ?: string, toQ?: string): Promise<{
        period: "weekly" | "monthly" | "daily";
        from: Date;
        to: Date;
        gross_revenue: number;
        paid_count: any;
        failed_count: any;
        failed_volume: number;
        commission: number;
        vat_on_commission: number;
        net_revenue: number;
        provider_net: number;
        refunds_completed: number;
        refunds_requested_count: any;
        chargebacks: number;
        provider_pending_escrow: number;
        provider_settled: number;
        provider_debits: number;
        canceled_orders: number;
    }>;
}
export declare class ApprovalService {
    private readonly conn;
    private readonly events;
    constructor(conn: Connection, events: EventEmitter2);
    private get ops();
    thresholds(): Promise<{
        large_payout_sar: number;
        large_refund_sar: number;
    }>;
    request(type: 'manual_credit' | 'manual_debit' | 'large_payout' | 'large_refund' | 'negative_adjustment', payload: any, requestedBy: string, reason?: string): Promise<{
        id: string;
        type: "manual_credit" | "manual_debit" | "large_payout" | "large_refund" | "negative_adjustment";
        payload: any;
        reason: string;
        status: string;
        requested_by: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listPending(): Promise<any[]>;
    decide(id: string, adminId: string, approve: boolean, note?: string, executors?: Record<string, (payload: any) => Promise<any>>): Promise<{
        ok: boolean;
        status: string;
        result?: undefined;
    } | {
        ok: boolean;
        status: string;
        result: any;
    }>;
}
export declare class FinanceEngineController {
    private readonly coupons;
    private readonly loyalty;
    private readonly ledger;
    constructor(coupons: CouponService, loyalty: LoyaltyRedeemService, ledger: LedgerService);
    validateCoupon(u: any, b: any): Promise<{
        valid: boolean;
        discount: number;
        reason?: string;
        coupon?: any;
    }>;
    loyaltyQuote(u: any, b: any): Promise<{
        enabled: boolean;
        balance: number;
        max_redeem_percent: number;
        point_value_sar: number;
        max_points_for_order: number;
        max_discount_sar: number;
    }>;
    providerBalance(u: any): Promise<{
        available: number;
        pending: number;
        locked: number;
        lifetime_earned: number;
        paid_out: number;
        debits: number;
        negative: boolean;
    }>;
}
export declare class AdminFinanceEngineController {
    private readonly conn;
    private readonly reports;
    private readonly commissions;
    private readonly approvals;
    private readonly refundExec;
    private readonly ledger;
    private readonly fraud;
    constructor(conn: Connection, reports: ReportsService, commissions: CommissionResolver, approvals: ApprovalService, refundExec: RefundExecutor, ledger: LedgerService, fraud: FraudService);
    reportSummary(period?: string, from?: string, to?: string): Promise<{
        period: "weekly" | "monthly" | "daily";
        from: Date;
        to: Date;
        gross_revenue: number;
        paid_count: any;
        failed_count: any;
        failed_volume: number;
        commission: number;
        vat_on_commission: number;
        net_revenue: number;
        provider_net: number;
        refunds_completed: number;
        refunds_requested_count: any;
        chargebacks: number;
        provider_pending_escrow: number;
        provider_settled: number;
        provider_debits: number;
        canceled_orders: number;
    }>;
    setCommissionRule(u: any, b: any): Promise<{
        id: string;
        scope: "service" | "category" | "provider" | "campaign";
        scope_id: string;
        service_type: string;
        percent: number;
        effective_from: Date;
        effective_to: Date;
        active: boolean;
        version: any;
        supersedes: any;
        created_by: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    commissionHistory(): Promise<any[]>;
    resolveCommission(b: any): Promise<{
        percent: number;
        source: string;
        rule_id?: string;
    }>;
    pendingApprovals(): Promise<any[]>;
    requestApproval(u: any, b: any): Promise<{
        id: string;
        type: "manual_credit" | "manual_debit" | "large_payout" | "large_refund" | "negative_adjustment";
        payload: any;
        reason: string;
        status: string;
        requested_by: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    decideApproval(u: any, id: string, b: any): Promise<{
        ok: boolean;
        status: string;
        result?: undefined;
    } | {
        ok: boolean;
        status: string;
        result: any;
    }>;
    executeRefund(u: any, id: string): Promise<{
        ok: boolean;
        routed_to_approval: boolean;
        operation_id: string;
    } | {
        ok: boolean;
        method: string;
        gateway_refund_id?: string;
        provider_debited?: number;
        routed_to_approval?: undefined;
        operation_id?: undefined;
    }>;
    dupScan(bookingId: string): Promise<any[]>;
    inspectProvider(providerId: string): Promise<{
        available: number;
        pending: number;
        locked: number;
        lifetime_earned: number;
        paid_out: number;
        debits: number;
        negative: boolean;
    }>;
}
export declare class FinanceEngineModule {
}
