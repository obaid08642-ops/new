export declare enum UserRole {
    GUEST = "guest",
    PATIENT = "patient",
    DOCTOR = "doctor",
    PHARMACY = "pharmacy",
    HOSPITAL = "hospital",
    HOSPITAL_ADMIN = "hospital_admin",
    BRANCH_ADMIN = "branch_admin",
    RECEPTIONIST = "receptionist",
    LAB = "lab",
    RADIOLOGY = "radiology",
    HOME_CARE = "home_care",
    NURSING = "nursing",
    NURSE = "nurse",
    AMBULANCE = "ambulance",
    PHYSIOTHERAPIST = "physiotherapist",
    ADMIN = "admin",
    DELIVERY = "delivery",
    SUPER_ADMIN = "super_admin",
    SUPPORT_AGENT = "support_agent",
    FINANCE = "finance",
    PHARMACIST = "pharmacist"
}
export declare const PROVIDER_ROLES: string[];
export declare function isProviderRole(role?: string | null): boolean;
export declare enum ProviderType {
    DOCTOR = "doctor",
    PHARMACY = "pharmacy",
    HOSPITAL = "hospital",
    CLINIC = "clinic",
    LAB = "lab",
    RADIOLOGY = "radiology",
    HOME_CARE = "home_care",
    NURSING = "nursing",
    AMBULANCE = "ambulance"
}
export declare enum ProviderStatus {
    PENDING = "pending",
    ACTIVE = "active",
    REJECTED = "rejected",
    SUSPENDED = "suspended"
}
export declare enum OrderState {
    CREATED = "CREATED",
    VALIDATED = "VALIDATED",
    NEW = "NEW",
    BROADCAST = "BROADCAST",
    ACCEPTED = "ACCEPTED",
    PHARMACY_RECEIVED = "PHARMACY_RECEIVED",
    BASKET_REVIEW = "BASKET_REVIEW",
    WAITING_PATIENT_APPROVAL = "WAITING_PATIENT_APPROVAL",
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED",
    PREPARING = "PREPARING",
    READY = "READY",
    READY_FOR_DISPATCH = "READY_FOR_DISPATCH",
    ASSIGNED_TO_DELIVERY = "ASSIGNED_TO_DELIVERY",
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
    DELIVERED = "DELIVERED",
    PARTIALLY_FULFILLED = "PARTIALLY_FULFILLED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    REJECTED = "REJECTED",
    ESCALATED_TO_ADMIN = "ESCALATED_TO_ADMIN",
    PENDING_INSURANCE = "PENDING_INSURANCE",
    APPROVED = "APPROVED",
    PARTIAL_APPROVAL = "PARTIAL_APPROVAL"
}
export declare enum OrderRejectionReason {
    OUT_OF_STOCK_COMPLETELY = "OUT_OF_STOCK_COMPLETELY",
    PRESCRIPTION_INVALID = "PRESCRIPTION_INVALID",
    INSURANCE_ISSUE = "INSURANCE_ISSUE",
    OUT_OF_DELIVERY_ZONE = "OUT_OF_DELIVERY_ZONE",
    PHARMACY_CLOSING = "PHARMACY_CLOSING"
}
export declare enum PrescriptionState {
    CREATED_BY_DOCTOR = "CREATED_BY_DOCTOR",
    SENT_TO_PHARMACY = "SENT_TO_PHARMACY",
    PARTIALLY_EDITED = "PARTIALLY_EDITED",
    APPROVED = "APPROVED",
    DISPENSED = "DISPENSED",
    ARCHIVED = "ARCHIVED"
}
export declare enum EmergencyState {
    TRIGGERED = "TRIGGERED",
    LOCATION_CAPTURED = "LOCATION_CAPTURED",
    ADMIN_NOTIFIED = "ADMIN_NOTIFIED",
    NEAREST_PROVIDER_IDENTIFIED = "NEAREST_PROVIDER_IDENTIFIED",
    DISPATCH_INITIATED = "DISPATCH_INITIATED",
    RESOLVED = "RESOLVED",
    CANCELLED = "CANCELLED",
    CLOSED = "CLOSED"
}
export declare enum MedicationDoseState {
    SCHEDULED = "SCHEDULED",
    NOTIFIED = "NOTIFIED",
    TAKEN = "TAKEN",
    MISSED = "MISSED",
    SKIPPED_BY_USER = "SKIPPED_BY_USER"
}
export declare enum AppointmentMode {
    CLINIC = "clinic",
    ONLINE = "online",
    VIDEO = "video",
    AUDIO = "audio",
    HOME = "home",
    CHAT = "chat"
}
export declare enum AppointmentStatus {
    SCHEDULED = "scheduled",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    NO_SHOW = "no_show"
}
export declare enum DeliveryState {
    UNASSIGNED = "UNASSIGNED",
    ASSIGNED = "ASSIGNED",
    PICKED_UP = "PICKED_UP",
    IN_TRANSIT = "IN_TRANSIT",
    DELIVERED = "DELIVERED",
    FAILED = "FAILED",
    RETURNED = "RETURNED"
}
export declare enum NotificationType {
    INFO = "info",
    ORDER = "order",
    APPOINTMENT = "appointment",
    PRESCRIPTION = "prescription",
    EMERGENCY = "emergency",
    MEDICATION = "medication",
    PROMO = "promo",
    ALERT = "alert"
}
export declare enum NotificationPriority {
    LOW = "low",
    NORMAL = "normal",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum AcademicDegree {
    PROFESSOR = "professor",
    CONSULTANT = "consultant",
    SENIOR_SPECIALIST = "senior_specialist",
    SPECIALIST = "specialist",
    RESIDENT = "resident",
    GENERAL_PRACTITIONER = "general_practitioner"
}
export declare const ACADEMIC_DEGREES_LIST: AcademicDegree[];
export declare const INSURANCE_COMPANIES: string[];
export declare const SPECIALTY_MASTER: {
    slug: string;
    name_ar: string;
    name_en: string;
}[];
export declare enum FacilityType {
    HOSPITAL = "hospital",
    CLINIC = "clinic",
    MEDICAL_CENTER = "medical_center",
    POLYCLINIC = "polyclinic"
}
export declare const ORDER_TRANSITIONS: Record<string, any[]>;
export declare const EMERGENCY_TRANSITIONS: Record<EmergencyState, EmergencyState[]>;
export declare enum ServiceState {
    REQUESTED = "REQUESTED",
    MATCHING = "MATCHING",
    ASSIGNED = "ASSIGNED",
    CONFIRMED = "CONFIRMED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare const UNIFIED_TRANSITIONS: Record<ServiceState, ServiceState[]>;
export type ServiceDomain = 'pharmacy' | 'lab' | 'radiology' | 'nursing' | 'consultation';
export declare const PRESCRIPTION_TRANSITIONS: Record<PrescriptionState, PrescriptionState[]>;
