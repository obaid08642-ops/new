// AUTO-GENERATED API CONTRACTS
// Source of Truth: nabdah-backend

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
  PHARMACY_RECEIVED = 'PHARMACY_RECEIVED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  PREPARING = 'PREPARING',
  READY_FOR_DISPATCH = 'READY_FOR_DISPATCH',
  ASSIGNED_TO_DELIVERY = 'ASSIGNED_TO_DELIVERY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  ESCALATED_TO_ADMIN = 'ESCALATED_TO_ADMIN',
  PENDING_INSURANCE = 'PENDING_INSURANCE',
  APPROVED = 'APPROVED',
  PARTIAL_APPROVAL = 'PARTIAL_APPROVAL',
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

export enum AcademicDegree {
  PROFESSOR = 'professor',
  CONSULTANT = 'consultant',
  SENIOR_SPECIALIST = 'senior_specialist',
  SPECIALIST = 'specialist',
  RESIDENT = 'resident',
  GENERAL_PRACTITIONER = 'general_practitioner',
}

export enum FacilityType {
  HOSPITAL = 'hospital',
  CLINIC = 'clinic',
  MEDICAL_CENTER = 'medical_center',
  POLYCLINIC = 'polyclinic',
}

export enum ServiceState {
  REQUESTED = 'REQUESTED',
  MATCHING = 'MATCHING',
  ASSIGNED = 'ASSIGNED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const ORDER_TRANSITIONS: Record<OrderState, OrderState[]> = {
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

export const UNIFIED_TRANSITIONS: Record<ServiceState, ServiceState[]> = {
  [ServiceState.REQUESTED]: [ServiceState.MATCHING, ServiceState.ASSIGNED, ServiceState.CONFIRMED, ServiceState.CANCELLED],
  [ServiceState.MATCHING]:  [ServiceState.ASSIGNED, ServiceState.CONFIRMED, ServiceState.REQUESTED, ServiceState.CANCELLED],
  [ServiceState.ASSIGNED]:  [ServiceState.CONFIRMED, ServiceState.IN_PROGRESS, ServiceState.CANCELLED],
  [ServiceState.CONFIRMED]: [ServiceState.IN_PROGRESS, ServiceState.CANCELLED],
  [ServiceState.IN_PROGRESS]: [ServiceState.COMPLETED, ServiceState.CANCELLED],
  [ServiceState.COMPLETED]: [],
  [ServiceState.CANCELLED]: [],
};

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
