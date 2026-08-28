import { EventEmitter2 } from '@nestjs/event-emitter';
import { SystemEventRepository } from "./repositories/systemevent.repository";
export interface EmitInput {
    type: string;
    entity_type: 'order' | 'allocation' | 'broadcast' | 'chat' | 'shortage' | string;
    entity_id: string;
    idempotency_key?: string;
    actor_account_id?: string;
    actor_role?: string;
    reason_code?: string;
    patient_account_id?: string;
    pharmacy_account_id?: string;
    before?: any;
    after?: any;
    meta?: any;
}
export declare class EventBusService {
    private events;
    private readonly emitter?;
    private logger;
    constructor(events: SystemEventRepository, emitter?: EventEmitter2);
    emit(input: EmitInput): Promise<{
        duplicate: boolean;
    }>;
    list(filter: {
        type?: string;
        entity_type?: string;
        entity_id?: string;
        pharmacy_account_id?: string;
        patient_account_id?: string;
        since?: Date;
        limit?: number;
    }): Promise<any>;
}
