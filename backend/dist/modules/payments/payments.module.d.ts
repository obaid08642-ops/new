import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { RealtimeService } from '../realtime/realtime.service';
import { FraudService } from '../finance-engine/finance-engine.module';
import { Request } from 'express';
export declare class PaymentsService {
    private txns;
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private insReqs;
    private engine;
    private events;
    private realtime;
    private readonly fraud;
    private logger;
    private adapter;
    constructor(txns: Model<any>, orders: Model<any>, labs: Model<any>, rads: Model<any>, home: Model<any>, appts: Model<any>, insReqs: Model<any>, engine: WorkflowEngineService, events: EventEmitter2, realtime: RealtimeService, fraud: FraudService);
    private modelFor;
    private assertBookingOwnerOrAdmin;
    private assertTransactionVerifier;
    createPaymentIntent(user: any, type: string, id: string, idempotencyKey: string): Promise<any>;
    verifyPayment(user: any, transactionId: string): Promise<any>;
    retryPayment(user: any, type: string, id: string, idempotencyKey: string): Promise<any>;
    refundPayment(user: any, transactionId: string, amount?: number, reason?: string): Promise<any>;
    capturePayment(user: any, transactionId: string): Promise<any>;
    listForBooking(user: any, type: string, id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    handleWebhook(provider: string, payload: any, signature?: string, rawBody?: string): Promise<{
        ok: boolean;
        reason: string;
    } | {
        ok: boolean;
        reason?: undefined;
    }>;
    private verifyWebhookSignature;
}
export declare class PaymentsController {
    private svc;
    constructor(svc: PaymentsService);
    intent(u: any, t: string, id: string, key: string): Promise<any>;
    verify(u: any, txn: string): Promise<any>;
    retry(u: any, t: string, id: string, key: string): Promise<any>;
    refund(u: any, txn: string, b: {
        amount?: number;
        reason?: string;
    }): Promise<any>;
    capture(u: any, txn: string): Promise<any>;
    list(u: any, t: string, id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
export declare class PaymentsWebhookController {
    private svc;
    constructor(svc: PaymentsService);
    webhook(p: string, b: any, signature: string, req: Request): Promise<{
        ok: boolean;
        reason: string;
    } | {
        ok: boolean;
        reason?: undefined;
    }>;
}
export declare class PaymentsModule {
}
