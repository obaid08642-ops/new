import { Connection } from 'mongoose';
import { AdminAuditService } from './audit.service';
export interface CouponDoc {
    code: string;
    discount_type: 'percent' | 'amount';
    value: number;
    min_basket?: number;
    max_discount_cap?: number;
    starts_at?: Date | null;
    expires_at?: Date | null;
    usage_limit_total?: number | null;
    usage_limit_per_user?: number | null;
    used_count?: number;
    active?: boolean;
}
export interface CouponContext {
    basket_total: number;
    user_id: string;
    now?: Date;
    user_previous_usage?: number;
}
export interface CouponResult {
    ok: true;
    code: string;
    discount: number;
}
export type CouponRejection = 'not_found' | 'inactive' | 'expired' | 'not_started' | 'min_basket_not_met' | 'usage_limit_reached' | 'per_user_limit_reached' | 'invalid_value';
export declare function applyCoupon(coupon: CouponDoc | null, ctx: CouponContext): CouponResult | {
    ok: false;
    reason: CouponRejection;
};
export declare class AdminCouponsController {
    private readonly conn;
    private readonly audit;
    constructor(conn: Connection, audit: AdminAuditService);
    private auditCoupon;
    private get col();
    list(active?: string): Promise<import("bson").Document[]>;
    create(b: any, me: any): Promise<any>;
    update(id: string, b: any, me: any): Promise<any>;
    validate(b: any): Promise<CouponResult | {
        ok: false;
        reason: CouponRejection;
    }>;
    redeem(b: any): Promise<{
        ok: boolean;
        code: string;
        used_count: any;
    }>;
    remove(id: string, b: any, me: any): Promise<{
        ok: boolean;
    }>;
}
