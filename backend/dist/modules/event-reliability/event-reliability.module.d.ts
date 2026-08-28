import { Document, Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class EventDlq extends Document {
    original_event_id: string;
    type: string;
    entity_type: string;
    entity_id: string;
    payload: any;
    attempts: number;
    last_error: string;
    status: string;
}
export declare const EventDlqSchema: import("mongoose").Schema<EventDlq, Model<EventDlq, any, any, any, Document<unknown, any, EventDlq, any, {}> & EventDlq & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EventDlq, Document<unknown, {}, import("mongoose").FlatRecord<EventDlq>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<EventDlq> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class EventDelivery extends Document {
    event_id: string;
    type: string;
    listener: string;
    status: string;
    error: string;
}
export declare const EventDeliverySchema: import("mongoose").Schema<EventDelivery, Model<EventDelivery, any, any, any, Document<unknown, any, EventDelivery, any, {}> & EventDelivery & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EventDelivery, Document<unknown, {}, import("mongoose").FlatRecord<EventDelivery>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<EventDelivery> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare class EventReliabilityService {
    private events;
    private dlq;
    private delivery;
    private bus;
    constructor(events: Model<any>, dlq: Model<EventDlq>, delivery: Model<EventDelivery>, bus: EventEmitter2);
    onAnyServiceEvent(payload: any, ...args: any[]): Promise<void>;
    pushToDlq(event: any, error: string): Promise<Document<unknown, {}, EventDlq, {}, {}> & EventDlq & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    status(): Promise<{
        window: string;
        delivered: number;
        failed: number;
        dlq_pending: number;
        dlq_dead: number;
        events_total: number;
        recent_dlq: (import("mongoose").FlattenMaps<EventDlq> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        generated_at: Date;
    }>;
    retryFailed(): Promise<{
        retried: number;
        deadlined: number;
        remaining_pending: number;
    }>;
    replayOne(eventId: string): Promise<{
        ok: boolean;
        error: string;
        replayed?: undefined;
    } | {
        ok: boolean;
        replayed: any;
        error?: undefined;
    }>;
}
export declare class EventReliabilityController {
    private svc;
    constructor(svc: EventReliabilityService);
    status(): Promise<{
        window: string;
        delivered: number;
        failed: number;
        dlq_pending: number;
        dlq_dead: number;
        events_total: number;
        recent_dlq: (import("mongoose").FlattenMaps<EventDlq> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        generated_at: Date;
    }>;
    retry(): Promise<{
        retried: number;
        deadlined: number;
        remaining_pending: number;
    }>;
    replay(id: string): Promise<{
        ok: boolean;
        error: string;
        replayed?: undefined;
    } | {
        ok: boolean;
        replayed: any;
        error?: undefined;
    }>;
}
export declare class EventReliabilityModule {
}
