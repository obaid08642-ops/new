import { EventBusService } from './event-bus.service';
export declare class AdminEventsController {
    private bus;
    constructor(bus: EventBusService);
    list(type?: string, entity_type?: string, entity_id?: string, pharmacy_account_id?: string, patient_account_id?: string, since_minutes?: string, limit?: string): Promise<any>;
    trace(entity_type: string, entity_id: string): Promise<any>;
}
