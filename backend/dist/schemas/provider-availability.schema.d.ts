import { Document } from 'mongoose';
export declare class ProviderAvailability {
    id: string;
    provider_id: string;
    working_hours: Array<{
        day: number;
        start: string;
        end: string;
    }>;
    blocked_slots: Array<{
        start: Date;
        end: Date;
        reason?: string;
    }>;
    vacation_mode?: {
        from: Date;
        to: Date;
        reason?: string;
    } | null;
    instant_available: boolean;
}
export type ProviderAvailabilityDocument = ProviderAvailability & Omit<Document, "id">;
export declare const ProviderAvailabilitySchema: import("mongoose").Schema<ProviderAvailability, import("mongoose").Model<ProviderAvailability, any, any, any, Document<unknown, any, ProviderAvailability, any, {}> & ProviderAvailability & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderAvailability, Document<unknown, {}, import("mongoose").FlatRecord<ProviderAvailability>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderAvailability> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
