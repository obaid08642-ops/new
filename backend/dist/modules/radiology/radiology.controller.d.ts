import { RadiologyOpsService } from './radiology.service';
export declare class RadiologyController {
    private readonly svc;
    constructor(svc: RadiologyOpsService);
    services(m?: string, bp?: string, q?: string, ho?: string, hv?: string, hr?: string, nr?: string, lp?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    modalities(): Promise<any[]>;
    one(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    book(body: any, user: any): Promise<any>;
    mine(user: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    oneBooking(id: string, user: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    cancel(id: string, user: any): Promise<any>;
    transition(id: string, body: any, user: any): Promise<any>;
    publish(id: string, body: any, user: any): Promise<any>;
    myReports(user: any): Promise<any[]>;
    uploadDoc(id: string, body: any, user: any): Promise<any>;
    updateIns(id: string, body: any, user: any): Promise<any>;
    providerInbox(st: string | undefined, user: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    assignTech(id: string, body: any, user: any): Promise<any>;
    uploadReport(id: string, body: any, user: any): Promise<any>;
    checkin(id: string, user: any): Promise<any>;
    startScan(id: string, user: any): Promise<any>;
    abortScan(id: string, body: {
        reason: string;
    }, user: any): Promise<any>;
    submitForReview(id: string, body: any, user: any): Promise<any>;
    approveReport(id: string, user: any): Promise<any>;
    insuranceApproval(id: string, body: {
        approval_code: string;
        copay: number;
    }, user: any): Promise<any>;
    reschedule(id: string, body: {
        new_date: string;
        reason: string;
    }, user: any): Promise<any>;
    tracking(id: string, user: any): Promise<{
        current_state: any;
        patient_label_ar: string;
        patient_label_en: string;
        scheduled_at: any;
        preparation_confirmed: any;
        steps: any;
    }>;
    catalogDeltaRequest(body: any, user: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    confirmPrep(id: string, user: any): Promise<{
        ok: boolean;
    }>;
    adminAll(q: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    createCatalog(u: any, b: any): void;
    updateCatalog(u: any, id: string, b: any): void;
    deleteCatalog(u: any, id: string): void;
    forceState(u: any, id: string, b: any): Promise<any>;
}
