"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESCRIPTION_TRANSITIONS = exports.UNIFIED_TRANSITIONS = exports.ServiceState = exports.EMERGENCY_TRANSITIONS = exports.ORDER_TRANSITIONS = exports.FacilityType = exports.SPECIALTY_MASTER = exports.INSURANCE_COMPANIES = exports.ACADEMIC_DEGREES_LIST = exports.AcademicDegree = exports.NotificationPriority = exports.NotificationType = exports.DeliveryState = exports.AppointmentStatus = exports.AppointmentMode = exports.MedicationDoseState = exports.EmergencyState = exports.PrescriptionState = exports.OrderRejectionReason = exports.OrderState = exports.ProviderStatus = exports.ProviderType = exports.PROVIDER_ROLES = exports.UserRole = void 0;
exports.isProviderRole = isProviderRole;
var UserRole;
(function (UserRole) {
    UserRole["GUEST"] = "guest";
    UserRole["PATIENT"] = "patient";
    UserRole["DOCTOR"] = "doctor";
    UserRole["PHARMACY"] = "pharmacy";
    UserRole["HOSPITAL"] = "hospital";
    UserRole["HOSPITAL_ADMIN"] = "hospital_admin";
    UserRole["BRANCH_ADMIN"] = "branch_admin";
    UserRole["RECEPTIONIST"] = "receptionist";
    UserRole["LAB"] = "lab";
    UserRole["RADIOLOGY"] = "radiology";
    UserRole["HOME_CARE"] = "home_care";
    UserRole["NURSING"] = "nursing";
    UserRole["NURSE"] = "nurse";
    UserRole["AMBULANCE"] = "ambulance";
    UserRole["PHYSIOTHERAPIST"] = "physiotherapist";
    UserRole["ADMIN"] = "admin";
    UserRole["DELIVERY"] = "delivery";
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["SUPPORT_AGENT"] = "support_agent";
    UserRole["FINANCE"] = "finance";
    UserRole["PHARMACIST"] = "pharmacist";
})(UserRole || (exports.UserRole = UserRole = {}));
exports.PROVIDER_ROLES = [
    UserRole.DOCTOR,
    UserRole.PHARMACY,
    UserRole.HOSPITAL,
    UserRole.HOSPITAL_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.LAB,
    UserRole.RADIOLOGY,
    UserRole.HOME_CARE,
    UserRole.NURSING,
    UserRole.NURSE,
    UserRole.PHYSIOTHERAPIST,
    UserRole.DELIVERY,
    UserRole.PHARMACIST,
];
function isProviderRole(role) {
    if (!role)
        return false;
    const r = String(role).toLowerCase();
    return (exports.PROVIDER_ROLES.includes(r) ||
        r === 'provider' ||
        r === UserRole.ADMIN ||
        r === UserRole.SUPER_ADMIN);
}
var ProviderType;
(function (ProviderType) {
    ProviderType["DOCTOR"] = "doctor";
    ProviderType["PHARMACY"] = "pharmacy";
    ProviderType["HOSPITAL"] = "hospital";
    ProviderType["CLINIC"] = "clinic";
    ProviderType["LAB"] = "lab";
    ProviderType["RADIOLOGY"] = "radiology";
    ProviderType["HOME_CARE"] = "home_care";
    ProviderType["NURSING"] = "nursing";
    ProviderType["AMBULANCE"] = "ambulance";
})(ProviderType || (exports.ProviderType = ProviderType = {}));
var ProviderStatus;
(function (ProviderStatus) {
    ProviderStatus["PENDING"] = "pending";
    ProviderStatus["ACTIVE"] = "active";
    ProviderStatus["REJECTED"] = "rejected";
    ProviderStatus["SUSPENDED"] = "suspended";
})(ProviderStatus || (exports.ProviderStatus = ProviderStatus = {}));
var OrderState;
(function (OrderState) {
    OrderState["CREATED"] = "CREATED";
    OrderState["VALIDATED"] = "VALIDATED";
    OrderState["NEW"] = "NEW";
    OrderState["BROADCAST"] = "BROADCAST";
    OrderState["ACCEPTED"] = "ACCEPTED";
    OrderState["PHARMACY_RECEIVED"] = "PHARMACY_RECEIVED";
    OrderState["BASKET_REVIEW"] = "BASKET_REVIEW";
    OrderState["WAITING_PATIENT_APPROVAL"] = "WAITING_PATIENT_APPROVAL";
    OrderState["PAYMENT_COMPLETED"] = "PAYMENT_COMPLETED";
    OrderState["PREPARING"] = "PREPARING";
    OrderState["READY"] = "READY";
    OrderState["READY_FOR_DISPATCH"] = "READY_FOR_DISPATCH";
    OrderState["ASSIGNED_TO_DELIVERY"] = "ASSIGNED_TO_DELIVERY";
    OrderState["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    OrderState["DELIVERED"] = "DELIVERED";
    OrderState["PARTIALLY_FULFILLED"] = "PARTIALLY_FULFILLED";
    OrderState["COMPLETED"] = "COMPLETED";
    OrderState["CANCELLED"] = "CANCELLED";
    OrderState["REJECTED"] = "REJECTED";
    OrderState["ESCALATED_TO_ADMIN"] = "ESCALATED_TO_ADMIN";
    OrderState["PENDING_INSURANCE"] = "PENDING_INSURANCE";
    OrderState["APPROVED"] = "APPROVED";
    OrderState["PARTIAL_APPROVAL"] = "PARTIAL_APPROVAL";
})(OrderState || (exports.OrderState = OrderState = {}));
var OrderRejectionReason;
(function (OrderRejectionReason) {
    OrderRejectionReason["OUT_OF_STOCK_COMPLETELY"] = "OUT_OF_STOCK_COMPLETELY";
    OrderRejectionReason["PRESCRIPTION_INVALID"] = "PRESCRIPTION_INVALID";
    OrderRejectionReason["INSURANCE_ISSUE"] = "INSURANCE_ISSUE";
    OrderRejectionReason["OUT_OF_DELIVERY_ZONE"] = "OUT_OF_DELIVERY_ZONE";
    OrderRejectionReason["PHARMACY_CLOSING"] = "PHARMACY_CLOSING";
})(OrderRejectionReason || (exports.OrderRejectionReason = OrderRejectionReason = {}));
var PrescriptionState;
(function (PrescriptionState) {
    PrescriptionState["CREATED_BY_DOCTOR"] = "CREATED_BY_DOCTOR";
    PrescriptionState["SENT_TO_PHARMACY"] = "SENT_TO_PHARMACY";
    PrescriptionState["PARTIALLY_EDITED"] = "PARTIALLY_EDITED";
    PrescriptionState["APPROVED"] = "APPROVED";
    PrescriptionState["DISPENSED"] = "DISPENSED";
    PrescriptionState["ARCHIVED"] = "ARCHIVED";
})(PrescriptionState || (exports.PrescriptionState = PrescriptionState = {}));
var EmergencyState;
(function (EmergencyState) {
    EmergencyState["TRIGGERED"] = "TRIGGERED";
    EmergencyState["LOCATION_CAPTURED"] = "LOCATION_CAPTURED";
    EmergencyState["ADMIN_NOTIFIED"] = "ADMIN_NOTIFIED";
    EmergencyState["NEAREST_PROVIDER_IDENTIFIED"] = "NEAREST_PROVIDER_IDENTIFIED";
    EmergencyState["DISPATCH_INITIATED"] = "DISPATCH_INITIATED";
    EmergencyState["RESOLVED"] = "RESOLVED";
    EmergencyState["CANCELLED"] = "CANCELLED";
    EmergencyState["CLOSED"] = "CLOSED";
})(EmergencyState || (exports.EmergencyState = EmergencyState = {}));
var MedicationDoseState;
(function (MedicationDoseState) {
    MedicationDoseState["SCHEDULED"] = "SCHEDULED";
    MedicationDoseState["NOTIFIED"] = "NOTIFIED";
    MedicationDoseState["TAKEN"] = "TAKEN";
    MedicationDoseState["MISSED"] = "MISSED";
    MedicationDoseState["SKIPPED_BY_USER"] = "SKIPPED_BY_USER";
})(MedicationDoseState || (exports.MedicationDoseState = MedicationDoseState = {}));
var AppointmentMode;
(function (AppointmentMode) {
    AppointmentMode["CLINIC"] = "clinic";
    AppointmentMode["ONLINE"] = "online";
    AppointmentMode["VIDEO"] = "video";
    AppointmentMode["AUDIO"] = "audio";
    AppointmentMode["HOME"] = "home";
    AppointmentMode["CHAT"] = "chat";
})(AppointmentMode || (exports.AppointmentMode = AppointmentMode = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "scheduled";
    AppointmentStatus["IN_PROGRESS"] = "in_progress";
    AppointmentStatus["COMPLETED"] = "completed";
    AppointmentStatus["CANCELLED"] = "cancelled";
    AppointmentStatus["NO_SHOW"] = "no_show";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
var DeliveryState;
(function (DeliveryState) {
    DeliveryState["UNASSIGNED"] = "UNASSIGNED";
    DeliveryState["ASSIGNED"] = "ASSIGNED";
    DeliveryState["PICKED_UP"] = "PICKED_UP";
    DeliveryState["IN_TRANSIT"] = "IN_TRANSIT";
    DeliveryState["DELIVERED"] = "DELIVERED";
    DeliveryState["FAILED"] = "FAILED";
    DeliveryState["RETURNED"] = "RETURNED";
})(DeliveryState || (exports.DeliveryState = DeliveryState = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "info";
    NotificationType["ORDER"] = "order";
    NotificationType["APPOINTMENT"] = "appointment";
    NotificationType["PRESCRIPTION"] = "prescription";
    NotificationType["EMERGENCY"] = "emergency";
    NotificationType["MEDICATION"] = "medication";
    NotificationType["PROMO"] = "promo";
    NotificationType["ALERT"] = "alert";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["NORMAL"] = "normal";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["CRITICAL"] = "critical";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
var AcademicDegree;
(function (AcademicDegree) {
    AcademicDegree["PROFESSOR"] = "professor";
    AcademicDegree["CONSULTANT"] = "consultant";
    AcademicDegree["SENIOR_SPECIALIST"] = "senior_specialist";
    AcademicDegree["SPECIALIST"] = "specialist";
    AcademicDegree["RESIDENT"] = "resident";
    AcademicDegree["GENERAL_PRACTITIONER"] = "general_practitioner";
})(AcademicDegree || (exports.AcademicDegree = AcademicDegree = {}));
exports.ACADEMIC_DEGREES_LIST = Object.values(AcademicDegree);
exports.INSURANCE_COMPANIES = [
    'bupa', 'tawuniya', 'medgulf', 'medgulf_a', 'medgulf_b', 'medgulf_c',
    'axa', 'rajhi_takaful', 'al_rajhi_takaful', 'walaa', 'malath', 'salama',
    'gulf_union', 'allianz', 'arabian_shield', 'saico', 'alsagr', 'amana',
    'tawuniya_corporate', 'cigna', 'globemed', 'nextcare', 'medivisa', 'mednet',
];
exports.SPECIALTY_MASTER = [
    { slug: 'general_practice', name_ar: 'طب عام', name_en: 'General Practice' },
    { slug: 'family_medicine', name_ar: 'طب الأسرة', name_en: 'Family Medicine' },
    { slug: 'internal_medicine', name_ar: 'باطنة', name_en: 'Internal Medicine' },
    { slug: 'pediatrics', name_ar: 'أطفال', name_en: 'Pediatrics' },
    { slug: 'pediatric_surgery', name_ar: 'جراحة أطفال', name_en: 'Pediatric Surgery' },
    { slug: 'cardiology', name_ar: 'قلب وأوعية', name_en: 'Cardiology' },
    { slug: 'cardiac_surgery', name_ar: 'جراحة قلب', name_en: 'Cardiac Surgery' },
    { slug: 'dermatology', name_ar: 'جلدية', name_en: 'Dermatology' },
    { slug: 'dentistry', name_ar: 'أسنان', name_en: 'Dentistry' },
    { slug: 'ent', name_ar: 'أنف وأذن وحنجرة', name_en: 'ENT' },
    { slug: 'audiology', name_ar: 'سمعيات', name_en: 'Audiology' },
    { slug: 'speech_therapy', name_ar: 'تخاطب', name_en: 'Speech Therapy' },
    { slug: 'ophthalmology', name_ar: 'عيون', name_en: 'Ophthalmology' },
    { slug: 'neurology', name_ar: 'مخ وأعصاب', name_en: 'Neurology' },
    { slug: 'orthopedics', name_ar: 'عظام', name_en: 'Orthopedics' },
    { slug: 'spine_surgery', name_ar: 'جراحة عمود فقري', name_en: 'Spine Surgery' },
    { slug: 'urology', name_ar: 'مسالك بولية', name_en: 'Urology' },
    { slug: 'andrology', name_ar: 'ذكورة وعقم', name_en: 'Andrology & Infertility' },
    { slug: 'nephrology', name_ar: 'كلى', name_en: 'Nephrology' },
    { slug: 'gastroenterology', name_ar: 'جهاز هضمي', name_en: 'Gastroenterology' },
    { slug: 'hepatology', name_ar: 'كبد', name_en: 'Hepatology' },
    { slug: 'endoscopy', name_ar: 'مناظير', name_en: 'Endoscopy' },
    { slug: 'pulmonology', name_ar: 'صدر وجهاز تنفسي', name_en: 'Pulmonology' },
    { slug: 'allergy_immunology', name_ar: 'حساسية ومناعة', name_en: 'Allergy & Immunology' },
    { slug: 'hematology', name_ar: 'أمراض دم', name_en: 'Hematology' },
    { slug: 'oncology', name_ar: 'أورام', name_en: 'Oncology' },
    { slug: 'oncology_surgery', name_ar: 'جراحة أورام', name_en: 'Surgical Oncology' },
    { slug: 'endocrinology', name_ar: 'سكر وغدد', name_en: 'Endocrinology & Diabetes' },
    { slug: 'rheumatology', name_ar: 'روماتيزم', name_en: 'Rheumatology' },
    { slug: 'gynecology', name_ar: 'نساء وولادة', name_en: 'Gynecology & Obstetrics' },
    { slug: 'ivf', name_ar: 'حقن مجهري وأطفال أنابيب', name_en: 'IVF' },
    { slug: 'psychiatry', name_ar: 'نفسي', name_en: 'Psychiatry' },
    { slug: 'psychology', name_ar: 'علاج نفسي', name_en: 'Psychology' },
    { slug: 'general_surgery', name_ar: 'جراحة عامة', name_en: 'General Surgery' },
    { slug: 'vascular_surgery', name_ar: 'جراحة أوعية دموية', name_en: 'Vascular Surgery' },
    { slug: 'plastic_surgery', name_ar: 'جراحة تجميل', name_en: 'Plastic Surgery' },
    { slug: 'bariatric_surgery', name_ar: 'جراحة سمنة', name_en: 'Bariatric Surgery' },
    { slug: 'physiotherapy', name_ar: 'علاج طبيعي', name_en: 'Physiotherapy' },
    { slug: 'nutrition', name_ar: 'تغذية', name_en: 'Nutrition' },
    { slug: 'geriatrics', name_ar: 'كبار السن', name_en: 'Geriatrics' },
    { slug: 'laboratory', name_ar: 'معامل تحاليل', name_en: 'Laboratory' },
    { slug: 'radiology', name_ar: 'مراكز أشعة', name_en: 'Radiology' },
];
var FacilityType;
(function (FacilityType) {
    FacilityType["HOSPITAL"] = "hospital";
    FacilityType["CLINIC"] = "clinic";
    FacilityType["MEDICAL_CENTER"] = "medical_center";
    FacilityType["POLYCLINIC"] = "polyclinic";
})(FacilityType || (exports.FacilityType = FacilityType = {}));
exports.ORDER_TRANSITIONS = {
    [OrderState.CREATED]: [OrderState.VALIDATED, OrderState.CANCELLED],
    [OrderState.VALIDATED]: [OrderState.PHARMACY_RECEIVED, OrderState.CANCELLED],
    [OrderState.PHARMACY_RECEIVED]: [OrderState.ACCEPTED, OrderState.REJECTED, OrderState.CANCELLED],
    [OrderState.ACCEPTED]: [OrderState.PREPARING, OrderState.PARTIALLY_FULFILLED, OrderState.CANCELLED],
    [OrderState.REJECTED]: [OrderState.ESCALATED_TO_ADMIN, OrderState.CANCELLED],
    [OrderState.PARTIALLY_FULFILLED]: [OrderState.PREPARING, OrderState.CANCELLED],
    [OrderState.PREPARING]: [OrderState.READY_FOR_DISPATCH, OrderState.CANCELLED],
    [OrderState.READY_FOR_DISPATCH]: [OrderState.ASSIGNED_TO_DELIVERY, OrderState.DELIVERED, OrderState.CANCELLED],
    [OrderState.ASSIGNED_TO_DELIVERY]: [OrderState.OUT_FOR_DELIVERY, OrderState.CANCELLED],
    [OrderState.OUT_FOR_DELIVERY]: [OrderState.DELIVERED, OrderState.ESCALATED_TO_ADMIN],
    [OrderState.DELIVERED]: [],
    [OrderState.CANCELLED]: [],
    [OrderState.ESCALATED_TO_ADMIN]: [
        OrderState.PHARMACY_RECEIVED,
        OrderState.ASSIGNED_TO_DELIVERY,
        OrderState.CANCELLED,
    ],
    [OrderState.PENDING_INSURANCE]: [OrderState.APPROVED, OrderState.PARTIAL_APPROVAL, OrderState.REJECTED, OrderState.CANCELLED],
    [OrderState.APPROVED]: [OrderState.PREPARING, OrderState.READY_FOR_DISPATCH, OrderState.CANCELLED],
    [OrderState.PARTIAL_APPROVAL]: [OrderState.PREPARING, OrderState.READY_FOR_DISPATCH, OrderState.CANCELLED],
};
exports.EMERGENCY_TRANSITIONS = {
    [EmergencyState.TRIGGERED]: [EmergencyState.LOCATION_CAPTURED, EmergencyState.ADMIN_NOTIFIED, EmergencyState.CANCELLED],
    [EmergencyState.LOCATION_CAPTURED]: [EmergencyState.ADMIN_NOTIFIED, EmergencyState.CANCELLED],
    [EmergencyState.ADMIN_NOTIFIED]: [EmergencyState.NEAREST_PROVIDER_IDENTIFIED, EmergencyState.RESOLVED, EmergencyState.CANCELLED],
    [EmergencyState.NEAREST_PROVIDER_IDENTIFIED]: [EmergencyState.DISPATCH_INITIATED, EmergencyState.RESOLVED, EmergencyState.CANCELLED],
    [EmergencyState.DISPATCH_INITIATED]: [EmergencyState.RESOLVED, EmergencyState.CANCELLED],
    [EmergencyState.RESOLVED]: [EmergencyState.CLOSED],
    [EmergencyState.CANCELLED]: [EmergencyState.CLOSED],
    [EmergencyState.CLOSED]: [],
};
var ServiceState;
(function (ServiceState) {
    ServiceState["REQUESTED"] = "REQUESTED";
    ServiceState["MATCHING"] = "MATCHING";
    ServiceState["ASSIGNED"] = "ASSIGNED";
    ServiceState["CONFIRMED"] = "CONFIRMED";
    ServiceState["IN_PROGRESS"] = "IN_PROGRESS";
    ServiceState["COMPLETED"] = "COMPLETED";
    ServiceState["CANCELLED"] = "CANCELLED";
})(ServiceState || (exports.ServiceState = ServiceState = {}));
exports.UNIFIED_TRANSITIONS = {
    [ServiceState.REQUESTED]: [ServiceState.MATCHING, ServiceState.ASSIGNED, ServiceState.CONFIRMED, ServiceState.CANCELLED],
    [ServiceState.MATCHING]: [ServiceState.ASSIGNED, ServiceState.CONFIRMED, ServiceState.REQUESTED, ServiceState.CANCELLED],
    [ServiceState.ASSIGNED]: [ServiceState.CONFIRMED, ServiceState.IN_PROGRESS, ServiceState.CANCELLED],
    [ServiceState.CONFIRMED]: [ServiceState.IN_PROGRESS, ServiceState.CANCELLED],
    [ServiceState.IN_PROGRESS]: [ServiceState.COMPLETED, ServiceState.CANCELLED],
    [ServiceState.COMPLETED]: [],
    [ServiceState.CANCELLED]: [],
};
exports.PRESCRIPTION_TRANSITIONS = {
    [PrescriptionState.CREATED_BY_DOCTOR]: [PrescriptionState.SENT_TO_PHARMACY, PrescriptionState.ARCHIVED],
    [PrescriptionState.SENT_TO_PHARMACY]: [
        PrescriptionState.PARTIALLY_EDITED,
        PrescriptionState.APPROVED,
        PrescriptionState.ARCHIVED,
    ],
    [PrescriptionState.PARTIALLY_EDITED]: [PrescriptionState.APPROVED, PrescriptionState.ARCHIVED],
    [PrescriptionState.APPROVED]: [PrescriptionState.DISPENSED, PrescriptionState.ARCHIVED],
    [PrescriptionState.DISPENSED]: [PrescriptionState.ARCHIVED],
    [PrescriptionState.ARCHIVED]: [],
};
//# sourceMappingURL=enums.js.map