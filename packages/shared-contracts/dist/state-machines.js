"use strict";
/**
 * NABD GOVERNING STATE MACHINES — المرجع التنفيذي للقواعد التجارية الحاكمة
 * المصدر الوحيد للحقيقة: يستهلكه Backend (StateGuard) والعملاء (rendering/disabled).
 * أي انتقال غير معرّف هنا = مرفوض سيرفريًا.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_TRANSITIONS = exports.ServiceBookingState = exports.PHARMACY_TRANSITIONS = exports.PharmacyOrderState = void 0;
// ============================================================
// PH-PHARMACY — الصيدلية (الحاكم)
// ============================================================
var PharmacyOrderState;
(function (PharmacyOrderState) {
    PharmacyOrderState["CART_DRAFT"] = "CART_DRAFT";
    PharmacyOrderState["ORDER_BROADCASTING"] = "ORDER_BROADCASTING";
    PharmacyOrderState["OFFERS_READY"] = "OFFERS_READY";
    PharmacyOrderState["OFFER_SELECTED"] = "OFFER_SELECTED";
    PharmacyOrderState["PAYMENT_PENDING"] = "PAYMENT_PENDING";
    PharmacyOrderState["COD_REGISTERED"] = "COD_REGISTERED";
    PharmacyOrderState["INSURANCE_PROCESSING"] = "INSURANCE_PROCESSING";
    PharmacyOrderState["CO_PAY_PENDING"] = "CO_PAY_PENDING";
    PharmacyOrderState["CONFIRMED"] = "CONFIRMED";
    PharmacyOrderState["PREPARING"] = "PREPARING";
    PharmacyOrderState["READY"] = "READY";
    PharmacyOrderState["DISPATCHED"] = "DISPATCHED";
    PharmacyOrderState["DELIVERED"] = "DELIVERED";
    PharmacyOrderState["RECEIVED"] = "RECEIVED";
    PharmacyOrderState["COMPLETED"] = "COMPLETED";
    PharmacyOrderState["AUTO_CANCELLED"] = "AUTO_CANCELLED";
    PharmacyOrderState["CANCELLED"] = "CANCELLED";
    PharmacyOrderState["PARTIAL_CANCELLED"] = "PARTIAL_CANCELLED";
})(PharmacyOrderState || (exports.PharmacyOrderState = PharmacyOrderState = {}));
/** [from, to, actor, شرط إضافي] */
exports.PHARMACY_TRANSITIONS = [
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
var ServiceBookingState;
(function (ServiceBookingState) {
    ServiceBookingState["DRAFT"] = "DRAFT";
    ServiceBookingState["PAYMENT_PENDING"] = "PAYMENT_PENDING";
    ServiceBookingState["REQUEST_SUBMITTED"] = "REQUEST_SUBMITTED";
    ServiceBookingState["PROVIDER_DECISION_PENDING"] = "PROVIDER_DECISION_PENDING";
    ServiceBookingState["CO_PAY_PENDING"] = "CO_PAY_PENDING";
    ServiceBookingState["COD_REGISTERED"] = "COD_REGISTERED";
    ServiceBookingState["CONFIRMED"] = "CONFIRMED";
    ServiceBookingState["IN_PROGRESS"] = "IN_PROGRESS";
    ServiceBookingState["AWAITING_RESULTS"] = "AWAITING_RESULTS";
    ServiceBookingState["RESULTS_READY"] = "RESULTS_READY";
    ServiceBookingState["COMPLETED"] = "COMPLETED";
    ServiceBookingState["CANCELLED"] = "CANCELLED";
})(ServiceBookingState || (exports.ServiceBookingState = ServiceBookingState = {}));
exports.SERVICE_TRANSITIONS = [
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
