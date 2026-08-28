export enum ProviderType {
  PHARMACY = 'pharmacy', HOSPITAL = 'hospital', CLINIC = 'clinic', DOCTOR = 'doctor',
  LABORATORY = 'laboratory', RADIOLOGY = 'radiology', HOME_CARE = 'home_care',
  NURSING = 'nursing', PHYSIOTHERAPY = 'physiotherapy', AMBULANCE = 'ambulance',
  MEDICAL_SUPPLIER = 'medical_supplier', NUTRITION = 'nutrition',
  MENTAL_HEALTH = 'mental_health', TELEMEDICINE = 'telemedicine',
}
export const HOSPITAL_SUB_MODULES = ['doctors', 'pharmacy', 'laboratory', 'radiology', 'home_care', 'emergency'] as const;

export enum ProviderDocumentType {
  NATIONAL_ID = 'national_id', COMMERCIAL_REGISTRATION = 'commercial_registration',
  MEDICAL_LICENSE = 'medical_license', VAT_CERTIFICATE = 'vat_certificate',
  TAX_NUMBER = 'tax_number', ZAKAT_CERTIFICATE = 'zakat_certificate',
  IBAN_LETTER = 'iban_letter', FACILITY_LICENSE = 'facility_license',
  PROFESSIONAL_CV = 'professional_cv', PROFILE_PHOTO = 'profile_photo', OTHER = 'other',
}

export const REQUIRED_DOCS_BY_PROVIDER_TYPE: Record<ProviderType, ProviderDocumentType[]> = {
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

export enum ProviderAccountStatus {
  EMAIL_UNVERIFIED = 'email_unverified', EMAIL_VERIFIED = 'email_verified',
  ONBOARDING = 'onboarding', PENDING_ADMIN_APPROVAL = 'pending_admin_approval',
  UNDER_REVIEW = 'under_review', NEEDS_CHANGES = 'needs_changes',
  APPROVED = 'approved', SUSPENDED = 'suspended', REJECTED = 'rejected',
}

export const PROVIDER_STATUS_TRANSITIONS: Record<ProviderAccountStatus, ProviderAccountStatus[]> = {
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

export enum OperatorRole {
  OWNER = 'owner', ADMIN = 'admin', PHARMACIST = 'pharmacist', DOCTOR = 'doctor',
  LAB_TECHNICIAN = 'lab_technician', RADIOLOGY_TECHNICIAN = 'radiology_technician',
  NURSE = 'nurse', CASHIER = 'cashier', INSURANCE_OFFICER = 'insurance_officer',
  DISPATCHER = 'dispatcher', CUSTOMER_SUPPORT = 'customer_support',
}

export enum OperatorPermission {
  ACCOUNT_VIEW = 'account.view', ACCOUNT_EDIT = 'account.edit',
  KYC_MANAGE = 'kyc.manage', BANK_MANAGE = 'bank.manage', OPERATORS_MANAGE = 'operators.manage',
  PHARMACY_ORDERS_VIEW = 'pharmacy.orders.view', PHARMACY_ORDERS_ACCEPT = 'pharmacy.orders.accept',
  PHARMACY_ORDERS_DISPATCH = 'pharmacy.orders.dispatch', PHARMACY_INVENTORY_MANAGE = 'pharmacy.inventory.manage',
  LAB_BOOKINGS_VIEW = 'lab.bookings.view', LAB_BOOKINGS_MANAGE = 'lab.bookings.manage',
  LAB_RESULTS_PUBLISH = 'lab.results.publish',
  RADIOLOGY_BOOKINGS_VIEW = 'radiology.bookings.view', RADIOLOGY_BOOKINGS_MANAGE = 'radiology.bookings.manage',
  RADIOLOGY_REPORTS_PUBLISH = 'radiology.reports.publish',
  HOME_CARE_VIEW = 'home_care.view', HOME_CARE_MANAGE = 'home_care.manage',
  APPOINTMENTS_VIEW = 'appointments.view', APPOINTMENTS_MANAGE = 'appointments.manage',
  CONSULTATIONS_RUN = 'consultations.run',
  INSURANCE_APPROVE = 'insurance.approve', INSURANCE_REJECT = 'insurance.reject',
  FINANCE_VIEW = 'finance.view', PAYOUTS_VIEW = 'payouts.view',
  AUDIT_VIEW = 'audit.view', CUSTOMER_SUPPORT_HANDLE = 'support.handle',
}

const ALL_PERMS = Object.values(OperatorPermission);
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<OperatorRole, OperatorPermission[]> = {
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
