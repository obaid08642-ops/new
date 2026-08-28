import { Document } from 'mongoose';
import { OrderState, OrderRejectionReason } from '../common/enums';
import { InsuranceDetails } from './insurance.schema';
export declare class OrderResult {
    name: string;
    result: string;
    reference: string;
    isAbnormal: boolean;
    unit: string;
}
export declare const OrderResultSchema: import("mongoose").Schema<OrderResult, import("mongoose").Model<OrderResult, any, any, any, Document<unknown, any, OrderResult, any, {}> & OrderResult & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrderResult, Document<unknown, {}, import("mongoose").FlatRecord<OrderResult>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<OrderResult> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class OrderItem {
    medicine_id: string;
    name_ar: string;
    name_en?: string;
    qty: number;
    price: number;
    image?: string;
    is_manual_entry: boolean;
    is_substitute: boolean;
    substituted_from?: string;
    unavailable: boolean;
    isCovered?: boolean;
    rejectReason?: string;
    cashPrice?: number;
    optInCash: boolean;
}
export declare const OrderItemSchema: import("mongoose").Schema<OrderItem, import("mongoose").Model<OrderItem, any, any, any, Document<unknown, any, OrderItem, any, {}> & OrderItem & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrderItem, Document<unknown, {}, import("mongoose").FlatRecord<OrderItem>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<OrderItem> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class StateTransition {
    from: string;
    to: string;
    by_user_id: string;
    by_role?: string;
    reason?: string;
    at: Date;
}
export declare const StateTransitionSchema: import("mongoose").Schema<StateTransition, import("mongoose").Model<StateTransition, any, any, any, Document<unknown, any, StateTransition, any, {}> & StateTransition & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, StateTransition, Document<unknown, {}, import("mongoose").FlatRecord<StateTransition>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<StateTransition> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Order {
    id: string;
    patient_id: string;
    patient_name?: string;
    patient_phone?: string;
    pharmacy_id?: string;
    prescription_id?: string;
    items: OrderItem[];
    subtotal: number;
    delivery_fee: number;
    total: number;
    state: OrderState;
    state_history: StateTransition[];
    timeline: {
        ts: Date;
        event: string;
        by: string;
    }[];
    delivery_mode: string;
    delivery_address?: {
        lat?: number;
        lng?: number;
        address: string;
        district: string;
        city: string;
    };
    delivery_id?: string;
    escalated: boolean;
    rejection_reason?: OrderRejectionReason;
    rejected_by?: string;
    notes?: string;
    payment_method: string;
    payment_status: string;
    wallet_applied?: number;
    coupon_code?: string;
    coupon_discount?: number;
    loyalty_points_used?: number;
    loyalty_discount?: number;
    price_before_discounts?: number;
    refund_status?: string;
    paid_at?: Date;
    paid_via?: string;
    refunded_at?: Date;
    cancellation_fee?: number;
    cancellation_fee_reason?: string;
    dispatch?: {
        current_radius_km: number;
        attempts: {
            radius_km: number;
            candidates: {
                pharmacy_id: string;
                distance_km: number;
                available_count: number;
                total_requested: number;
                score: number;
                status: 'pending' | 'accepted' | 'rejected' | 'timeout';
            }[];
            at: Date;
        }[];
        selected_pharmacy_id?: string;
        selection_reason?: string;
        started_at: Date;
    };
    is_split: boolean;
    parent_order_id?: string;
    sub_order_ids: string[];
    basket_review_status: string;
    pre_review_items: OrderItem[];
    pre_review_total: number;
    basket_submitted_at?: Date;
    basket_decided_at?: Date;
    pharmacy_basket_note?: string;
    transaction_id?: string;
    insurance_status: string;
    insurance_provider?: string;
    insurance_member_id?: string;
    insurance_card_image?: string;
    insurance_reject_reason?: string;
    insurance_decided_at?: Date;
    insurance_copay?: number;
    insurance_details?: InsuranceDetails;
    results: OrderResult[];
}
export type OrderDocument = Order & Document;
export declare const OrderSchema: import("mongoose").Schema<Order, import("mongoose").Model<Order, any, any, any, Document<unknown, any, Order, any, {}> & Order & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Order, Document<unknown, {}, import("mongoose").FlatRecord<Order>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Order> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class PharmacyBid extends Document {
    id: string;
    prescription_request_id: string;
    pharmacy_id: string;
    items: Array<{
        medicine_id?: string;
        name_ar: string;
        price: number;
        available: boolean;
        alternative_name?: string;
    }>;
    total_price: number;
    expires_at: Date;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
}
export declare const PharmacyBidSchema: import("mongoose").Schema<PharmacyBid, import("mongoose").Model<PharmacyBid, any, any, any, Document<unknown, any, PharmacyBid, any, {}> & PharmacyBid & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyBid, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyBid>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyBid> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
