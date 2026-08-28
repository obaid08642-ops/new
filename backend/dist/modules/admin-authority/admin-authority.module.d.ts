import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { EventBusService } from '../events/event-bus.service';
import { UserDocument } from '../../schemas/user.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { Document } from 'mongoose';
export declare class AdminActionLog extends Document {
    id: string;
    action: string;
    admin_id: string;
    admin_name?: string;
    target_type?: string;
    target_id?: string;
    reason?: string;
    before?: any;
    after?: any;
}
export declare const AdminActionLogSchema: import("mongoose").Schema<AdminActionLog, Model<AdminActionLog, any, any, any, Document<unknown, any, AdminActionLog, any, {}> & AdminActionLog & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AdminActionLog, Document<unknown, {}, import("mongoose").FlatRecord<AdminActionLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AdminActionLog> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class AdminAuthorityService {
    private appts;
    private orderModel;
    private userModel;
    private labs;
    private rads;
    private log;
    private bus;
    private jwtService;
    constructor(appts: Model<any>, orderModel: Model<OrderDocument>, userModel: Model<UserDocument>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, log: Model<AdminActionLog>, bus: EventBusService, jwtService: JwtService);
    private logAction;
    forceCancelOrder(admin: any, id: string, reason: string): Promise<Order & Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    forceCompleteOrder(admin: any, id: string, reason: string): Promise<Order & Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    forceReassignOrder(admin: any, id: string, new_pharmacy_id: string, reason: string): Promise<Order & Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    forceCancelLab(admin: any, id: string, reason: string): Promise<LabBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    forceCompleteLab(admin: any, id: string, reason: string): Promise<LabBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    overrideLabInsurance(admin: any, id: string, status: 'approved' | 'rejected', reason: string): Promise<LabBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    forceCancelRad(admin: any, id: string, reason: string): Promise<RadiologyBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    forceCompleteRad(admin: any, id: string, reason: string): Promise<RadiologyBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    overrideRadInsurance(admin: any, id: string, status: 'approved' | 'rejected', reason: string): Promise<RadiologyBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    forceCancelAppt(admin: any, id: string, reason: string): Promise<any>;
    forceConfirmAppt(admin: any, id: string, reason: string): Promise<any>;
    forceRescheduleAppt(admin: any, id: string, new_time: string, reason: string): Promise<any>;
    suspendProvider(admin: any, provider_id: string, reason: string): Promise<{
        ok: boolean;
    }>;
    unsuspendProvider(admin: any, provider_id: string): Promise<{
        ok: boolean;
    }>;
    impersonateUser(admin: any, targetUserId: string): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            phone: any;
            role: any;
            full_name: any;
        };
    }>;
    listActions(filter: {
        action?: string;
        admin_id?: string;
        target_type?: string;
        limit?: number;
    }): Promise<(import("mongoose").FlattenMaps<AdminActionLog> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class AdminAuthorityController {
    private svc;
    constructor(svc: AdminAuthorityService);
    fca(id: string, b: any, u: any): Promise<any>;
    fcoappt(id: string, b: any, u: any): Promise<any>;
    fra(id: string, b: any, u: any): Promise<any>;
    fco(id: string, b: any, u: any): Promise<Order & Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    fkco(id: string, b: any, u: any): Promise<Order & Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    frr(id: string, b: any, u: any): Promise<Order & Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    fcl(id: string, b: any, u: any): Promise<LabBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    fkcl(id: string, b: any, u: any): Promise<LabBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    oil(id: string, b: any, u: any): Promise<LabBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    fcr(id: string, b: any, u: any): Promise<RadiologyBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    fkcr(id: string, b: any, u: any): Promise<RadiologyBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    oir(id: string, b: any, u: any): Promise<RadiologyBooking & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    susp(id: string, b: any, u: any): Promise<{
        ok: boolean;
    }>;
    unsp(id: string, u: any): Promise<{
        ok: boolean;
    }>;
    impersonate(targetUserId: string, admin: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            phone: any;
            role: any;
            full_name: any;
        };
    }>;
    log(q: any): Promise<(import("mongoose").FlattenMaps<AdminActionLog> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class AdminAuthorityModule {
}
