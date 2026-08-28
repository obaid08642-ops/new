import { Document } from 'mongoose';
import { NotificationType, NotificationPriority } from '../common/enums';
export declare class Notification {
    id: string;
    user_id?: string;
    role?: string;
    title_key: string;
    body_key: string;
    params: Record<string, any>;
    type: NotificationType;
    priority: NotificationPriority;
    action?: {
        route?: string;
        payload?: any;
    };
    read_by: string[];
    sent_push: boolean;
    delivery: Record<string, {
        status: string;
        attempts: number;
        last_error?: string;
        sent_at?: Date;
    }>;
    scheduled_at?: Date;
    status: string;
}
export type NotificationDocument = Notification & Document;
export declare const NotificationSchema: import("mongoose").Schema<Notification, import("mongoose").Model<Notification, any, any, any, Document<unknown, any, Notification, any, {}> & Notification & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Notification, Document<unknown, {}, import("mongoose").FlatRecord<Notification>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Notification> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
