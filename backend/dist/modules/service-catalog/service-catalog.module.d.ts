import { Model } from 'mongoose';
import { LabService } from '../../schemas/lab.schema';
import { RadiologyService } from '../../schemas/radiology.schema';
import { EventBusService } from '../events/event-bus.service';
import { Document } from 'mongoose';
export declare class ServiceOwnership extends Document {
    id: string;
    account_id: string;
    entity_type: string;
    entity_id: string;
    approved: boolean;
}
export declare const ServiceOwnershipSchema: import("mongoose").Schema<ServiceOwnership, Model<ServiceOwnership, any, any, any, Document<unknown, any, ServiceOwnership, any, {}> & ServiceOwnership & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ServiceOwnership, Document<unknown, {}, import("mongoose").FlatRecord<ServiceOwnership>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ServiceOwnership> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class ProviderSchedule extends Document {
    id: string;
    account_id: string;
    entity_type: string;
    weekly: Record<string, {
        start: string;
        end: string;
        breaks?: {
            start: string;
            end: string;
        }[];
    }[]>;
    blocked_dates: string[];
    slot_minutes: number;
    max_per_slot: number;
    coverage_radius_km: number;
    is_online: boolean;
}
export declare const ProviderScheduleSchema: import("mongoose").Schema<ProviderSchedule, Model<ProviderSchedule, any, any, any, Document<unknown, any, ProviderSchedule, any, {}> & ProviderSchedule & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProviderSchedule, Document<unknown, {}, import("mongoose").FlatRecord<ProviderSchedule>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProviderSchedule> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class ServiceCatalogService {
    private labs;
    private rads;
    private own;
    private sched;
    private bus;
    constructor(labs: Model<LabService>, rads: Model<RadiologyService>, own: Model<ServiceOwnership>, sched: Model<ProviderSchedule>, bus: EventBusService);
    private assertProvider;
    myCatalog(user: any, entity_type: 'lab' | 'radiology'): Promise<any>;
    createService(user: any, entity_type: 'lab' | 'radiology', data: any): Promise<any>;
    updateService(user: any, entity_type: 'lab' | 'radiology', id: string, patch: any): Promise<any>;
    toggleService(user: any, entity_type: 'lab' | 'radiology', id: string, active: boolean): Promise<any>;
    deleteService(user: any, entity_type: 'lab' | 'radiology', id: string): Promise<{
        ok: boolean;
    }>;
    adminListAll(entity_type: 'lab' | 'radiology', q: any): Promise<any>;
    adminApproveService(entity_type: 'lab' | 'radiology', entity_id: string, approve: boolean, user: any): Promise<{
        ok: boolean;
        ownership: Document<unknown, {}, ServiceOwnership, {}, {}> & ServiceOwnership & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
    }>;
    getSchedule(user: any, entity_type: string): Promise<any>;
    upsertSchedule(user: any, entity_type: string, data: any): Promise<ProviderSchedule & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    availableSlots(account_id: string, entity_type: string, date: string, bookedCounter?: (slotISO: string) => Promise<number>): Promise<{
        time: string;
        available: boolean;
    }[]>;
}
export declare class ServiceCatalogController {
    private svc;
    constructor(svc: ServiceCatalogService);
    mine(t: 'lab' | 'radiology', u: any): Promise<any>;
    create(t: 'lab' | 'radiology', b: any, u: any): Promise<any>;
    update(t: 'lab' | 'radiology', id: string, b: any, u: any): Promise<any>;
    toggle(t: 'lab' | 'radiology', id: string, b: any, u: any): Promise<any>;
    del(t: 'lab' | 'radiology', id: string, u: any): Promise<{
        ok: boolean;
    }>;
    sched(e: string, u: any): Promise<any>;
    setSched(e: string, b: any, u: any): Promise<ProviderSchedule & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    adminAll(t: 'lab' | 'radiology', q: any): Promise<any>;
    approve(t: 'lab' | 'radiology', id: string, b: any, u: any): Promise<{
        ok: boolean;
        ownership: Document<unknown, {}, ServiceOwnership, {}, {}> & ServiceOwnership & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
    }>;
}
export declare class ServiceCatalogModule {
}
