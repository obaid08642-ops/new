import { Model } from 'mongoose';
import { Document } from 'mongoose';
import { ServiceState } from '../../common/enums';
import { OrderDocument } from '../../schemas/order.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBooking } from '../../schemas/home-care.schema';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
export declare class CancellationPenalty extends Document {
    booking_id: string;
    kind: string;
    patient_id: string;
    provider_id: string;
    amount: number;
    reason: string;
    status: string;
}
export declare const CancellationPenaltySchema: import("mongoose").Schema<CancellationPenalty, Model<CancellationPenalty, any, any, any, Document<unknown, any, CancellationPenalty, any, {}> & CancellationPenalty & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CancellationPenalty, Document<unknown, {}, import("mongoose").FlatRecord<CancellationPenalty>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CancellationPenalty> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class OperationsSafetyService {
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private providers;
    private penalties;
    private engine;
    constructor(orders: Model<OrderDocument>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, home: Model<HomeCareBooking>, appts: Model<any>, providers: Model<any>, penalties: Model<CancellationPenalty>, engine: WorkflowEngineService);
    slaReport(): Promise<{
        sla_definition: Record<string, Record<string, number>>;
        breached: {
            kind: string;
            id: any;
            universal_state: ServiceState;
            overdue_minutes: number;
            patient_id: any;
        }[];
        total_breached: number;
    }>;
    escalate(body?: {
        kind?: string;
        threshold_minutes?: number;
    }): Promise<{
        escalated: number;
        results: any[];
    }>;
    assessPenalty(args: {
        booking_id: string;
        kind: string;
        patient_id: string;
        provider_id?: string;
        scheduled_at?: Date;
        cancelled_at?: Date;
    }): Promise<Document<unknown, {}, CancellationPenalty, {}, {}> & CancellationPenalty & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    fallback(body: {
        kind: 'pharmacy' | 'lab' | 'radiology' | 'nursing' | 'consultation';
        exclude_provider_id?: string;
        city?: string;
        insurance?: string;
        service_keys?: string[];
    }): Promise<{
        fallback_count: number;
        providers: any[];
    }>;
    listPenalties(filter?: {
        status?: string;
        patient_id?: string;
    }): Promise<(import("mongoose").FlattenMaps<CancellationPenalty> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class OperationsSafetyController {
    private svc;
    constructor(svc: OperationsSafetyService);
    sla(): Promise<{
        sla_definition: Record<string, Record<string, number>>;
        breached: {
            kind: string;
            id: any;
            universal_state: ServiceState;
            overdue_minutes: number;
            patient_id: any;
        }[];
        total_breached: number;
    }>;
    escalate(b: any): Promise<{
        escalated: number;
        results: any[];
    }>;
    assess(b: any): Promise<Document<unknown, {}, CancellationPenalty, {}, {}> & CancellationPenalty & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    fallback(b: any): Promise<{
        fallback_count: number;
        providers: any[];
    }>;
    penalties(q: any): Promise<(import("mongoose").FlattenMaps<CancellationPenalty> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export declare class OperationsSafetyModule {
}
