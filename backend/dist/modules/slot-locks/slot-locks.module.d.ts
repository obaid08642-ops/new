import { Model } from 'mongoose';
export declare class SlotLocksService {
    private locks;
    constructor(locks: Model<any>);
    reserve(user: any, body: {
        provider_id: string;
        booking_kind: string;
        slot_start: string;
        slot_end?: string;
    }): Promise<any>;
    confirm(user: any, lockId: string, booking_id: string): Promise<any>;
    release(user: any, lockId: string): Promise<{
        ok: boolean;
    }>;
    mine(user: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
export declare class SlotLocksController {
    private svc;
    constructor(svc: SlotLocksService);
    reserve(u: any, b: any): Promise<any>;
    confirm(u: any, id: string, b: {
        booking_id: string;
    }): Promise<any>;
    release(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    mine(u: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
export declare class SlotLocksModule {
}
