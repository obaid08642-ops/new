import { Model } from 'mongoose';
import { ServiceState } from '../../common/enums';
import { OrderDocument } from '../../schemas/order.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBooking } from '../../schemas/home-care.schema';
import { UserDocument } from '../../schemas/user.schema';
import { AdminGovernanceService } from '../admin-governance/admin-governance.module';
export declare class AdminCommandCenterService {
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private users;
    private providers;
    private events;
    private gov;
    constructor(orders: Model<OrderDocument>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, home: Model<HomeCareBooking>, appts: Model<any>, users: Model<UserDocument>, providers: Model<any>, events: Model<any>, gov: AdminGovernanceService);
    private liveBookings;
    private failedTransactions;
    private stuckMatching;
    private providersLiveStatus;
    orderDetail(kind: string, id: string): Promise<{
        kind: string;
        id: any;
        tracking_id: any;
        state: any;
        universal_state: ServiceState;
        patient: {
            id: any;
            name: any;
            phone: any;
            email: any;
        } | {
            id: any;
            name?: undefined;
            phone?: undefined;
            email?: undefined;
        };
        provider: {
            id: any;
            name: any;
            type: any;
        } | {
            id: any;
            name?: undefined;
            type?: undefined;
        };
        total: any;
        payment_method: any;
        address: any;
        items: any;
        history: any;
        created_at: any;
        updated_at: any;
        raw: any;
    }>;
    snapshot(): Promise<{
        summary: {
            orders: {
                total: number;
                active: number;
            };
            labs: {
                total: number;
                active: number;
            };
            radiology: {
                total: number;
                active: number;
            };
            nursing: {
                total: number;
                active: number;
            };
            consultation: {
                total: number;
                active: number;
            };
            providers: {
                total: number;
                active: number;
            };
            patients: {
                total: number;
            };
            events_last_24h: number;
            generated_at: Date;
        };
        live_bookings: {
            kind: any;
            id: any;
            tracking_id: any;
            universal_state: ServiceState;
            domain_state: any;
            patient_id: any;
            provider_id: any;
            total: any;
            createdAt: any;
        }[];
        failed_transactions: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        stuck_matching: {
            pharmacy: (import("mongoose").FlattenMaps<OrderDocument> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            nursing: (import("mongoose").FlattenMaps<HomeCareBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
        providers_status: any[];
        top_providers: any[];
        bottom_providers: any[];
        generated_at: Date;
    }>;
}
export declare class AdminCommandCenterController {
    private svc;
    constructor(svc: AdminCommandCenterService);
    snapshot(): Promise<{
        summary: {
            orders: {
                total: number;
                active: number;
            };
            labs: {
                total: number;
                active: number;
            };
            radiology: {
                total: number;
                active: number;
            };
            nursing: {
                total: number;
                active: number;
            };
            consultation: {
                total: number;
                active: number;
            };
            providers: {
                total: number;
                active: number;
            };
            patients: {
                total: number;
            };
            events_last_24h: number;
            generated_at: Date;
        };
        live_bookings: {
            kind: any;
            id: any;
            tracking_id: any;
            universal_state: ServiceState;
            domain_state: any;
            patient_id: any;
            provider_id: any;
            total: any;
            createdAt: any;
        }[];
        failed_transactions: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        stuck_matching: {
            pharmacy: (import("mongoose").FlattenMaps<OrderDocument> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            nursing: (import("mongoose").FlattenMaps<HomeCareBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
        };
        providers_status: any[];
        top_providers: any[];
        bottom_providers: any[];
        generated_at: Date;
    }>;
    orderDetail(kind: string, id: string): Promise<{
        kind: string;
        id: any;
        tracking_id: any;
        state: any;
        universal_state: ServiceState;
        patient: {
            id: any;
            name: any;
            phone: any;
            email: any;
        } | {
            id: any;
            name?: undefined;
            phone?: undefined;
            email?: undefined;
        };
        provider: {
            id: any;
            name: any;
            type: any;
        } | {
            id: any;
            name?: undefined;
            type?: undefined;
        };
        total: any;
        payment_method: any;
        address: any;
        items: any;
        history: any;
        created_at: any;
        updated_at: any;
        raw: any;
    }>;
}
export declare class AdminCommandCenterModule {
}
