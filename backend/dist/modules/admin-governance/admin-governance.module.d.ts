import { Model } from 'mongoose';
import { OrderDocument } from '../../schemas/order.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBooking } from '../../schemas/home-care.schema';
import { UserDocument } from '../../schemas/user.schema';
export declare class AdminGovernanceService {
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private users;
    private providers;
    private events;
    constructor(orders: Model<OrderDocument>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, home: Model<HomeCareBooking>, appts: Model<any>, users: Model<UserDocument>, providers: Model<any>, events: Model<any>);
    private scoreBucket;
    providersPerformance(filter?: {
        type?: string;
        limit?: number;
    }): Promise<any[]>;
    patientProfile(patient_id: string): Promise<{
        error: string;
        user?: undefined;
        summary?: undefined;
        insurance_usage?: undefined;
        active?: undefined;
        history?: undefined;
        recent_events?: undefined;
    } | {
        user: import("mongoose").FlattenMaps<UserDocument> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        summary: {
            total_orders: number;
            active_orders: number;
            total_labs: number;
            active_labs: number;
            total_rads: number;
            active_rads: number;
            total_nursing: number;
            active_nursing: number;
            total_consultation: number;
            active_consultation: number;
            spend_estimate: any;
        };
        insurance_usage: {
            orders_using_insurance: number;
            labs_using_insurance: number;
            rads_using_insurance: number;
            insurance_providers: string[];
        };
        active: {
            orders: (import("mongoose").FlattenMaps<OrderDocument> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            labs: (import("mongoose").FlattenMaps<LabBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            rads: (import("mongoose").FlattenMaps<RadiologyBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            nursing: (import("mongoose").FlattenMaps<HomeCareBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            consultation: (import("mongoose").FlattenMaps<any> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            })[];
        };
        history: {
            orders: (import("mongoose").FlattenMaps<OrderDocument> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            labs: (import("mongoose").FlattenMaps<LabBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            rads: (import("mongoose").FlattenMaps<RadiologyBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            nursing: (import("mongoose").FlattenMaps<HomeCareBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            consultation: (import("mongoose").FlattenMaps<any> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            })[];
        };
        recent_events: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        error?: undefined;
    }>;
    entityTrace(entity_type: string, entity_id: string): Promise<{
        entity: any;
        events: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        state_history: any[];
    }>;
    globalSummary(): Promise<{
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
    }>;
}
export declare class AdminGovernanceController {
    private svc;
    constructor(svc: AdminGovernanceService);
    summary(): Promise<{
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
    }>;
    perf(q: any): Promise<any[]>;
    patient(id: string): Promise<{
        error: string;
        user?: undefined;
        summary?: undefined;
        insurance_usage?: undefined;
        active?: undefined;
        history?: undefined;
        recent_events?: undefined;
    } | {
        user: import("mongoose").FlattenMaps<UserDocument> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        summary: {
            total_orders: number;
            active_orders: number;
            total_labs: number;
            active_labs: number;
            total_rads: number;
            active_rads: number;
            total_nursing: number;
            active_nursing: number;
            total_consultation: number;
            active_consultation: number;
            spend_estimate: any;
        };
        insurance_usage: {
            orders_using_insurance: number;
            labs_using_insurance: number;
            rads_using_insurance: number;
            insurance_providers: string[];
        };
        active: {
            orders: (import("mongoose").FlattenMaps<OrderDocument> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            labs: (import("mongoose").FlattenMaps<LabBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            rads: (import("mongoose").FlattenMaps<RadiologyBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            nursing: (import("mongoose").FlattenMaps<HomeCareBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            consultation: (import("mongoose").FlattenMaps<any> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            })[];
        };
        history: {
            orders: (import("mongoose").FlattenMaps<OrderDocument> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            labs: (import("mongoose").FlattenMaps<LabBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            rads: (import("mongoose").FlattenMaps<RadiologyBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            nursing: (import("mongoose").FlattenMaps<HomeCareBooking> & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            })[];
            consultation: (import("mongoose").FlattenMaps<any> & Required<{
                _id: unknown;
            }> & {
                __v: number;
            })[];
        };
        recent_events: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        error?: undefined;
    }>;
    trace(et: string, ei: string): Promise<{
        entity: any;
        events: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        state_history: any[];
    }>;
}
export declare class KillSwitchesController {
    private configModel;
    constructor(configModel: Model<any>);
    private defaultSwitches;
    list(): Promise<any>;
    toggle(key: string, body: {
        value: boolean;
        reason?: string;
    }): Promise<any>;
}
export declare class CommissionsController {
    private profiles;
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    constructor(profiles: Model<any>, orders: Model<any>, labs: Model<any>, rads: Model<any>, home: Model<any>, appts: Model<any>);
    list(): Promise<any[]>;
    update(id: string, body: {
        commission: number;
    }): Promise<{
        success: boolean;
    }>;
}
export declare class AdminGovernanceModule {
}
