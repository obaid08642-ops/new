import { Document } from 'mongoose';
import { ProviderRequestType } from './requests.schema';
export declare class PharmacyInventoryItem extends Document {
    id: string;
    provider_account_id: string;
    sku: string;
    name_ar: string;
    name_en?: string;
    barcode?: string;
    category?: string;
    generic_name?: string;
    form?: string;
    dosage?: string;
    pack_size?: string;
    substitute_skus: string[];
    min_stock_alert: number;
    last_restocked_at?: Date;
    stock: number;
    price: number;
    currency: string;
    available: boolean;
    expiry_date?: Date;
    notes?: string;
}
export declare const PharmacyInventoryItemSchema: import("mongoose").Schema<PharmacyInventoryItem, import("mongoose").Model<PharmacyInventoryItem, any, any, any, Document<unknown, any, PharmacyInventoryItem, any, {}> & PharmacyInventoryItem & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PharmacyInventoryItem, Document<unknown, {}, import("mongoose").FlatRecord<PharmacyInventoryItem>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PharmacyInventoryItem> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class LabTestCatalogItem extends Document {
    id: string;
    provider_account_id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    sample_type?: string;
    turnaround_hours: number;
    home_collection_supported: boolean;
    price: number;
    currency: string;
    available: boolean;
}
export declare const LabTestCatalogItemSchema: import("mongoose").Schema<LabTestCatalogItem, import("mongoose").Model<LabTestCatalogItem, any, any, any, Document<unknown, any, LabTestCatalogItem, any, {}> & LabTestCatalogItem & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LabTestCatalogItem, Document<unknown, {}, import("mongoose").FlatRecord<LabTestCatalogItem>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<LabTestCatalogItem> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class RadiologyServiceCatalogItem extends Document {
    id: string;
    provider_account_id: string;
    scan_type: string;
    body_part: string;
    name_ar?: string;
    name_en?: string;
    contrast_supported: boolean;
    price: number;
    currency: string;
    available: boolean;
}
export declare const RadiologyServiceCatalogItemSchema: import("mongoose").Schema<RadiologyServiceCatalogItem, import("mongoose").Model<RadiologyServiceCatalogItem, any, any, any, Document<unknown, any, RadiologyServiceCatalogItem, any, {}> & RadiologyServiceCatalogItem & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RadiologyServiceCatalogItem, Document<unknown, {}, import("mongoose").FlatRecord<RadiologyServiceCatalogItem>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<RadiologyServiceCatalogItem> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class DoctorSessionType extends Document {
    id: string;
    provider_account_id: string;
    consultation_type: string;
    specialty: string;
    duration_minutes: number;
    price: number;
    currency: string;
    available: boolean;
}
export declare const DoctorSessionTypeSchema: import("mongoose").Schema<DoctorSessionType, import("mongoose").Model<DoctorSessionType, any, any, any, Document<unknown, any, DoctorSessionType, any, {}> & DoctorSessionType & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DoctorSessionType, Document<unknown, {}, import("mongoose").FlatRecord<DoctorSessionType>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<DoctorSessionType> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class HomeCareServiceCatalogItem extends Document {
    id: string;
    provider_account_id: string;
    service_type: string;
    name_ar?: string;
    required_skills: string[];
    min_hours: number;
    hourly_price: number;
    currency: string;
    available: boolean;
}
export declare const HomeCareServiceCatalogItemSchema: import("mongoose").Schema<HomeCareServiceCatalogItem, import("mongoose").Model<HomeCareServiceCatalogItem, any, any, any, Document<unknown, any, HomeCareServiceCatalogItem, any, {}> & HomeCareServiceCatalogItem & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HomeCareServiceCatalogItem, Document<unknown, {}, import("mongoose").FlatRecord<HomeCareServiceCatalogItem>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HomeCareServiceCatalogItem> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class ProviderDeliveryZone extends Document {
    id: string;
    provider_account_id: string;
    name: string;
    shape: 'circle' | 'polygon';
    center?: {
        lat: number;
        lng: number;
    };
    radius_km: number;
    polygon?: Array<{
        lat: number;
        lng: number;
    }>;
    base_fee: number;
    free_delivery_above: number;
    active: boolean;
}
export declare const ProviderDeliveryZoneSchema: import("mongoose").Schema<ProviderDeliveryZone, import("mongoose").Model<ProviderDeliveryZone, any, any, any, Document<unknown, any, ProviderDeliveryZone, any, {}> & ProviderDeliveryZone & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderDeliveryZone, Document<unknown, {}, import("mongoose").FlatRecord<ProviderDeliveryZone>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderDeliveryZone> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class ProviderScheduleSlot extends Document {
    id: string;
    provider_account_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    slot_duration_minutes: number;
    capacity_per_slot: number;
    active: boolean;
    note?: string;
}
export declare const ProviderScheduleSlotSchema: import("mongoose").Schema<ProviderScheduleSlot, import("mongoose").Model<ProviderScheduleSlot, any, any, any, Document<unknown, any, ProviderScheduleSlot, any, {}> & ProviderScheduleSlot & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderScheduleSlot, Document<unknown, {}, import("mongoose").FlatRecord<ProviderScheduleSlot>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderScheduleSlot> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare enum AssignmentStrategy {
    AUTO_BEST = "auto_best",
    BROADCAST = "broadcast",
    MANUAL = "manual"
}
export declare enum AssignmentAttemptStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    TIMED_OUT = "timed_out",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
export declare class ProviderAssignmentAttempt extends Document {
    id: string;
    request_id: string;
    provider_account_id: string;
    attempt_index: number;
    strategy: AssignmentStrategy;
    status: AssignmentAttemptStatus;
    sent_at: Date;
    responded_at?: Date;
    timeout_seconds: number;
    expires_at: Date;
    score?: any;
    rejection_reason?: string;
}
export declare const ProviderAssignmentAttemptSchema: import("mongoose").Schema<ProviderAssignmentAttempt, import("mongoose").Model<ProviderAssignmentAttempt, any, any, any, Document<unknown, any, ProviderAssignmentAttempt, any, {}> & ProviderAssignmentAttempt & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderAssignmentAttempt, Document<unknown, {}, import("mongoose").FlatRecord<ProviderAssignmentAttempt>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderAssignmentAttempt> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class ProviderScoreSnapshot extends Document {
    id: string;
    provider_account_id: string;
    total_requests: number;
    total_accepted: number;
    total_rejected: number;
    total_completed: number;
    total_cancelled: number;
    acceptance_rate: number;
    completion_rate: number;
    avg_response_seconds: number;
    avg_completion_minutes: number;
    reliability_score: number;
    last_calculated_at?: Date;
}
export declare const ProviderScoreSnapshotSchema: import("mongoose").Schema<ProviderScoreSnapshot, import("mongoose").Model<ProviderScoreSnapshot, any, any, any, Document<unknown, any, ProviderScoreSnapshot, any, {}> & ProviderScoreSnapshot & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderScoreSnapshot, Document<unknown, {}, import("mongoose").FlatRecord<ProviderScoreSnapshot>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderScoreSnapshot> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const REQUEST_TYPE_TO_PROVIDER_TYPES: Record<string, string[]>;
export declare function eligibleProviderTypesFor(reqType: ProviderRequestType | string): string[];
