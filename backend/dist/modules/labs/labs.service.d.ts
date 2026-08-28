import { Model } from 'mongoose';
import { LabService, LabBookingState, LabSample } from '../../schemas/lab.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { LabPdfService } from './lab-pdf.service';
import { LabServiceRepository } from "./repositories/labservice.repository";
import { LabBookingRepository } from "./repositories/labbooking.repository";
import { LabSampleRepository } from "./repositories/labsample.repository";
import { ProviderProfileDocument } from '../../schemas/provider-profile.schema';
export declare class LabsService {
    private readonly svcModel;
    private readonly bkgModel;
    private readonly sampleModel;
    private readonly providerProfiles;
    private readonly events;
    private readonly bus;
    private readonly engine;
    private readonly pdfService;
    constructor(svcModel: LabServiceRepository, bkgModel: LabBookingRepository, sampleModel: LabSampleRepository, providerProfiles: Model<ProviderProfileDocument>, events: EventEmitter2, bus: EventBusService, engine: WorkflowEngineService, pdfService: LabPdfService);
    list(opts: {
        category?: string;
        search?: string;
        home_only?: boolean;
        packages_only?: boolean;
        highest_rated?: boolean;
        nearest?: boolean;
        lowest_price?: boolean;
    }): Promise<any>;
    categoryCounts(): Promise<any>;
    getById(id: string): Promise<any>;
    compatibleProviders(testIds: string[]): Promise<{
        id: any;
        facility_id: any;
        name: any;
        homeVisitAvailable: boolean;
        rating: any;
        logo: any;
    }[]>;
    book(user: any, data: any): Promise<any>;
    addDocument(id: string, user: any, body: {
        kind: string;
        url_or_b64: string;
        filename?: string;
    }): Promise<any>;
    updateInsuranceApproval(id: string, payload: {
        status?: string;
        totalCopay?: number;
        items?: any[];
    }, user: any): Promise<any>;
    optInCash(id: string, serviceId: string, payload: {
        optInCash?: boolean;
    }, user: any): Promise<any>;
    mineFor(user: any): Promise<any>;
    getBooking(id: string, user: any): Promise<any>;
    cancel(id: string, user: any): Promise<any>;
    transition(id: string, to: LabBookingState, user: any, note?: string): Promise<any>;
    listForProvider(user: any, status?: string): Promise<any>;
    assignTechnician(id: string, user: any, body: {
        technician_id?: string;
        technician_name?: string;
        notes?: string;
    }): Promise<any>;
    uploadReport(id: string, user: any, body: {
        name?: string;
        mime?: string;
        base64?: string;
        url?: string;
        notes?: string;
        structuredData?: any[];
    }): Promise<any>;
    adminListAll(filter: {
        status?: string;
        insurance_status?: string;
        location_type?: string;
        delayed_only?: string;
        disputed_only?: string;
        limit?: number;
    }): Promise<any>;
    registerSample(user: any, body: {
        lab_order_id: string;
        barcode: string;
        tests: string[];
        notes?: string;
    }): Promise<LabSample>;
    updateSampleStage(user: any, sampleId: string, stage: 'received' | 'analyzing' | 'result_ready' | 'sent', notes?: string): Promise<{
        ok: boolean;
        stage: "sent" | "received" | "analyzing" | "result_ready";
    }>;
    listSamples(user: any): Promise<any>;
    private assertAssignedProviderOrAdmin;
    private assertPatientOrAssignedProvider;
    private assertBookingOwner;
    createCatalog(user: any, body: any): Promise<LabService>;
    updateCatalog(user: any, id: string, body: any): Promise<any>;
    deleteCatalog(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    adminForceState(user: any, id: string, targetState: LabBookingState, note: string): Promise<any>;
    rescheduleBooking(id: string, user: any, body: any): Promise<any>;
    updateGps(id: string, user: any, body: any): Promise<{
        ok: boolean;
        gps: any;
    }>;
    getTracking(id: string, user: any): Promise<{
        eta: any;
        distance: any;
        techName: any;
        steps: any;
    }>;
    declareEmergency(id: string, user: any, body: any): Promise<any>;
    reassign(id: string, user: any): Promise<any>;
}
