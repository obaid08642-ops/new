/**
 * NABD GOVERNING STATE MACHINES — المرجع التنفيذي للقواعد التجارية الحاكمة
 * المصدر الوحيد للحقيقة: يستهلكه Backend (StateGuard) والعملاء (rendering/disabled).
 * أي انتقال غير معرّف هنا = مرفوض سيرفريًا.
 */

// ============================================================
// PH-PHARMACY — الصيدلية (الحاكم)
// ============================================================
export enum PharmacyOrderState {
  CART_DRAFT = 'CART_DRAFT',
  ORDER_BROADCASTING = 'ORDER_BROADCASTING',
  OFFERS_READY = 'OFFERS_READY',
  OFFER_SELECTED = 'OFFER_SELECTED',
  NEGOTIATION_REQUIRED = 'NEGOTIATION_REQUIRED',
  FINAL_QUOTE_READY = 'FINAL_QUOTE_READY',
  FINAL_QUOTE_ACCEPTED = 'FINAL_QUOTE_ACCEPTED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  COD_REGISTERED = 'COD_REGISTERED',
  INSURANCE_PROCESSING = 'INSURANCE_PROCESSING',
  INSURANCE_DECISION_READY = 'INSURANCE_DECISION_READY',
  CO_PAY_PENDING = 'CO_PAY_PENDING',
  SELF_PAY_SELECTION = 'SELF_PAY_SELECTION',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
  AUTO_CANCELLED = 'AUTO_CANCELLED',
  CANCELLED = 'CANCELLED',
  PARTIAL_CANCELLED = 'PARTIAL_CANCELLED',
}

export type PharmacyActor = 'PATIENT' | 'PHARMACY' | 'SYSTEM' | 'PAYMENT_WEBHOOK' | 'INSURANCE';

/** [from, to, actor, شرط إضافي] */
export const PHARMACY_TRANSITIONS: Array<[PharmacyOrderState, PharmacyOrderState, PharmacyActor, (ctx?: TransitionCtx) => boolean]> = [
  [PharmacyOrderState.CART_DRAFT, PharmacyOrderState.ORDER_BROADCASTING, 'PATIENT', () => true],
  [PharmacyOrderState.ORDER_BROADCASTING, PharmacyOrderState.OFFERS_READY, 'SYSTEM', () => true],
  [PharmacyOrderState.ORDER_BROADCASTING, PharmacyOrderState.AUTO_CANCELLED, 'SYSTEM', () => true],
  // اختيار العرض لا يفتح الدفع؛ يلزم قبول snapshot نهائي أو تفاوض موثق أولاً.
  [PharmacyOrderState.OFFERS_READY, PharmacyOrderState.OFFER_SELECTED, 'PATIENT', (c) => !!c?.offerId],
  [PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.NEGOTIATION_REQUIRED, 'SYSTEM', (c) => c?.negotiationRequired === true],
  [PharmacyOrderState.NEGOTIATION_REQUIRED, PharmacyOrderState.FINAL_QUOTE_READY, 'PHARMACY', (c) => !!c?.quoteHash && Number.isInteger(c?.quoteRevision) && Number(c?.quoteRevision) > 0],
  [PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.FINAL_QUOTE_ACCEPTED, 'PATIENT', (c) => c?.negotiationRequired === false && hasFinalQuote(c)],
  [PharmacyOrderState.FINAL_QUOTE_READY, PharmacyOrderState.FINAL_QUOTE_ACCEPTED, 'PATIENT', hasFinalQuote],
  // Cash/COD branch: only configured gateway capabilities and policy-eligible COD are accepted.
  [PharmacyOrderState.FINAL_QUOTE_ACCEPTED, PharmacyOrderState.PAYMENT_PENDING, 'PATIENT', (c) => isOnlinePaymentMethod(c?.paymentMethod) && c?.paymentMethodEnabled === true],
  [PharmacyOrderState.FINAL_QUOTE_ACCEPTED, PharmacyOrderState.COD_REGISTERED, 'PATIENT', (c) => c?.paymentMethod === 'COD' && c?.codAllowed === true],
  [PharmacyOrderState.PAYMENT_PENDING, PharmacyOrderState.CONFIRMED, 'PAYMENT_WEBHOOK', (c) => c?.paymentVerified === true],
  [PharmacyOrderState.COD_REGISTERED, PharmacyOrderState.CONFIRMED, 'SYSTEM', () => true],
  // Insurance branch: complete per-item decision, then explicit patient co-pay or self-pay action.
  [PharmacyOrderState.FINAL_QUOTE_ACCEPTED, PharmacyOrderState.INSURANCE_PROCESSING, 'SYSTEM', (c) => c?.hasPolicy === true && c?.insuranceReady === true],
  [PharmacyOrderState.INSURANCE_PROCESSING, PharmacyOrderState.INSURANCE_DECISION_READY, 'PHARMACY', (c) => c?.insuranceItemsDecided === true && isInsuranceDecision(c?.decision)],
  [PharmacyOrderState.INSURANCE_DECISION_READY, PharmacyOrderState.CO_PAY_PENDING, 'PATIENT', (c) => (c?.decision === 'APPROVED_FULL' || c?.decision === 'APPROVED_PARTIAL') && c?.coPayAccepted === true && Number.isFinite(c?.coPayAmount) && Number(c?.coPayAmount) >= 0],
  [PharmacyOrderState.CO_PAY_PENDING, PharmacyOrderState.CONFIRMED, 'PAYMENT_WEBHOOK', (c) => c?.paymentVerified === true || c?.codRegistered === true],
  [PharmacyOrderState.INSURANCE_DECISION_READY, PharmacyOrderState.SELF_PAY_SELECTION, 'PATIENT', (c) => (c?.decision === 'REJECTED' || c?.decision === 'APPROVED_PARTIAL') && c?.selfPayAccepted === true && hasFinalQuote(c)],
  [PharmacyOrderState.SELF_PAY_SELECTION, PharmacyOrderState.FINAL_QUOTE_ACCEPTED, 'PATIENT', hasFinalQuote],
  // الإلغاء مجاني حتى التأكيد؛ بعده يمر عبر RefundService مع إثبات تعويض خادمي.
  [PharmacyOrderState.CART_DRAFT, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.ORDER_BROADCASTING, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.OFFERS_READY, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.NEGOTIATION_REQUIRED, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.FINAL_QUOTE_READY, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.FINAL_QUOTE_ACCEPTED, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.INSURANCE_PROCESSING, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.INSURANCE_DECISION_READY, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.CO_PAY_PENDING, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.SELF_PAY_SELECTION, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.CONFIRMED, PharmacyOrderState.CANCELLED, 'PATIENT', (c) => c?.refundHandled === true],
  [PharmacyOrderState.CONFIRMED, PharmacyOrderState.PREPARING, 'PHARMACY', () => true],
  [PharmacyOrderState.PREPARING, PharmacyOrderState.READY, 'PHARMACY', (c) => c?.fulfillment === 'PICKUP'],
  [PharmacyOrderState.PREPARING, PharmacyOrderState.DISPATCHED, 'PHARMACY', (c) => c?.fulfillment === 'DELIVERY'],
  [PharmacyOrderState.READY, PharmacyOrderState.RECEIVED, 'PHARMACY', () => true],
  [PharmacyOrderState.DISPATCHED, PharmacyOrderState.DELIVERED, 'PHARMACY', (c) => c?.codCollected !== undefined],
  [PharmacyOrderState.RECEIVED, PharmacyOrderState.COMPLETED, 'SYSTEM', () => true],
  [PharmacyOrderState.DELIVERED, PharmacyOrderState.COMPLETED, 'SYSTEM', (c) => c?.codSettled !== false],
];

// ============================================================
// PH-SERVICE — الاستشارات / التمريض / المختبر / الأشعة (الحاكم)
// ============================================================
export enum ServiceBookingState {
  DRAFT = 'DRAFT',
  PAYMENT_PENDING = 'PAYMENT_PENDING',        // Cash فقط
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',    // تأمين — بلا دفع
  PROVIDER_DECISION_PENDING = 'PROVIDER_DECISION_PENDING',
  CO_PAY_PENDING = 'CO_PAY_PENDING',
  COD_REGISTERED = 'COD_REGISTERED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',               // زيارة تمريض / سحب عينة / وصول للمركز
  AWAITING_RESULTS = 'AWAITING_RESULTS',      // مختبر/أشعة
  RESULTS_READY = 'RESULTS_READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export type ServiceKind = 'CONSULTATION' | 'NURSING' | 'LAB' | 'RADIOLOGY';
export type ServiceActor = 'PATIENT' | 'PROVIDER' | 'SYSTEM' | 'PAYMENT_WEBHOOK';

export const SERVICE_TRANSITIONS: Array<[ServiceBookingState, ServiceBookingState, ServiceActor, ServiceKind[] | null, (ctx?: TransitionCtx) => boolean]> = [
  // Cash: دفع مباشر بعد الاختيار لتأكيد الحجز
  [ServiceBookingState.DRAFT, ServiceBookingState.PAYMENT_PENDING, 'PATIENT', ['CONSULTATION', 'NURSING', 'LAB', 'RADIOLOGY'], (c) => c?.coverage === 'CASH'],
  [ServiceBookingState.PAYMENT_PENDING, ServiceBookingState.CONFIRMED, 'PAYMENT_WEBHOOK', ['CONSULTATION', 'NURSING', 'LAB', 'RADIOLOGY'], (c) => c?.paymentVerified === true],
  // تأمين: طلب بلا دفع
  [ServiceBookingState.DRAFT, ServiceBookingState.REQUEST_SUBMITTED, 'PATIENT', ['CONSULTATION', 'NURSING', 'LAB', 'RADIOLOGY'], (c) => c?.coverage === 'INSURANCE'],
  [ServiceBookingState.REQUEST_SUBMITTED, ServiceBookingState.PROVIDER_DECISION_PENDING, 'SYSTEM', ['CONSULTATION', 'NURSING', 'LAB', 'RADIOLOGY'], () => true],
  [ServiceBookingState.PROVIDER_DECISION_PENDING, ServiceBookingState.CO_PAY_PENDING, 'PROVIDER', ['CONSULTATION', 'NURSING', 'LAB', 'RADIOLOGY'], (c) => c?.decision === 'APPROVED_FULL' || c?.decision === 'APPROVED_PARTIAL'],
  [ServiceBookingState.CO_PAY_PENDING, ServiceBookingState.CONFIRMED, 'PAYMENT_WEBHOOK', ['CONSULTATION', 'NURSING', 'LAB', 'RADIOLOGY'], (c) => c?.paymentVerified === true || c?.codRegistered === true],
  [ServiceBookingState.PROVIDER_DECISION_PENDING, ServiceBookingState.PAYMENT_PENDING, 'PATIENT', ['CONSULTATION', 'NURSING', 'LAB', 'RADIOLOGY'], (c) => c?.decision === 'REJECTED'],
  // إلغاء قبل التأكيد مجاني
  [ServiceBookingState.DRAFT, ServiceBookingState.CANCELLED, 'PATIENT', null, () => true],
  [ServiceBookingState.REQUEST_SUBMITTED, ServiceBookingState.CANCELLED, 'PATIENT', null, () => true],
  [ServiceBookingState.PROVIDER_DECISION_PENDING, ServiceBookingState.CANCELLED, 'PATIENT', null, () => true],
  // التنفيذ بعد التأكيد
  [ServiceBookingState.CONFIRMED, ServiceBookingState.IN_PROGRESS, 'PROVIDER', ['CONSULTATION', 'NURSING', 'LAB', 'RADIOLOGY'], () => true],
  [ServiceBookingState.IN_PROGRESS, ServiceBookingState.AWAITING_RESULTS, 'PROVIDER', ['LAB', 'RADIOLOGY'], () => true],
  [ServiceBookingState.IN_PROGRESS, ServiceBookingState.COMPLETED, 'PROVIDER', ['CONSULTATION', 'NURSING'], (c) => c?.documentationComplete === true],
  [ServiceBookingState.AWAITING_RESULTS, ServiceBookingState.RESULTS_READY, 'PROVIDER', ['LAB', 'RADIOLOGY'], (c) => !!c?.reportUrl],
  [ServiceBookingState.RESULTS_READY, ServiceBookingState.COMPLETED, 'SYSTEM', ['LAB', 'RADIOLOGY'], () => true],
];

// ============================================================
// أنواع مشتركة
// ============================================================
export interface TransitionCtx {
  offerId?: string;
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

function isOnlinePaymentMethod(value: unknown): value is OnlinePaymentMethod {
  return value === 'CARD' || value === 'APPLE_PAY' || value === 'GOOGLE_PAY';
}

function isInsuranceDecision(value: unknown): value is InsuranceDecisionValue {
  return value === 'APPROVED_FULL' || value === 'APPROVED_PARTIAL' || value === 'REJECTED';
}

function hasFinalQuote(ctx?: TransitionCtx): boolean {
  return Boolean(ctx?.quoteHash) && Number.isInteger(ctx?.quoteRevision) && Number(ctx?.quoteRevision) > 0;
}

export interface OfferItem {
  medicine_id: string;
  requested_qty: number;
  offered_qty: number;
  available: boolean;
  alt_medicine_id?: string;
  unit_price: number; // سيرفري من كتالوج الصيدلية
}

export interface PharmacyOffer {
  id: string;
  order_id: string;
  pharmacy_id: string;
  items: OfferItem[];
  total: number;            // يحسب سيرفريًا من items
  prep_eta_min: number;
  delivery_eta_min?: number;
  fulfillment: 'DELIVERY' | 'PICKUP' | 'BOTH';
  cod_allowed: boolean;
  insurance_ready: boolean;
  created_at: string;
  expires_at: string;
}

export type InsuranceDecisionValue = 'APPROVED_FULL' | 'APPROVED_PARTIAL' | 'REJECTED';
