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
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  COD_REGISTERED = 'COD_REGISTERED',
  INSURANCE_PROCESSING = 'INSURANCE_PROCESSING',
  CO_PAY_PENDING = 'CO_PAY_PENDING',
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
  // المريض يرسل الطلب للبث — بلا أي دفع
  [PharmacyOrderState.CART_DRAFT, PharmacyOrderState.ORDER_BROADCASTING, 'PATIENT', () => true],
  // وصول أول عرض
  [PharmacyOrderState.ORDER_BROADCASTING, PharmacyOrderState.OFFERS_READY, 'SYSTEM', () => true],
  // انتهاء SLA بلا عروض
  [PharmacyOrderState.ORDER_BROADCASTING, PharmacyOrderState.AUTO_CANCELLED, 'SYSTEM', () => true],
  // اختيار عرض واحد — يقفل snapshot السعر/الأصناف
  [PharmacyOrderState.OFFERS_READY, PharmacyOrderState.OFFER_SELECTED, 'PATIENT', (c) => !!c?.offerId],
  // ---- فرع Cash ----
  [PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.PAYMENT_PENDING, 'PATIENT', (c) => c?.paymentMethod === 'CARD'],
  [PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.COD_REGISTERED, 'PATIENT', (c) => c?.paymentMethod === 'COD' && c?.codAllowed === true],
  [PharmacyOrderState.PAYMENT_PENDING, PharmacyOrderState.CONFIRMED, 'PAYMENT_WEBHOOK', (c) => c?.paymentVerified === true],
  [PharmacyOrderState.COD_REGISTERED, PharmacyOrderState.CONFIRMED, 'SYSTEM', () => true], // التأكيد مع تسوية التحصيل لاحقًا عند التسليم
  // ---- فرع التأمين ----
  [PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.INSURANCE_PROCESSING, 'SYSTEM', (c) => c?.hasPolicy === true],
  // قرار الصيدلية/التأمين
  [PharmacyOrderState.INSURANCE_PROCESSING, PharmacyOrderState.CO_PAY_PENDING, 'PHARMACY', (c) => c?.decision === 'APPROVED_FULL' || c?.decision === 'APPROVED_PARTIAL'],
  [PharmacyOrderState.CO_PAY_PENDING, PharmacyOrderState.CONFIRMED, 'PAYMENT_WEBHOOK', (c) => c?.paymentVerified === true || c?.codRegistered === true],
  [PharmacyOrderState.INSURANCE_PROCESSING, PharmacyOrderState.PAYMENT_PENDING, 'PATIENT', (c) => c?.decision === 'REJECTED' && c?.paymentMethod === 'CARD'], // رفض→cash بطاقة
  [PharmacyOrderState.INSURANCE_PROCESSING, PharmacyOrderState.CANCELLED, 'PATIENT', (c) => c?.decision === 'REJECTED'], // رفض→إلغاء
  // ---- الإلغاء المجاني قبل الاختيار ----
  [PharmacyOrderState.CART_DRAFT, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.ORDER_BROADCASTING, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  [PharmacyOrderState.OFFERS_READY, PharmacyOrderState.CANCELLED, 'PATIENT', () => true],
  // بعد الدفع → استرداد عبر RefundService (من DB لا body)
  [PharmacyOrderState.CONFIRMED, PharmacyOrderState.CANCELLED, 'PATIENT', (c) => c?.refundHandled === true],
  // التنفيذ
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
