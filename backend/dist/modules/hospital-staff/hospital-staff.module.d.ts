import { Model } from 'mongoose';
import { UserDocument } from '../../schemas/user.schema';
export declare class HospitalStaffService {
    private users;
    private accounts;
    constructor(users: Model<UserDocument>, accounts: Model<any>);
    private getOwnerAccount;
    list(user: any): Promise<(import("mongoose").FlattenMaps<UserDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    create(user: any, body: {
        full_name: string;
        phone: string;
        email?: string;
        password: string;
        staff_role: string;
        department?: string;
        permissions?: string[];
        schedule?: any;
        specialty?: string;
        degree?: string;
        years_experience?: number;
        license_number?: string;
        consultation_fee?: number;
    }): Promise<any>;
    update(user: any, staffId: string, body: {
        full_name?: string;
        phone?: string;
        email?: string;
        department?: string;
        permissions?: string[];
        schedule?: any;
        specialty?: string;
        degree?: string;
        years_experience?: number;
        license_number?: string;
        consultation_fee?: number;
    }): Promise<any>;
    suspend(user: any, staffId: string, suspended: boolean): Promise<{
        ok: boolean;
        suspended: boolean;
    }>;
    remove(user: any, staffId: string): Promise<{
        ok: boolean;
    }>;
    resetPassword(user: any, staffId: string, newPassword: string): Promise<{
        ok: boolean;
    }>;
}
export declare class HospitalStaffController {
    private svc;
    constructor(svc: HospitalStaffService);
    list(u: any): Promise<(import("mongoose").FlattenMaps<UserDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    create(u: any, b: any): Promise<any>;
    update(u: any, id: string, b: any): Promise<any>;
    suspend(u: any, id: string, b: {
        suspended?: boolean;
    }): Promise<{
        ok: boolean;
        suspended: boolean;
    }>;
    reset(u: any, id: string, b: {
        password: string;
    }): Promise<{
        ok: boolean;
    }>;
    remove(u: any, id: string): Promise<{
        ok: boolean;
    }>;
}
export declare class HospitalStaffModule {
}
