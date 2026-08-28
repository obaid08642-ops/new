import { Document } from 'mongoose';
import { UserRole } from '../common/enums';
export declare class User {
    id: string;
    full_name: string;
    phone: string;
    email?: string;
    password_hash?: string;
    role: UserRole;
    active: boolean;
    onboarding_only?: boolean;
    is_guest: boolean;
    deleted_at?: Date;
    avatar?: string;
    city?: string;
    district?: string;
    location?: {
        lat: number;
        lng: number;
    };
    preferred_lang: string;
    legal_consents?: {
        policy_id: string;
        version: string;
        accepted_at: Date;
    }[];
    health_id?: string;
    device_tokens: string[];
    last_login_at?: Date;
    parent_provider_account_id?: string;
    assigned_branch_id?: string;
    department?: string;
    permissions?: string[];
    schedule?: any;
    suspended?: boolean;
    verified?: boolean;
    specialty?: string;
    degree?: string;
    years_experience?: number;
    license_number?: string;
    consultation_fee?: number;
}
export type UserDocument = User & Document;
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User, any, {}> & User & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<User> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
