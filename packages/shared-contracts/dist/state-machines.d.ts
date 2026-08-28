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
    NEGOTIATION_REQUIRED = "NEGOTIATION_REQUIRED",
    FINAL_QUOTE_READY = "FINAL_QUOTE_READY",
    FINAL_QUOTE_ACCEPTED = "FINAL_QUOTE_ACCEPTED",
    PAYMENT_PENDING = "PAYMENT_PENDING",
    COD_REGISTERED = "COD_REGISTERED",
    INSURANCE_PROCESSING = "INSURANCE_PROCESSING",
    INSURANCE_DECISION_READY = "INSURANCE_DECISION_READY",
    CO_PAY_PENDING = "CO_PAY_PENDING",
    SELF_PAY_SELECTION = "SELF_PAY_SELECTION",
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
    reason?: string;
    serviceKind?: ServiceKind;
    paymentMethod?: PharmacyPaymentMethod;
    paymentMethodEnabled?: boolean;
    codAllowed?: boolean;
    codRegistered?: boolean;
    codCollected?: boolean;
    codSettled?: boolean;
    paymentVerified?: boolean;
    hasPolicy?: boolean;
    insuranceReady?: boolean;
    insuranceItemsDecided?: boolean;
    coverage?: 'CASH' | 'INSURANCE';
    decision?: 'APPROVED_FULL' | 'APPROVED_PARTIAL' | 'REJECTED';
    coPayAmount?: number;
    coPayAccepted?: boolean;
    selfPayAccepted?: boolean;
    negotiationRequired?: boolean;
    quoteHash?: string;
    quoteRevision?: number;
    refundHandled?: boolean;
    fulfillment?: 'DELIVERY' | 'PICKUP';
    reportUrl?: string;
    documentationComplete?: boolean;
}
/** وسائل إلكترونية قانونية؛ CARD يغطي الشبكات التي تكشفها البوابة، ولا يوجد رصيد أو محفظة عميل. */
export type OnlinePaymentMethod = 'CARD' | 'APPLE_PAY' | 'GOOGLE_PAY';
export type PharmacyPaymentMethod = OnlinePaymentMethod | 'COD';
export interface PaymentMethodCapability {
    method: OnlinePaymentMethod;
    enabled: boolean;
    cardNetworks?: Array<'VISA' | 'MASTERCARD' | 'MADA' | 'AMEX'>;
}
export interface PharmacyInsuranceItemDecision {
    orderItemId: string;
    decision: 'APPROVED_FULL' | 'APPROVED_PARTIAL' | 'REJECTED';
    coveredAmount: number;
    coPayAmount: number;
    authorizationReference?: string;
    reasonCode?: string;
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
