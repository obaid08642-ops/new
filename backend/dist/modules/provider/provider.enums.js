"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PERMISSIONS_BY_ROLE = exports.OperatorPermission = exports.OperatorRole = exports.PROVIDER_STATUS_TRANSITIONS = exports.ProviderAccountStatus = exports.REQUIRED_DOCS_BY_PROVIDER_TYPE = exports.ProviderDocumentType = exports.HOSPITAL_SUB_MODULES = exports.ProviderType = void 0;
var ProviderType;
(function (ProviderType) {
    ProviderType["PHARMACY"] = "pharmacy";
    ProviderType["HOSPITAL"] = "hospital";
    ProviderType["CLINIC"] = "clinic";
    ProviderType["DOCTOR"] = "doctor";
    ProviderType["LABORATORY"] = "laboratory";
    ProviderType["RADIOLOGY"] = "radiology";
    ProviderType["HOME_CARE"] = "home_care";
    ProviderType["NURSING"] = "nursing";
    ProviderType["PHYSIOTHERAPY"] = "physiotherapy";
    ProviderType["AMBULANCE"] = "ambulance";
    ProviderType["MEDICAL_SUPPLIER"] = "medical_supplier";
    ProviderType["NUTRITION"] = "nutrition";
    ProviderType["MENTAL_HEALTH"] = "mental_health";
    ProviderType["TELEMEDICINE"] = "telemedicine";
})(ProviderType || (exports.ProviderType = ProviderType = {}));
exports.HOSPITAL_SUB_MODULES = ['doctors', 'pharmacy', 'laboratory', 'radiology', 'home_care', 'emergency'];
var ProviderDocumentType;
(function (ProviderDocumentType) {
    ProviderDocumentType["NATIONAL_ID"] = "national_id";
    ProviderDocumentType["COMMERCIAL_REGISTRATION"] = "commercial_registration";
    ProviderDocumentType["MEDICAL_LICENSE"] = "medical_license";
    ProviderDocumentType["VAT_CERTIFICATE"] = "vat_certificate";
    ProviderDocumentType["TAX_NUMBER"] = "tax_number";
    ProviderDocumentType["ZAKAT_CERTIFICATE"] = "zakat_certificate";
    ProviderDocumentType["IBAN_LETTER"] = "iban_letter";
    ProviderDocumentType["FACILITY_LICENSE"] = "facility_license";
    ProviderDocumentType["PROFESSIONAL_CV"] = "professional_cv";
    ProviderDocumentType["PROFILE_PHOTO"] = "profile_photo";
    ProviderDocumentType["OTHER"] = "other";
})(ProviderDocumentType || (exports.ProviderDocumentType = ProviderDocumentType = {}));
exports.REQUIRED_DOCS_BY_PROVIDER_TYPE = {
    [ProviderType.PHARMACY]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.FACILITY_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.HOSPITAL]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.FACILITY_LICENSE, ProviderDocumentType.VAT_CERTIFICATE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.CLINIC]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.FACILITY_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.DOCTOR]: [ProviderDocumentType.NATIONAL_ID, ProviderDocumentType.MEDICAL_LICENSE, ProviderDocumentType.PROFESSIONAL_CV, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.LABORATORY]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.FACILITY_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.RADIOLOGY]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.FACILITY_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.HOME_CARE]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.FACILITY_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.NURSING]: [ProviderDocumentType.NATIONAL_ID, ProviderDocumentType.MEDICAL_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.PHYSIOTHERAPY]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.FACILITY_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.AMBULANCE]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.FACILITY_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.MEDICAL_SUPPLIER]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.VAT_CERTIFICATE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.NUTRITION]: [ProviderDocumentType.NATIONAL_ID, ProviderDocumentType.MEDICAL_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.MENTAL_HEALTH]: [ProviderDocumentType.NATIONAL_ID, ProviderDocumentType.MEDICAL_LICENSE, ProviderDocumentType.IBAN_LETTER],
    [ProviderType.TELEMEDICINE]: [ProviderDocumentType.COMMERCIAL_REGISTRATION, ProviderDocumentType.MEDICAL_LICENSE, ProviderDocumentType.IBAN_LETTER],
};
var ProviderAccountStatus;
(function (ProviderAccountStatus) {
    ProviderAccountStatus["EMAIL_UNVERIFIED"] = "email_unverified";
    ProviderAccountStatus["EMAIL_VERIFIED"] = "email_verified";
    ProviderAccountStatus["ONBOARDING"] = "onboarding";
    ProviderAccountStatus["PENDING_ADMIN_APPROVAL"] = "pending_admin_approval";
    ProviderAccountStatus["UNDER_REVIEW"] = "under_review";
    ProviderAccountStatus["NEEDS_CHANGES"] = "needs_changes";
    ProviderAccountStatus["APPROVED"] = "approved";
    ProviderAccountStatus["SUSPENDED"] = "suspended";
    ProviderAccountStatus["REJECTED"] = "rejected";
})(ProviderAccountStatus || (exports.ProviderAccountStatus = ProviderAccountStatus = {}));
exports.PROVIDER_STATUS_TRANSITIONS = {
    [ProviderAccountStatus.EMAIL_UNVERIFIED]: [ProviderAccountStatus.EMAIL_VERIFIED],
    [ProviderAccountStatus.EMAIL_VERIFIED]: [ProviderAccountStatus.ONBOARDING],
    [ProviderAccountStatus.ONBOARDING]: [ProviderAccountStatus.PENDING_ADMIN_APPROVAL],
    [ProviderAccountStatus.PENDING_ADMIN_APPROVAL]: [ProviderAccountStatus.UNDER_REVIEW, ProviderAccountStatus.APPROVED, ProviderAccountStatus.REJECTED, ProviderAccountStatus.NEEDS_CHANGES],
    [ProviderAccountStatus.UNDER_REVIEW]: [ProviderAccountStatus.APPROVED, ProviderAccountStatus.REJECTED, ProviderAccountStatus.NEEDS_CHANGES],
    [ProviderAccountStatus.NEEDS_CHANGES]: [ProviderAccountStatus.PENDING_ADMIN_APPROVAL],
    [ProviderAccountStatus.APPROVED]: [ProviderAccountStatus.SUSPENDED],
    [ProviderAccountStatus.SUSPENDED]: [ProviderAccountStatus.APPROVED, ProviderAccountStatus.REJECTED],
    [ProviderAccountStatus.REJECTED]: [ProviderAccountStatus.PENDING_ADMIN_APPROVAL],
};
var OperatorRole;
(function (OperatorRole) {
    OperatorRole["OWNER"] = "owner";
    OperatorRole["ADMIN"] = "admin";
    OperatorRole["PHARMACIST"] = "pharmacist";
    OperatorRole["DOCTOR"] = "doctor";
    OperatorRole["LAB_TECHNICIAN"] = "lab_technician";
    OperatorRole["RADIOLOGY_TECHNICIAN"] = "radiology_technician";
    OperatorRole["NURSE"] = "nurse";
    OperatorRole["CASHIER"] = "cashier";
    OperatorRole["INSURANCE_OFFICER"] = "insurance_officer";
    OperatorRole["DISPATCHER"] = "dispatcher";
    OperatorRole["CUSTOMER_SUPPORT"] = "customer_support";
})(OperatorRole || (exports.OperatorRole = OperatorRole = {}));
var OperatorPermission;
(function (OperatorPermission) {
    OperatorPermission["ACCOUNT_VIEW"] = "account.view";
    OperatorPermission["ACCOUNT_EDIT"] = "account.edit";
    OperatorPermission["KYC_MANAGE"] = "kyc.manage";
    OperatorPermission["BANK_MANAGE"] = "bank.manage";
    OperatorPermission["OPERATORS_MANAGE"] = "operators.manage";
    OperatorPermission["PHARMACY_ORDERS_VIEW"] = "pharmacy.orders.view";
    OperatorPermission["PHARMACY_ORDERS_ACCEPT"] = "pharmacy.orders.accept";
    OperatorPermission["PHARMACY_ORDERS_DISPATCH"] = "pharmacy.orders.dispatch";
    OperatorPermission["PHARMACY_INVENTORY_MANAGE"] = "pharmacy.inventory.manage";
    OperatorPermission["LAB_BOOKINGS_VIEW"] = "lab.bookings.view";
    OperatorPermission["LAB_BOOKINGS_MANAGE"] = "lab.bookings.manage";
    OperatorPermission["LAB_RESULTS_PUBLISH"] = "lab.results.publish";
    OperatorPermission["RADIOLOGY_BOOKINGS_VIEW"] = "radiology.bookings.view";
    OperatorPermission["RADIOLOGY_BOOKINGS_MANAGE"] = "radiology.bookings.manage";
    OperatorPermission["RADIOLOGY_REPORTS_PUBLISH"] = "radiology.reports.publish";
    OperatorPermission["HOME_CARE_VIEW"] = "home_care.view";
    OperatorPermission["HOME_CARE_MANAGE"] = "home_care.manage";
    OperatorPermission["APPOINTMENTS_VIEW"] = "appointments.view";
    OperatorPermission["APPOINTMENTS_MANAGE"] = "appointments.manage";
    OperatorPermission["CONSULTATIONS_RUN"] = "consultations.run";
    OperatorPermission["INSURANCE_APPROVE"] = "insurance.approve";
    OperatorPermission["INSURANCE_REJECT"] = "insurance.reject";
    OperatorPermission["FINANCE_VIEW"] = "finance.view";
    OperatorPermission["PAYOUTS_VIEW"] = "payouts.view";
    OperatorPermission["AUDIT_VIEW"] = "audit.view";
    OperatorPermission["CUSTOMER_SUPPORT_HANDLE"] = "support.handle";
})(OperatorPermission || (exports.OperatorPermission = OperatorPermission = {}));
const ALL_PERMS = Object.values(OperatorPermission);
exports.DEFAULT_PERMISSIONS_BY_ROLE = {
    [OperatorRole.OWNER]: ALL_PERMS,
    [OperatorRole.ADMIN]: ALL_PERMS.filter((p) => p !== OperatorPermission.OPERATORS_MANAGE),
    [OperatorRole.PHARMACIST]: [OperatorPermission.ACCOUNT_VIEW, OperatorPermission.PHARMACY_ORDERS_VIEW, OperatorPermission.PHARMACY_ORDERS_ACCEPT, OperatorPermission.PHARMACY_ORDERS_DISPATCH, OperatorPermission.PHARMACY_INVENTORY_MANAGE],
    [OperatorRole.DOCTOR]: [OperatorPermission.ACCOUNT_VIEW, OperatorPermission.APPOINTMENTS_VIEW, OperatorPermission.APPOINTMENTS_MANAGE, OperatorPermission.CONSULTATIONS_RUN],
    [OperatorRole.LAB_TECHNICIAN]: [OperatorPermission.ACCOUNT_VIEW, OperatorPermission.LAB_BOOKINGS_VIEW, OperatorPermission.LAB_BOOKINGS_MANAGE, OperatorPermission.LAB_RESULTS_PUBLISH],
    [OperatorRole.RADIOLOGY_TECHNICIAN]: [OperatorPermission.ACCOUNT_VIEW, OperatorPermission.RADIOLOGY_BOOKINGS_VIEW, OperatorPermission.RADIOLOGY_BOOKINGS_MANAGE, OperatorPermission.RADIOLOGY_REPORTS_PUBLISH],
    [OperatorRole.NURSE]: [OperatorPermission.ACCOUNT_VIEW, OperatorPermission.HOME_CARE_VIEW, OperatorPermission.HOME_CARE_MANAGE],
    [OperatorRole.CASHIER]: [OperatorPermission.ACCOUNT_VIEW, OperatorPermission.PHARMACY_ORDERS_VIEW, OperatorPermission.FINANCE_VIEW],
    [OperatorRole.INSURANCE_OFFICER]: [OperatorPermission.ACCOUNT_VIEW, OperatorPermission.INSURANCE_APPROVE, OperatorPermission.INSURANCE_REJECT],
    [OperatorRole.DISPATCHER]: [OperatorPermission.ACCOUNT_VIEW, OperatorPermission.PHARMACY_ORDERS_DISPATCH, OperatorPermission.HOME_CARE_MANAGE],
    [OperatorRole.CUSTOMER_SUPPORT]: [OperatorPermission.ACCOUNT_VIEW, OperatorPermission.CUSTOMER_SUPPORT_HANDLE, OperatorPermission.AUDIT_VIEW],
};
//# sourceMappingURL=provider.enums.js.map