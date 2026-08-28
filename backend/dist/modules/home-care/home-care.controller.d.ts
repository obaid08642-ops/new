import { Model, Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HomeCareBooking, HomeCareService, NurseProvider } from '../../schemas/home-care.schema';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
export declare class NursingController {
    private readonly bkgModel;
    private readonly serviceModel;
    private readonly nurseModel;
    private readonly conn;
    private readonly events;
    private readonly engine;
    constructor(bkgModel: Model<HomeCareBooking>, serviceModel: Model<HomeCareService>, nurseModel: Model<NurseProvider>, conn: Connection, events: EventEmitter2, engine: WorkflowEngineService);
    private isAdmin;
    private isNursingProvider;
    private findVisit;
    private assertReadAccess;
    private assertProviderMutation;
    createNote(u: any, body: any): Promise<any>;
    listNotes(u: any, patientId: string): Promise<any[]>;
    getCatalog(): Promise<(import("mongoose").FlattenMaps<HomeCareService> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    createCatalog(u: any, b: any): Promise<void>;
    updateCatalog(u: any, id: string, b: any): Promise<void>;
    deleteCatalog(u: any, id: string): Promise<void>;
    getVisits(provider_id: string, user: any): Promise<(import("mongoose").FlattenMaps<HomeCareBooking> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getVisitById(id: string, user: any): Promise<any>;
    getVisitTracking(id: string, user: any): Promise<{
        booking_id: any;
        nurse_phone: any;
        hospital_lat: any;
        hospital_lng: any;
        current_lat: any;
        current_lng: any;
        eta_minutes: number;
        status: any;
        vitals: any;
        notes: any;
    }>;
    private haversineKm;
    respondToVisit(): void;
    startTransit(id: string, user: any): Promise<{
        success: boolean;
        state: any;
    }>;
    arriveAtPatient(id: string, body: {
        lat: number;
        lng: number;
    }, user: any): Promise<{
        success: boolean;
        state: any;
    }>;
    startCare(id: string, user: any): Promise<{
        success: boolean;
        state: any;
    }>;
    triggerNoShow(id: string, user: any): Promise<{
        success: boolean;
        state: any;
    }>;
    triggerEmergency(id: string, body: {
        reason: string;
    }, user: any): Promise<{
        success: boolean;
        state: any;
    }>;
    completeVisit(id: string, body: any, user: any): Promise<{
        success: boolean;
        state: any;
    }>;
    getWalletData(user: any, providerId?: string): Promise<{
        balance: number;
        pendingEscrow: number;
        transactions: any[];
    }>;
}
export declare class HomeCareContractController {
    private readonly bookings;
    constructor(bookings: Model<HomeCareBooking>);
    getOwnedBooking(user: any, bookingId: string): Promise<{
        id: any;
        status: any;
        service_type: any;
        scheduled_at: string;
        nurse: {
            display_name: any;
            avatar_url: any;
        };
        timeline: any;
    }>;
}
