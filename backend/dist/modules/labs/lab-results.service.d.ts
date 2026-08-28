import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { LabResultRepository } from "./repositories/labresult.repository";
import { LabBookingRepository } from "./repositories/labbooking.repository";
export declare class LabResultsService {
    private readonly results;
    private readonly conn;
    private readonly bookings;
    private readonly events;
    private readonly engine;
    constructor(results: LabResultRepository, conn: Connection, bookings: LabBookingRepository, events: EventEmitter2, engine: WorkflowEngineService);
    private flagFor;
    create(user: any, body: any): Promise<any>;
    mineFor(user: any): Promise<any[]>;
    byBooking(user: any, booking_id: string): Promise<any>;
    one(user: any, id: string): Promise<any>;
}
