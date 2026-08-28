import { Document } from 'mongoose';
export declare class FamilyMember {
    user_id: string;
    role: string;
    permissions: string[];
    joined_at: Date;
    display_name?: string;
    avatar?: string;
}
export declare class FamilyGroup extends Document {
    id: string;
    owner_id: string;
    name: string;
    members: FamilyMember[];
    invite_code?: string;
    invite_expires_at?: Date;
    is_deleted: boolean;
}
export declare const FamilyGroupSchema: import("mongoose").Schema<FamilyGroup, import("mongoose").Model<FamilyGroup, any, any, any, Document<unknown, any, FamilyGroup, any, {}> & FamilyGroup & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FamilyGroup, Document<unknown, {}, import("mongoose").FlatRecord<FamilyGroup>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<FamilyGroup> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class SharedCalendarEvent extends Document {
    id: string;
    group_id: string;
    title: string;
    description?: string;
    type: string;
    ref_id?: string;
    event_date: Date;
    created_by: string;
    member_user_id: string;
    member_name?: string;
    time_label?: string;
    color?: string;
    is_deleted: boolean;
}
export declare const SharedCalendarEventSchema: import("mongoose").Schema<SharedCalendarEvent, import("mongoose").Model<SharedCalendarEvent, any, any, any, Document<unknown, any, SharedCalendarEvent, any, {}> & SharedCalendarEvent & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SharedCalendarEvent, Document<unknown, {}, import("mongoose").FlatRecord<SharedCalendarEvent>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SharedCalendarEvent> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class FamilyPermissionRequest extends Document {
    id: string;
    group_id: string;
    requester_id: string;
    target_member_id: string;
    requested_permissions: string[];
    status: string;
    responded_at?: Date;
    response_note?: string;
}
export declare const FamilyPermissionRequestSchema: import("mongoose").Schema<FamilyPermissionRequest, import("mongoose").Model<FamilyPermissionRequest, any, any, any, Document<unknown, any, FamilyPermissionRequest, any, {}> & FamilyPermissionRequest & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FamilyPermissionRequest, Document<unknown, {}, import("mongoose").FlatRecord<FamilyPermissionRequest>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<FamilyPermissionRequest> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
