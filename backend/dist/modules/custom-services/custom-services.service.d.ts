import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomServiceRequestRepository } from "./repositories/customservicerequest.repository";
export declare class CustomServicesService {
    private readonly model;
    private readonly events;
    constructor(model: CustomServiceRequestRepository, events: EventEmitter2);
    create(user: any, body: any): Promise<any>;
    mine(user: any, kind?: string): Promise<any>;
    one(user: any, id: string): Promise<any>;
    adminList(kind?: string, status?: string): Promise<any>;
    updateStatus(user: any, id: string, status: string, note?: string): Promise<any>;
}
