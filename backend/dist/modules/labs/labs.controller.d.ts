import { LabsService } from './labs.service';
export declare class LabsController {
    private readonly svc;
    constructor(svc: LabsService);
    services(cat?: string, q?: string, ho?: string, hv?: string, hr?: string, nr?: string, lp?: string): Promise<any>;
    packages(): Promise<any>;
    categories(): Promise<any>;
    one(id: string): Promise<any>;
    book(body: any, user: any): Promise<any>;
    mine(user: any): Promise<any>;
    oneBooking(id: string, user: any): Promise<any>;
    cancel(id: string, user: any): Promise<any>;
    transition(id: string, body: any, user: any): Promise<any>;
    uploadDoc(id: string, body: any, user: any): Promise<any>;
    updateIns(id: string, body: any, user: any): Promise<any>;
    optInCash(id: string, serviceId: string, body: any, user: any): Promise<any>;
    providerInbox(st: string | undefined, user: any): Promise<any>;
    assignTech(id: string, body: any, user: any): Promise<any>;
    uploadReport(id: string, body: any, user: any): Promise<any>;
    reschedule(id: string, body: any, user: any): Promise<any>;
    updateGps(id: string, body: any, user: any): Promise<{
        ok: boolean;
        gps: any;
    }>;
    getTracking(id: string, user: any): Promise<{
        eta: any;
        distance: any;
        techName: any;
        steps: any;
    }>;
    declareEmergency(id: string, body: any, user: any): Promise<any>;
    reassign(id: string, user: any): Promise<any>;
    adminAll(q: any): Promise<any>;
    registerSample(u: any, b: any): Promise<import("../../schemas/lab.schema").LabSample>;
    updateStage(u: any, id: string, b: {
        stage: any;
        notes?: string;
    }): Promise<{
        ok: boolean;
        stage: "sent" | "received" | "analyzing" | "result_ready";
    }>;
    listSamples(u: any): Promise<any>;
    createCatalog(u: any, b: any): void;
    updateCatalog(u: any, id: string, b: any): void;
    deleteCatalog(u: any, id: string): void;
    forceState(u: any, id: string, b: any): Promise<any>;
    getPackageDetails(id: string): Promise<any>;
    compatibleProviders(testIds?: string): Promise<{
        id: any;
        facility_id: any;
        name: any;
        homeVisitAvailable: boolean;
        rating: any;
        logo: any;
    }[]>;
}
