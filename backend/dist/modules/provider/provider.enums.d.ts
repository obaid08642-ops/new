export declare enum ProviderType {
    PHARMACY = "pharmacy",
    HOSPITAL = "hospital",
    CLINIC = "clinic",
    DOCTOR = "doctor",
    LABORATORY = "laboratory",
    RADIOLOGY = "radiology",
    HOME_CARE = "home_care",
    NURSING = "nursing",
    PHYSIOTHERAPY = "physiotherapy",
    AMBULANCE = "ambulance",
    MEDICAL_SUPPLIER = "medical_supplier",
    NUTRITION = "nutrition",
    MENTAL_HEALTH = "mental_health",
    TELEMEDICINE = "telemedicine"
}
export declare const HOSPITAL_SUB_MODULES: readonly ["doctors", "pharmacy", "laboratory", "radiology", "home_care", "emergency"];
export declare enum ProviderDocumentType {
    NATIONAL_ID = "national_id",
    COMMERCIAL_REGISTRATION = "commercial_registration",
    MEDICAL_LICENSE = "medical_license",
    VAT_CERTIFICATE = "vat_certificate",
    TAX_NUMBER = "tax_number",
    ZAKAT_CERTIFICATE = "zakat_certificate",
    IBAN_LETTER = "iban_letter",
    FACILITY_LICENSE = "facility_license",
    PROFESSIONAL_CV = "professional_cv",
    PROFILE_PHOTO = "profile_photo",
    OTHER = "other"
}
export declare const REQUIRED_DOCS_BY_PROVIDER_TYPE: Record<ProviderType, ProviderDocumentType[]>;
export declare enum ProviderAccountStatus {
    EMAIL_UNVERIFIED = "email_unverified",
    EMAIL_VERIFIED = "email_verified",
    ONBOARDING = "onboarding",
    PENDING_ADMIN_APPROVAL = "pending_admin_approval",
    UNDER_REVIEW = "under_review",
    NEEDS_CHANGES = "needs_changes",
    APPROVED = "approved",
    SUSPENDED = "suspended",
    REJECTED = "rejected"
}
export declare const PROVIDER_STATUS_TRANSITIONS: Record<ProviderAccountStatus, ProviderAccountStatus[]>;
export declare enum OperatorRole {
    OWNER = "owner",
    ADMIN = "admin",
    PHARMACIST = "pharmacist",
    DOCTOR = "doctor",
    LAB_TECHNICIAN = "lab_technician",
    RADIOLOGY_TECHNICIAN = "radiology_technician",
    NURSE = "nurse",
    CASHIER = "cashier",
    INSURANCE_OFFICER = "insurance_officer",
    DISPATCHER = "dispatcher",
    CUSTOMER_SUPPORT = "customer_support"
}
export declare enum OperatorPermission {
    ACCOUNT_VIEW = "account.view",
    ACCOUNT_EDIT = "account.edit",
    KYC_MANAGE = "kyc.manage",
    BANK_MANAGE = "bank.manage",
    OPERATORS_MANAGE = "operators.manage",
    PHARMACY_ORDERS_VIEW = "pharmacy.orders.view",
    PHARMACY_ORDERS_ACCEPT = "pharmacy.orders.accept",
    PHARMACY_ORDERS_DISPATCH = "pharmacy.orders.dispatch",
    PHARMACY_INVENTORY_MANAGE = "pharmacy.inventory.manage",
    LAB_BOOKINGS_VIEW = "lab.bookings.view",
    LAB_BOOKINGS_MANAGE = "lab.bookings.manage",
    LAB_RESULTS_PUBLISH = "lab.results.publish",
    RADIOLOGY_BOOKINGS_VIEW = "radiology.bookings.view",
    RADIOLOGY_BOOKINGS_MANAGE = "radiology.bookings.manage",
    RADIOLOGY_REPORTS_PUBLISH = "radiology.reports.publish",
    HOME_CARE_VIEW = "home_care.view",
    HOME_CARE_MANAGE = "home_care.manage",
    APPOINTMENTS_VIEW = "appointments.view",
    APPOINTMENTS_MANAGE = "appointments.manage",
    CONSULTATIONS_RUN = "consultations.run",
    INSURANCE_APPROVE = "insurance.approve",
    INSURANCE_REJECT = "insurance.reject",
    FINANCE_VIEW = "finance.view",
    PAYOUTS_VIEW = "payouts.view",
    AUDIT_VIEW = "audit.view",
    CUSTOMER_SUPPORT_HANDLE = "support.handle"
}
export declare const DEFAULT_PERMISSIONS_BY_ROLE: Record<OperatorRole, OperatorPermission[]>;
