import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';
export declare class PatientUxService {
    private reviews;
    private refunds;
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private events;
    private bus;
    constructor(reviews: Model<any>, refunds: Model<any>, orders: Model<any>, labs: Model<any>, rads: Model<any>, home: Model<any>, appts: Model<any>, events: EventEmitter2, bus: EventBusService);
    private model;
    rate(user: any, body: {
        booking_kind: string;
        booking_id: string;
        rating: number;
        comment?: string;
        aspects?: any;
    }): Promise<any>;
    requestRefund(user: any, body: {
        booking_kind: string;
        booking_id: string;
        reason: string;
        amount?: number;
    }): Promise<any>;
    myRefunds(user: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    adminListRefunds(status?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    adminDecideRefund(admin: any, id: string, decision: 'approved' | 'rejected', note?: string, amount?: number): Promise<any>;
    rebook(user: any, body: {
        booking_kind: string;
        booking_id: string;
        scheduled_at: string;
    }): Promise<{
        kind: string;
        id: any;
    }>;
}
export declare class PatientUxController {
    private svc;
    constructor(svc: PatientUxService);
    rate(u: any, b: any): Promise<any>;
    refund(u: any, b: any): Promise<any>;
    refunds(u: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    rebook(u: any, b: any): Promise<{
        kind: string;
        id: any;
    }>;
}
export declare class AdminRefundsController {
    private svc;
    constructor(svc: PatientUxService);
    list(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    pending(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    decide(u: any, id: string, body: {
        decision: 'approved' | 'rejected';
        note?: string;
        amount?: number;
    }): Promise<any>;
}
export declare class AdminOverrideService {
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private bus;
    constructor(orders: Model<any>, labs: Model<any>, rads: Model<any>, home: Model<any>, appts: Model<any>, bus: EventBusService);
    private modelFor;
    forceCancel(admin: any, kind: string, id: string, reason: string): Promise<any>;
    forceTransition(admin: any, kind: string, id: string, state: string, reason: string): Promise<any>;
    markPayment(admin: any, kind: string, id: string, payment_status: 'paid' | 'refunded' | 'failed', reason: string, amount?: number): Promise<any>;
}
export declare class AdminOverrideController {
    private svc;
    constructor(svc: AdminOverrideService);
    cancel(u: any, body: {
        kind: string;
        id: string;
        reason: string;
    }): Promise<any>;
    transition(u: any, body: {
        kind: string;
        id: string;
        state: string;
        reason: string;
    }): Promise<any>;
    markPayment(u: any, body: {
        kind: string;
        id: string;
        payment_status: 'paid' | 'refunded' | 'failed';
        amount?: number;
        reason: string;
    }): Promise<any>;
}
export declare class PatientUxModule {
}
