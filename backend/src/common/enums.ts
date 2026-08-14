export enum UserRole {
  GUEST = 'guest',
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  PHARMACY = 'pharmacy',
  HOSPITAL = 'hospital',
  HOSPITAL_ADMIN = 'hospital_admin',
  BRANCH_ADMIN = 'branch_admin',
  RECEPTIONIST = 'receptionist',
  LAB = 'lab',
  RADIOLOGY = 'radiology',
  HOME_CARE = 'home_care',
  NURSING = 'nursing',
  NURSE = 'nurse',
  PHYSIOTHERAPIST = 'physiotherapist',
  ADMIN = 'admin',
  DELIVERY = 'delivery',
  SUPER_ADMIN = 'super_admin',
  SUPPORT_AGENT = 'support_agent',
  FINANCE = 'finance',
  PHARMACIST = 'pharmacist',
}

export enum ProviderType {
  DOCTOR = 'doctor',
  PHARMACY = 'pharmacy',
  HOSPITAL = 'hospital',
  CLINIC = 'clinic',
  LAB = 'lab',
  RADIOLOGY = 'radiology',
  HOME_CARE = 'home_care',
  NURSING = 'nursing',
}

export enum ProviderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum OrderState {
  CREATED = 'CREATED',
  VALIDATED = 'VALIDATED',
  NEW = 'NEW',
  BROADCAST = 'BROADCAST',
  ACCEPTED = 'ACCEPTED',
  PHARMACY_RECEIVED = 'PHARMACY_RECEIVED',
  BASKET_REVIEW = 'BASKET_REVIEW',
  WAITING_PATIENT_APPROVAL = 'WAITING_PATIENT_APPROVAL',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  READY_FOR_DISPATCH = 'READY_FOR_DISPATCH',
  ASSIGNED_TO_DELIVERY = 'ASSIGNED_TO_DELIVERY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  ESCALATED_TO_ADMIN = 'ESCALATED_TO_ADMIN',
  PENDING_INSURANCE = 'PENDING_INSURANCE',
  APPROVED = 'APPROVED',
  PARTIAL_APPROVAL = 'PARTIAL_APPROVAL'
}

export enum OrderRejectionReason {
  OUT_OF_STOCK_COMPLETELY = 'OUT_OF_STOCK_COMPLETELY',
  PRESCRIPTION_INVALID = 'PRESCRIPTION_INVALID',
  INSURANCE_ISSUE = 'INSURANCE_ISSUE',
  OUT_OF_DELIVERY_ZONE = 'OUT_OF_DELIVERY_ZONE',
  PHARMACY_CLOSING = 'PHARMACY_CLOSING'
}

export enum PrescriptionState {
  CREATED_BY_DOCTOR = 'CREATED_BY_DOCTOR',
  SENT_TO_PHARMACY = 'SENT_TO_PHARMACY',
  PARTIALLY_EDITED = 'PARTIALLY_EDITED',
  APPROVED = 'APPROVED',
  DISPENSED = 'DISPENSED',
  ARCHIVED = 'ARCHIVED',
}

export enum EmergencyState {
  TRIGGERED = 'TRIGGERED',
  LOCATION_CAPTURED = 'LOCATION_CAPTURED',
  ADMIN_NOTIFIED = 'ADMIN_NOTIFIED',
  NEAREST_PROVIDER_IDENTIFIED = 'NEAREST_PROVIDER_IDENTIFIED',
  DISPATCH_INITIATED = 'DISPATCH_INITIATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum MedicationDoseState {
  SCHEDULED = 'SCHEDULED',
  NOTIFIED = 'NOTIFIED',
  TAKEN = 'TAKEN',
  MISSED = 'MISSED',
  SKIPPED_BY_USER = 'SKIPPED_BY_USER',
}

export enum AppointmentMode {
  CLINIC = 'clinic',
  ONLINE = 'online',
  VIDEO = 'video',
  AUDIO = 'audio',
  HOME = 'home',
  CHAT = 'chat',
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum DeliveryState {
  UNASSIGNED = 'UNASSIGNED',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
}

export enum NotificationType {
  INFO = 'info',
  ORDER = 'order',
  APPOINTMENT = 'appointment',
  PRESCRIPTION = 'prescription',
  EMERGENCY = 'emergency',
  MEDICATION = 'medication',
  PROMO = 'promo',
  ALERT = 'alert',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Doctor academic degree / professional title
export enum AcademicDegree {
  PROFESSOR = 'professor',
  CONSULTANT = 'consultant',
  SENIOR_SPECIALIST = 'senior_specialist',
  SPECIALIST = 'specialist',
  RESIDENT = 'resident',
  GENERAL_PRACTITIONER = 'general_practitioner',
}
export const ACADEMIC_DEGREES_LIST = Object.values(AcademicDegree);

// Saudi-market insurance companies. Keep slugs stable; localized labels handled by i18n.
export const INSURANCE_COMPANIES = [
  'bupa', 'tawuniya', 'medgulf', 'medgulf_a', 'medgulf_b', 'medgulf_c',
  'axa', 'rajhi_takaful', 'al_rajhi_takaful', 'walaa', 'malath', 'salama',
  'gulf_union', 'allianz', 'arabian_shield', 'saico', 'alsagr', 'amana',
  'tawuniya_corporate', 'cigna', 'globemed', 'nextcare', 'medivisa', 'mednet',
];

// Master specialties registry — slug + Arabic name. Used for /care/specialties even when
// no doctor is currently assigned (greys out + count from doctors collection).
export const SPECIALTY_MASTER: { slug: string; name_ar: string; name_en: string }[] = [
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

// Facility types
export enum FacilityType {
  HOSPITAL = 'hospital',
  CLINIC = 'clinic',
  MEDICAL_CENTER = 'medical_center',
  POLYCLINIC = 'polyclinic',
}

export const ORDER_TRANSITIONS: Record<string, any[]> = {
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

export const EMERGENCY_TRANSITIONS: Record<EmergencyState, EmergencyState[]> = {
  [EmergencyState.TRIGGERED]: [EmergencyState.LOCATION_CAPTURED, EmergencyState.ADMIN_NOTIFIED],
  [EmergencyState.LOCATION_CAPTURED]: [EmergencyState.ADMIN_NOTIFIED],
  [EmergencyState.ADMIN_NOTIFIED]: [EmergencyState.NEAREST_PROVIDER_IDENTIFIED, EmergencyState.RESOLVED],
  [EmergencyState.NEAREST_PROVIDER_IDENTIFIED]: [EmergencyState.DISPATCH_INITIATED, EmergencyState.RESOLVED],
  [EmergencyState.DISPATCH_INITIATED]: [EmergencyState.RESOLVED],
  [EmergencyState.RESOLVED]: [EmergencyState.CLOSED],
  [EmergencyState.CLOSED]: [],
};

/* ============================================================================
 * UNIFIED SERVICE LIFECYCLE — single source of truth for ALL domains.
 * Every booking (pharmacy / lab / radiology / nursing / consultation) flows
 * through these 7 states. Domains keep their richer internal states for
 * persistence backwards-compatibility, but the WorkflowRuntimeEngine maps
 * them to ServiceState before validation and event emission.
 * ============================================================================ */
export enum ServiceState {
  REQUESTED = 'REQUESTED',
  MATCHING = 'MATCHING',
  ASSIGNED = 'ASSIGNED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const UNIFIED_TRANSITIONS: Record<ServiceState, ServiceState[]> = {
  [ServiceState.REQUESTED]: [ServiceState.MATCHING, ServiceState.ASSIGNED, ServiceState.CONFIRMED, ServiceState.CANCELLED],
  [ServiceState.MATCHING]:  [ServiceState.ASSIGNED, ServiceState.CONFIRMED, ServiceState.REQUESTED, ServiceState.CANCELLED],
  [ServiceState.ASSIGNED]:  [ServiceState.CONFIRMED, ServiceState.IN_PROGRESS, ServiceState.CANCELLED],
  [ServiceState.CONFIRMED]: [ServiceState.IN_PROGRESS, ServiceState.CANCELLED],
  [ServiceState.IN_PROGRESS]: [ServiceState.COMPLETED, ServiceState.CANCELLED],
  [ServiceState.COMPLETED]: [],
  [ServiceState.CANCELLED]: [],
};

export type ServiceDomain = 'pharmacy' | 'lab' | 'radiology' | 'nursing' | 'consultation';

export const PRESCRIPTION_TRANSITIONS: Record<PrescriptionState, PrescriptionState[]> = {
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
