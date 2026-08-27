/**
 * NABD GOVERNING STATE MACHINES — المرجع التنفيذي للقواعد التجارية الحاكمة
 * المصدر الوحيد للحقيقة: يستهلكه Backend (StateGuard) والعملاء (rendering/disabled).
 * أي انتقال غير معرّف هنا = مرفوض سيرفريًا.
 */
export declare enum PharmacyOrderState {
    CART_DRAFT = "CART_DRAFT",
    ORDER_BROADCASTING = "ORDER_BROADCASTING",
    OFFERS_READY = "OFFERS_READY",
    OFFER_SELECTED = "OFFER_SELECTED",
    PAYMENT_PENDING = "PAYMENT_PENDING",
    COD_REGISTERED = "COD_REGISTERED",
    INSURANCE_PROCESSING = "INSURANCE_PROCESSING",
    CO_PAY_PENDING = "CO_PAY_PENDING",
    CONFIRMED = "CONFIRMED",
    PREPARING = "PREPARING",
    READY = "READY",
    DISPATCHED = "DISPATCHED",
    DELIVERED = "DELIVERED",
    RECEIVED = "RECEIVED",
    COMPLETED = "COMPLETED",
    AUTO_CANCELLED = "AUTO_CANCELLED",
    CANCELLED = "CANCELLED",
    PARTIAL_CANCELLED = "PARTIAL_CANCELLED"
}
export type PharmacyActor = 'PATIENT' | 'PHARMACY' | 'SYSTEM' | 'PAYMENT_WEBHOOK' | 'INSURANCE';
/** [from, to, actor, شرط إضافي] */
export declare const PHARMACY_TRANSITIONS: Array<[PharmacyOrderState, PharmacyOrderState, PharmacyActor, (ctx?: TransitionCtx) => boolean]>;
export declare enum ServiceBookingState {
    DRAFT = "DRAFT",
    PAYMENT_PENDING = "PAYMENT_PENDING",// Cash فقط
    REQUEST_SUBMITTED = "REQUEST_SUBMITTED",// تأمين — بلا دفع
    PROVIDER_DECISION_PENDING = "PROVIDER_DECISION_PENDING",
    CO_PAY_PENDING = "CO_PAY_PENDING",
    COD_REGISTERED = "COD_REGISTERED",
    CONFIRMED = "CONFIRMED",
    IN_PROGRESS = "IN_PROGRESS",// زيارة تمريض / سحب عينة / وصول للمركز
    AWAITING_RESULTS = "AWAITING_RESULTS",// مختبر/أشعة
    RESULTS_READY = "RESULTS_READY",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export type ServiceKind = 'CONSULTATION' | 'NURSING' | 'LAB' | 'RADIOLOGY';
export type ServiceActor = 'PATIENT' | 'PROVIDER' | 'SYSTEM' | 'PAYMENT_WEBHOOK';
export declare const SERVICE_TRANSITIONS: Array<[ServiceBookingState, ServiceBookingState, ServiceActor, ServiceKind[] | null, (ctx?: TransitionCtx) => boolean]>;
export interface TransitionCtx {
    offerId?: string;
    serviceKind?: ServiceKind;
    paymentMethod?: 'CARD' | 'COD';
    codAllowed?: boolean;
    codRegistered?: boolean;
    codCollected?: boolean;
    codSettled?: boolean;
    paymentVerified?: boolean;
    hasPolicy?: boolean;
    coverage?: 'CASH' | 'INSURANCE';
    decision?: 'APPROVED_FULL' | 'APPROVED_PARTIAL' | 'REJECTED';
    refundHandled?: boolean;
    fulfillment?: 'DELIVERY' | 'PICKUP';
    reportUrl?: string;
    documentationComplete?: boolean;
}
export interface OfferItem {
    medicine_id: string;
    requested_qty: number;
    offered_qty: number;
    available: boolean;
    alt_medicine_id?: string;
    unit_price: number;
}
export interface PharmacyOffer {
    id: string;
    order_id: string;
    pharmacy_id: string;
    items: OfferItem[];
    total: number;
    prep_eta_min: number;
    delivery_eta_min?: number;
    fulfillment: 'DELIVERY' | 'PICKUP' | 'BOTH';
    cod_allowed: boolean;
    insurance_ready: boolean;
    created_at: string;
    expires_at: string;
}
export type InsuranceDecisionValue = 'APPROVED_FULL' | 'APPROVED_PARTIAL' | 'REJECTED';
