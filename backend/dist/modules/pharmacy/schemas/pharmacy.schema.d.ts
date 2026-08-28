import { Document } from 'mongoose';
import { InsuranceDetails } from '../../../schemas/insurance.schema';
export declare enum PharmacyOrderState {
    DRAFT = "draft",
    INTAKE_PROCESSING = "intake_processing",
    READY_FOR_SPLIT = "ready_for_split",
    BROADCASTING = "broadcasting",
    AWAITING_FULL_ACCEPTANCE = "awaiting_full_acceptance",
    NEGOTIATING_SUBSTITUTES = "negotiating_substitutes",
    ALLOCATING = "allocating",
    PARTIALLY_ALLOCATED = "partially_allocated",
    FULLY_ALLOCATED = "fully_allocated",
    OFFER_SELECTION_PENDING = "offer_selection_pending",
    CASH_CARD_PAYMENT_PENDING = "cash_card_payment_pending",
    COD_DUE_ON_DELIVERY = "cod_due_on_delivery",
    INSURANCE_DECISION_PENDING = "insurance_decision_pending",
    WAITING_COPAY = "waiting_copay",
    MANUAL_REVIEW = "manual_review",
    CONFIRMED = "confirmed",
    IN_FULFILLMENT = "in_fulfillment",
    OUT_FOR_DELIVERY = "out_for_delivery",
    DELIVERED = "delivered",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum PharmacyAllocationState {
    PENDING_REVIEW = "pending_review",
    PARTIALLY_CONFIRMED = "partially_confirmed",
    CONFIRMED = "confirmed",
    PREPARING = "preparing",
    READY_FOR_PICKUP = "ready_for_pickup",
    OUT_FOR_DELIVERY = "out_for_delivery",
    DELIVERED = "delivered",
    REJECTED = "rejected",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
export declare enum PrescriptionIntakeState {
    QUEUED = "queued",
    PROCESSING = "processing",
    PARSED = "parsed",
    FAILED = "failed",
    MANUAL_REVIEW = "manual_review",
    COMPLETED = "completed"
}
export declare enum AllocationItemAction {
    AVAILABLE = "available",
    SUBSTITUTE = "substitute",
    UNAVAILABLE = "unavailable"
}
export declare enum OrderItemMatchStatus {
    UNRESOLVED = "unresolved",
    MATCHED = "matched",
    MANUAL = "manual"
}
export declare const ORDER_TRANSITIONS: Record<PharmacyOrderState, PharmacyOrderState[]>;
export declare const ALLOCATION_TRANSITIONS: Record<PharmacyAllocationState, PharmacyAllocationState[]>;
export declare class PharmacyOrder extends Document {
    id: string;
    patient_account_id: string;
    status: PharmacyOrderState;
    intake_id?: string;
    items: Array<{
        id: string;
        raw_name: string;
        name_ar?: string;
        name_en?: string;
        generic_name?: string;
        dosage?: string;
        form?: string;
        frequency?: string;
        duration?: string;
        qty: number;
        match_status: OrderItemMatchStatus;
        matched_sku?: string;
        matched_inventory_id?: string;
        unit_price?: number;
        confidence?: number;
        substituted_from?: string;
        intake_source?: 'ocr' | 'voice' | 'text' | 'manual';
        notes?: string;
    }>;
    delivery_address?: {
        city?: string;
        district?: string;
        street?: string;
        geo?: {
            lat: number;
            lng: number;
        };
        notes?: string;
    };
    patient_notes?: string;
    prescription_attachments?: Array<{
        type: 'image' | 'pdf' | 'voice' | 'text';
        uri?: string;
        base64?: string;
        intake_id?: string;
    }>;
    totals: {
        subtotal: number;
        delivery_fee: number;
        total: number;
        currency: string;
    };
    service_fee: number;
    home_visit_fee: number;
    transportation_fee: number;
    total_price: number;
    insurance_details?: InsuranceDetails;
    pharmacy_basket?: Array<any>;
    insurance_status?: string;
    copay?: number;
    insurance_evaluation?: any;
    allocations: string[];
    splits_count: number;
    split_strategy: 'single' | 'multi';
    scheduled_at?: Date;
    selected_offer_id?: string;
    selected_offer_version?: number;
    selected_allocation_id?: string;
    offer_selection_idempotency_key?: string;
    pricing_snapshot?: {
        offer_id: string;
        offer_version: number;
        totals: {
            subtotal: number;
            delivery_fee: number;
            total: number;
            currency: string;
        };
        captured_at: Date;
    };
    split_decision?: {
        ran_at: Date;
        total_candidates_considered: number;
        candidates_ranked: Array<{
            pharmacy_account_id: string;
            pharmacy_name?: string;
            distance_km?: number;
            coverage_full: number;
            coverage_partial: number;
            total_score: number;
            breakdown: Record<string, number>;
            included: boolean;
            reason_excluded?: string;
        }>;
        rounds: Array<{
            round: number;
            remaining_items_before: number;
            selected_pharmacy_account_id: string;
            items_assigned: string[];
            items_remaining_after: number;
        }>;
        final_uncovered_items: string[];
        splits_count: number;
        notes?: string;
    };
    timeline: Array<{
        ts: Date;
        event: string;
        by?: string;
        meta?: any;
    }>;
    cancellation_reason?: string;
}
export declare const PharmacyOrderSchema: import("mongoose").Schema<PharmacyOrder, import("mongoose").Model<PharmacyOrder, any, any, any, Document<unknown, any, PharmacyOrder, any, {}> & PharmacyOrder & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyOrder, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyOrder>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyOrder> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PharmacyAllocation extends Document {
    id: string;
    order_id: string;
    pharmacy_account_id: string;
    offer_id: string;
    offer_version: number;
    status: PharmacyAllocationState;
    items: Array<{
        id: string;
        order_item_id: string;
        action: AllocationItemAction;
        inventory_id?: string;
        sku?: string;
        name?: string;
        qty_requested: number;
        qty_offered: number;
        unit_price?: number;
        substitute_for_sku?: string;
        substitute_reason?: string;
        notes?: string;
        updated_at?: Date;
    }>;
    totals: {
        subtotal: number;
        delivery_fee: number;
        total: number;
        currency: string;
    };
    distance_km?: number;
    estimated_preparation_minutes?: number;
    estimated_ready_at?: Date;
    review_expires_at?: Date;
    delivery?: {
        method?: 'pharmacy_delivery' | 'pickup';
        courier_name?: string;
        courier_phone?: string;
        eta?: Date;
        delivered_at?: Date;
    };
    timeline: Array<{
        ts: Date;
        event: string;
        by?: string;
        meta?: any;
    }>;
    notes_from_provider?: string;
    match_breakdown?: any;
    cancellation_reason?: string;
    rejection_reason?: string;
}
export declare const PharmacyAllocationSchema: import("mongoose").Schema<PharmacyAllocation, import("mongoose").Model<PharmacyAllocation, any, any, any, Document<unknown, any, PharmacyAllocation, any, {}> & PharmacyAllocation & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyAllocation, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyAllocation>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyAllocation> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PrescriptionIntake extends Document {
    id: string;
    patient_account_id: string;
    type: string;
    source_uri?: string;
    source_base64?: string;
    raw_text?: string;
    parser?: string;
    parser_provider_used?: string;
    parser_attempted: string[];
    status: PrescriptionIntakeState;
    parsed_items: any[];
    unresolved_items: any[];
    confidence: number;
    error?: string;
    processed_at?: Date;
}
export declare const PrescriptionIntakeSchema: import("mongoose").Schema<PrescriptionIntake, import("mongoose").Model<PrescriptionIntake, any, any, any, Document<unknown, any, PrescriptionIntake, any, {}> & PrescriptionIntake & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PrescriptionIntake, Document<unknown, {}, import("mongoose").FlatRecord<PrescriptionIntake>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PrescriptionIntake> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PharmacySubstituteMap extends Document {
    id: string;
    brand_sku: string;
    generic_name: string;
    substitute_brands: Array<{
        sku: string;
        name_ar?: string;
        name_en?: string;
    }>;
    dosage?: string;
    form?: string;
    source: string;
}
export declare const PharmacySubstituteMapSchema: import("mongoose").Schema<PharmacySubstituteMap, import("mongoose").Model<PharmacySubstituteMap, any, any, any, Document<unknown, any, PharmacySubstituteMap, any, {}> & PharmacySubstituteMap & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacySubstituteMap, Document<unknown, {}, import("mongoose").FlatRecord<PharmacySubstituteMap>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacySubstituteMap> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PharmacyLowStockAlert extends Document {
    id: string;
    pharmacy_account_id: string;
    inventory_item_id: string;
    sku: string;
    name: string;
    current_stock: number;
    threshold: number;
    status: string;
    raised_at?: Date;
    resolved_at?: Date;
}
export declare const PharmacyLowStockAlertSchema: import("mongoose").Schema<PharmacyLowStockAlert, import("mongoose").Model<PharmacyLowStockAlert, any, any, any, Document<unknown, any, PharmacyLowStockAlert, any, {}> & PharmacyLowStockAlert & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyLowStockAlert, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyLowStockAlert>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyLowStockAlert> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PharmacyBroadcast extends Document {
    id: string;
    order_id: string;
    patient_account_id: string;
    current_round: number;
    current_radius_km: number;
    max_radius_km: number;
    round_radii_km: number[];
    extended_stage?: boolean;
    lock_state: string;
    locked_to_pharmacy_account_id?: string;
    locked_at?: Date;
    responses: Array<{
        pharmacy_account_id: string;
        pharmacy_name?: string;
        distance_km?: number;
        response: 'have_all' | 'partial' | 'declined' | 'no_response';
        items: Array<{
            order_item_id: string;
            have: 'yes' | 'no' | 'alternative';
            qty_available?: number;
            unit_price?: number;
            alternative?: {
                sku?: string;
                name?: string;
                active_ingredient?: string;
                brand?: string;
                dosage?: string;
                form?: string;
                image_uri?: string;
                notes?: string;
            };
        }>;
        eta_minutes?: number;
        delivery_fee?: number;
        responded_at: Date;
    }>;
    notified_pharmacies: string[];
    round_expires_at?: Date;
    expiry_claim?: {
        token: string;
        claimed_at: Date;
        lease_expires_at: Date;
    };
    timeline: Array<{
        ts: Date;
        event: string;
        meta?: any;
    }>;
}
export declare const PharmacyBroadcastSchema: import("mongoose").Schema<PharmacyBroadcast, import("mongoose").Model<PharmacyBroadcast, any, any, any, Document<unknown, any, PharmacyBroadcast, any, {}> & PharmacyBroadcast & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyBroadcast, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyBroadcast>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyBroadcast> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PharmacyOffer extends Document {
    id: string;
    order_id: string;
    broadcast_id: string;
    patient_account_id: string;
    pharmacy_account_id: string;
    status: string;
    version: number;
    items: Array<{
        order_item_id: string;
        action: 'available' | 'unavailable' | 'substitute';
        qty_requested: number;
        qty_offered: number;
        inventory_item_id?: string;
        sku?: string;
        name_ar?: string;
        name_en?: string;
        unit_price?: number;
        currency?: string;
        inventory_price_updated_at?: Date;
    }>;
    totals: {
        subtotal: number;
        delivery_fee: number;
        total: number;
        currency: string;
    };
    quote_expires_at: Date;
    expired_at?: Date;
    expiry_claim?: {
        token: string;
        claimed_at: Date;
        lease_expires_at: Date;
    };
    estimated_preparation_minutes?: number;
    fulfillment?: {
        policy_status: 'configured' | 'unavailable_read_only';
        delivery_option?: 'delivery' | 'pickup' | null;
        eta_minutes?: number | null;
        delivery_fee_source?: string;
    };
    pricing_source: string;
    created_by?: string;
    updated_by?: string;
    submitted_at?: Date;
    selected_at?: Date;
    selected_by_patient_account_id?: string;
    allocation_id?: string;
    timeline: Array<{
        ts: Date;
        event: string;
        by?: string;
        meta?: any;
    }>;
}
export declare const PharmacyOfferSchema: import("mongoose").Schema<PharmacyOffer, import("mongoose").Model<PharmacyOffer, any, any, any, Document<unknown, any, PharmacyOffer, any, {}> & PharmacyOffer & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyOffer, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyOffer>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyOffer> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PharmacyChatThread extends Document {
    id: string;
    order_id: string;
    patient_account_id: string;
    pharmacy_account_id: string;
    order_item_id: string;
    status: string;
    last_message_at?: Date;
    auto_close_at?: Date;
    resolution?: 'accepted' | 'rejected' | 'removed' | 'cancelled' | 'timeout';
}
export declare const PharmacyChatThreadSchema: import("mongoose").Schema<PharmacyChatThread, import("mongoose").Model<PharmacyChatThread, any, any, any, Document<unknown, any, PharmacyChatThread, any, {}> & PharmacyChatThread & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyChatThread, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyChatThread>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyChatThread> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class PharmacyChatMessage extends Document {
    id: string;
    thread_id: string;
    sender_account_id: string;
    sender_role: string;
    text?: string;
    image_uri?: string;
    substitute_offer?: {
        sku?: string;
        name?: string;
        active_ingredient?: string;
        brand?: string;
        dosage?: string;
        form?: string;
        image_uri?: string;
        price?: number;
        notes?: string;
    };
    blocked: boolean;
    blocked_reason?: string;
}
export declare const PharmacyChatMessageSchema: import("mongoose").Schema<PharmacyChatMessage, import("mongoose").Model<PharmacyChatMessage, any, any, any, Document<unknown, any, PharmacyChatMessage, any, {}> & PharmacyChatMessage & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyChatMessage, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyChatMessage>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyChatMessage> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class DrugShortageFlag extends Document {
    id: string;
    sku?: string;
    generic_name?: string;
    name_ar?: string;
    dosage?: string;
    form?: string;
    source: string;
    reported_by_pharmacy_account_id?: string;
    status: string;
    reason?: string;
    approved_by?: string;
    approved_at?: Date;
    resolved_at?: Date;
}
export declare const DrugShortageFlagSchema: import("mongoose").Schema<DrugShortageFlag, import("mongoose").Model<DrugShortageFlag, any, any, any, Document<unknown, any, DrugShortageFlag, any, {}> & DrugShortageFlag & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DrugShortageFlag, Document<unknown, {}, import("mongoose").FlatRecord<DrugShortageFlag>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DrugShortageFlag> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const PHARMACY_SCHEMAS: ({
    name: string;
    schema: import("mongoose").Schema<PharmacyOrder, import("mongoose").Model<PharmacyOrder, any, any, any, Document<unknown, any, PharmacyOrder, any, {}> & PharmacyOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyOrder, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyOrder>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyOrder> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
} | {
    name: string;
    schema: import("mongoose").Schema<PharmacyAllocation, import("mongoose").Model<PharmacyAllocation, any, any, any, Document<unknown, any, PharmacyAllocation, any, {}> & PharmacyAllocation & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyAllocation, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyAllocation>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyAllocation> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
} | {
    name: string;
    schema: import("mongoose").Schema<PrescriptionIntake, import("mongoose").Model<PrescriptionIntake, any, any, any, Document<unknown, any, PrescriptionIntake, any, {}> & PrescriptionIntake & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PrescriptionIntake, Document<unknown, {}, import("mongoose").FlatRecord<PrescriptionIntake>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PrescriptionIntake> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
} | {
    name: string;
    schema: import("mongoose").Schema<PharmacySubstituteMap, import("mongoose").Model<PharmacySubstituteMap, any, any, any, Document<unknown, any, PharmacySubstituteMap, any, {}> & PharmacySubstituteMap & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacySubstituteMap, Document<unknown, {}, import("mongoose").FlatRecord<PharmacySubstituteMap>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacySubstituteMap> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
} | {
    name: string;
    schema: import("mongoose").Schema<PharmacyLowStockAlert, import("mongoose").Model<PharmacyLowStockAlert, any, any, any, Document<unknown, any, PharmacyLowStockAlert, any, {}> & PharmacyLowStockAlert & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyLowStockAlert, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyLowStockAlert>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyLowStockAlert> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
} | {
    name: string;
    schema: import("mongoose").Schema<PharmacyBroadcast, import("mongoose").Model<PharmacyBroadcast, any, any, any, Document<unknown, any, PharmacyBroadcast, any, {}> & PharmacyBroadcast & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyBroadcast, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyBroadcast>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyBroadcast> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
} | {
    name: string;
    schema: import("mongoose").Schema<PharmacyOffer, import("mongoose").Model<PharmacyOffer, any, any, any, Document<unknown, any, PharmacyOffer, any, {}> & PharmacyOffer & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyOffer, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyOffer>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyOffer> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
} | {
    name: string;
    schema: import("mongoose").Schema<PharmacyChatThread, import("mongoose").Model<PharmacyChatThread, any, any, any, Document<unknown, any, PharmacyChatThread, any, {}> & PharmacyChatThread & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyChatThread, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyChatThread>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyChatThread> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
} | {
    name: string;
    schema: import("mongoose").Schema<PharmacyChatMessage, import("mongoose").Model<PharmacyChatMessage, any, any, any, Document<unknown, any, PharmacyChatMessage, any, {}> & PharmacyChatMessage & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyChatMessage, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyChatMessage>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyChatMessage> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
} | {
    name: string;
    schema: import("mongoose").Schema<DrugShortageFlag, import("mongoose").Model<DrugShortageFlag, any, any, any, Document<unknown, any, DrugShortageFlag, any, {}> & DrugShortageFlag & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DrugShortageFlag, Document<unknown, {}, import("mongoose").FlatRecord<DrugShortageFlag>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DrugShortageFlag> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
})[];
