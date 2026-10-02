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
  AMBULANCE = 'ambulance',
  PHYSIOTHERAPIST = 'physiotherapist',
  ADMIN = 'admin',
  DELIVERY = 'delivery',
  SUPER_ADMIN = 'super_admin',
  SUPPORT_AGENT = 'support_agent',
  FINANCE = 'finance',
  PHARMACIST = 'pharmacist',
}

/**
 * Roles that represent any service-provider-side account (individual practitioner
 * or facility staff). Provider apps authenticate with one of these roles — there is
 * no literal 'provider' value in UserRole, so provider-scope guards must test
 * membership of this set rather than equality with 'provider'.
 */
export const PROVIDER_ROLES: string[] = [
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

/** True when the role belongs to the provider side (admins included for support tooling). */
export function isProviderRole(role?: string | null): boolean {
  if (!role) return false;
  const r = String(role).toLowerCase();
  return (
    PROVIDER_ROLES.includes(r) ||
    r === 'provider' ||
    r === UserRole.ADMIN ||
    r === UserRole.SUPER_ADMIN
  );
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
  AMBULANCE = 'ambulance',
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
  /** Patient-uploaded scan — provenance is the patient, never the doctor. */
  UPLOADED_BY_PATIENT = 'UPLOADED_BY_PATIENT',
  SENT_TO_PHARMACY = 'SENT_TO_PHARMACY',
  PARTIALLY_EDITED = 'PARTIALLY_EDITED',
  /** A pharmacist reviewed the Rx lines — required before APPROVED for Rx items. */
  VERIFIED_BY_PHARMACIST = 'VERIFIED_BY_PHARMACIST',
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
  CANCELLED = 'CANCELLED',
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
  [EmergencyState.TRIGGERED]: [EmergencyState.LOCATION_CAPTURED, EmergencyState.ADMIN_NOTIFIED, EmergencyState.CANCELLED],
  [EmergencyState.LOCATION_CAPTURED]: [EmergencyState.ADMIN_NOTIFIED, EmergencyState.CANCELLED],
  [EmergencyState.ADMIN_NOTIFIED]: [EmergencyState.NEAREST_PROVIDER_IDENTIFIED, EmergencyState.RESOLVED, EmergencyState.CANCELLED],
  [EmergencyState.NEAREST_PROVIDER_IDENTIFIED]: [EmergencyState.DISPATCH_INITIATED, EmergencyState.RESOLVED, EmergencyState.CANCELLED],
  [EmergencyState.DISPATCH_INITIATED]: [EmergencyState.RESOLVED, EmergencyState.CANCELLED],
  [EmergencyState.RESOLVED]: [EmergencyState.CLOSED],
  [EmergencyState.CANCELLED]: [EmergencyState.CLOSED],
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
  [PrescriptionState.UPLOADED_BY_PATIENT]: [
    PrescriptionState.SENT_TO_PHARMACY,
    PrescriptionState.VERIFIED_BY_PHARMACIST,
    PrescriptionState.ARCHIVED,
  ],
  [PrescriptionState.SENT_TO_PHARMACY]: [
    PrescriptionState.PARTIALLY_EDITED,
    PrescriptionState.VERIFIED_BY_PHARMACIST,
    PrescriptionState.APPROVED,
    PrescriptionState.ARCHIVED,
  ],
  [PrescriptionState.PARTIALLY_EDITED]: [
    PrescriptionState.VERIFIED_BY_PHARMACIST,
    PrescriptionState.APPROVED,
    PrescriptionState.ARCHIVED,
  ],
  [PrescriptionState.VERIFIED_BY_PHARMACIST]: [PrescriptionState.APPROVED, PrescriptionState.ARCHIVED],
  [PrescriptionState.APPROVED]: [PrescriptionState.DISPENSED, PrescriptionState.ARCHIVED],
  [PrescriptionState.DISPENSED]: [PrescriptionState.ARCHIVED],
  [PrescriptionState.ARCHIVED]: [],
};
