import { Document } from 'mongoose';
export declare enum ProviderRequestType {
    PHARMACY = "pharmacy",
    LAB = "lab",
    RADIOLOGY = "radiology",
    DOCTOR = "doctor",
    HOME_CARE = "home_care"
}
export declare enum ProviderRequestStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare const PROVIDER_REQUEST_TRANSITIONS: Record<ProviderRequestStatus, ProviderRequestStatus[]>;
export declare enum ProviderRequestPriority {
    URGENT = "urgent",
    NORMAL = "normal",
    LOW = "low"
}
export declare class ProviderRequest extends Document {
    id: string;
    provider_account_id: string | null;
    type: ProviderRequestType;
    status: ProviderRequestStatus;
    priority: ProviderRequestPriority;
    assignment_state: 'unassigned' | 'matching' | 'broadcasted' | 'assigned' | 'failed';
    assignment_strategy: 'auto_best' | 'broadcast' | 'manual';
    assignment_timeout_at?: Date;
    attempted_provider_ids: string[];
    patient_location?: {
        lat: number;
        lng: number;
        address?: string;
    };
    match_breakdown?: any;
    patient: {
        id?: string;
        name: string;
        phone?: string;
        age?: number;
        gender?: string;
        avatar_url?: string;
    };
    payload: any;
    summary_ar?: string;
    summary_en?: string;
    scheduled_at?: Date;
    scheduled_slot_minutes?: number;
    amount_total: number;
    currency: string;
    timeline: Array<{
        at: Date;
        status: ProviderRequestStatus;
        by_role: 'patient' | 'provider' | 'system';
        by_user_id: string;
        note?: string;
    }>;
    provider_action_log: Array<{
        at: Date;
        action: 'accept' | 'reject' | 'start' | 'complete' | 'cancel' | 'note';
        by_user_id: string;
        note?: string;
        reason?: string;
    }>;
    rejection_reason?: string;
    notes?: string;
    accepted_at?: Date;
    rejected_at?: Date;
    started_at?: Date;
    completed_at?: Date;
    cancelled_at?: Date;
    seeded: boolean;
}
export declare const ProviderRequestSchema: import("mongoose").Schema<ProviderRequest, import("mongoose").Model<ProviderRequest, any, any, any, Document<unknown, any, ProviderRequest, any, {}> & ProviderRequest & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderRequest, Document<unknown, {}, import("mongoose").FlatRecord<ProviderRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderRequest> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare enum ProviderNotificationType {
    NEW_REQUEST = "new_request",
    REQUEST_STATUS = "request_status",
    REQUEST_CANCELLED = "request_cancelled",
    ADMIN_MESSAGE = "admin_message",
    BOOKING_UPDATE = "booking_update",
    KYC_UPDATE = "kyc_update",
    BANK_UPDATE = "bank_update",
    PAYOUT = "payout"
}
export declare class ProviderNotification extends Document {
    id: string;
    provider_account_id: string;
    type: ProviderNotificationType;
    title_ar: string;
    title_en: string;
    body_ar?: string;
    body_en?: string;
    icon?: string;
    related_id?: string;
    related_type?: string;
    read: boolean;
    read_at?: Date;
}
export declare const ProviderNotificationSchema: import("mongoose").Schema<ProviderNotification, import("mongoose").Model<ProviderNotification, any, any, any, Document<unknown, any, ProviderNotification, any, {}> & ProviderNotification & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderNotification, Document<unknown, {}, import("mongoose").FlatRecord<ProviderNotification>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderNotification> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare enum ProviderAvailabilityStatus {
    ONLINE = "online",
    OFFLINE = "offline",
    BUSY = "busy",
    ACCEPTING_ORDERS = "accepting_orders"
}
export declare class ProviderAvailability extends Document {
    provider_account_id: string;
    status: ProviderAvailabilityStatus;
    last_online_at?: Date;
    last_offline_at?: Date;
    note?: string;
}
export declare const ProviderAvailabilitySchema: import("mongoose").Schema<ProviderAvailability, import("mongoose").Model<ProviderAvailability, any, any, any, Document<unknown, any, ProviderAvailability, any, {}> & ProviderAvailability & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderAvailability, Document<unknown, {}, import("mongoose").FlatRecord<ProviderAvailability>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderAvailability> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
