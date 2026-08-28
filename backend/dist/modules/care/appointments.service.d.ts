import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApptState, ServiceType } from '../../schemas/appointment.schema';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { AppointmentRepository } from "./repositories/appointment.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
export declare class AppointmentsService {
    private apptModel;
    private providerModel;
    private connection;
    private events;
    private engine;
    private readonly logger;
    constructor(apptModel: AppointmentRepository, providerModel: ProviderProfileRepository, connection: Connection, events: EventEmitter2, engine: WorkflowEngineService);
    private assertFamilyBookingRight;
    create(user: any, body: {
        doctor_id: string;
        service_type: ServiceType;
        slot_start: string;
        duration_minutes?: number;
        patient_notes?: string;
        symptoms?: string[];
        visit_location?: {
            lat: number;
            lng: number;
            address: string;
        };
        payment_method?: 'cash' | 'card' | 'insurance';
        insurance_provider?: string;
        insurance_member_id?: string;
        for_member_id?: string;
    }): Promise<any>;
    private isDoctorOwner;
    private assertAppointmentAccess;
    listMine(user: any, status?: ApptState): Promise<any>;
    one(user: any, id: string): Promise<any>;
    transition(id: string, to: ApptState, actor: any, note?: string): Promise<any>;
    cancel(id: string, user: any, reason?: string, isNoShow?: boolean): Promise<any>;
    confirm(id: string, user: any): Promise<any>;
    checkIn(id: string, user: any): Promise<any>;
    start(id: string, user: any): Promise<any>;
    complete(id: string, user: any): Promise<any>;
    finish(id: string, body: any, user: any): Promise<{
        success: boolean;
        appointment: any;
    }>;
    getSummary(id: string, user: any): Promise<any>;
    reschedule(id: string, user: any, body: {
        slot_start: string;
    }): Promise<any>;
    joinWaitlist(user: any, body: {
        doctorId: string;
        date: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    onPaymentCompleted(payload: {
        booking_id?: string;
        booking_kind?: string;
        amount?: number;
        transaction_id?: string;
    }): Promise<void>;
}
