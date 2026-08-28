import { Model } from 'mongoose';
import { OrderDocument } from '../../schemas/order.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBooking } from '../../schemas/home-care.schema';
import { ServiceState, ServiceDomain } from '../../common/enums';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
export declare class BookingFlowService {
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private providers;
    private events;
    private engine;
    constructor(orders: Model<OrderDocument>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, home: Model<HomeCareBooking>, appts: Model<any>, providers: Model<any>, events: Model<any>, engine: WorkflowEngineService);
    private kindAliases;
    private isAdmin;
    private isProvider;
    private providerOwnership;
    private fetchEntity;
    private domainStateOf;
    private entityTypeOf;
    private nextActions;
    private recoveryOptions;
    private buildSteps;
    private providerSnapshot;
    status(user: any, type: string, id: string): Promise<{
        id: string;
        type: ServiceDomain;
        tracking_id: any;
        universal_state: ServiceState;
        domain_state: string;
        provider: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[] | (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | {
            user_id: any;
        };
        steps: {
            key: ServiceState;
            label: string;
            reached: boolean;
        }[];
        next_actions: string[];
        failure_state: string;
        recovery_options: string[];
        total: any;
        scheduled_at: any;
        createdAt: any;
        updatedAt: any;
    }>;
    timeline(user: any, type: string, id: string): Promise<{
        id: string;
        type: ServiceDomain;
        state_history: any;
        events: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    retry(user: any, type: string, id: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    resolve(user: any, type: string, id: string, body: {
        resolution: 'force_complete' | 'force_cancel';
        reason?: string;
    }): Promise<{
        ok: boolean;
    }>;
}
export declare class BookingFlowController {
    private svc;
    constructor(svc: BookingFlowService);
    status(u: any, t: string, id: string): Promise<{
        id: string;
        type: ServiceDomain;
        tracking_id: any;
        universal_state: ServiceState;
        domain_state: string;
        provider: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[] | (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | {
            user_id: any;
        };
        steps: {
            key: ServiceState;
            label: string;
            reached: boolean;
        }[];
        next_actions: string[];
        failure_state: string;
        recovery_options: string[];
        total: any;
        scheduled_at: any;
        createdAt: any;
        updatedAt: any;
    }>;
    timeline(u: any, t: string, id: string): Promise<{
        id: string;
        type: ServiceDomain;
        state_history: any;
        events: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
    }>;
    retry(u: any, t: string, id: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    resolve(u: any, t: string, id: string, b: any): Promise<{
        ok: boolean;
    }>;
}
export declare class BookingFlowModule {
}
