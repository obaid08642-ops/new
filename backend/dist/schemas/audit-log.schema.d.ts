import { Document } from 'mongoose';
export declare class AuditLog {
    id: string;
    action: string;
    user_id?: string;
    role?: string;
    ip?: string;
    user_agent?: string;
    resource_kind?: string;
    resource_id?: string;
    details?: Record<string, any>;
    severity: 'info' | 'warn' | 'critical';
    correlation_id?: string;
}
export declare const AuditLogSchema: import("mongoose").Schema<AuditLog, import("mongoose").Model<AuditLog, any, any, any, Document<unknown, any, AuditLog, any, {}> & AuditLog & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AuditLog, Document<unknown, {}, import("mongoose").FlatRecord<AuditLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AuditLog> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
