import { Model } from 'mongoose';
import { RadiologyBookingState } from '../../schemas/radiology.schema';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class RadiologyOpsService {
    private svcModel;
    private bkgModel;
    private centerBkgModel;
    private userModel;
    private resultModel;
    private storageObjects;
    private engine;
    private events;
    constructor(svcModel: Model<any>, bkgModel: Model<any>, centerBkgModel: Model<any>, userModel: Model<any>, resultModel: Model<any>, storageObjects: Model<any>, engine: WorkflowEngineService, events: EventEmitter2);
    private findBooking;
    private privateProviderStorage;
    transition(id: string, targetState: RadiologyBookingState, user: any, note?: string): Promise<any>;
    checkin(id: string, user: any): Promise<any>;
    startScan(id: string, user: any): Promise<any>;
    abortScan(id: string, user: any, reason: string): Promise<any>;
    uploadReport(id: string, user: any, body: any): Promise<any>;
    submitReportForReview(id: string, user: any, body: any): Promise<any>;
    approveReport(id: string, user: any): Promise<any>;
    publishReport(id: string, body: any, user: any): Promise<any>;
    processInsuranceApproval(id: string, user: any, body: {
        approval_code: string;
        copay: number;
    }): Promise<any>;
    rescheduleBooking(id: string, user: any, body: {
        new_date: string;
        reason: string;
    }): Promise<any>;
    getTracking(id: string, user: any): Promise<{
        current_state: any;
        patient_label_ar: string;
        patient_label_en: string;
        scheduled_at: any;
        preparation_confirmed: any;
        steps: any;
    }>;
    private _stateLabel;
    catalogDeltaRequest(user: any, body: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    confirmPreparation(id: string, user: any): Promise<{
        ok: boolean;
    }>;
    list(opts: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    modalities(): Promise<any[]>;
    getById(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    book(user: any, body: any): Promise<any>;
    mineFor(user: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getBooking(id: string, user: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    cancel(id: string, user: any): Promise<any>;
    updateInsuranceStatus(id: string, user: any, status: string, reason?: string): Promise<any>;
    addDocument(id: string, user: any, body: any): Promise<any>;
    listForProvider(user: any, status?: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    assignTechnician(id: string, user: any, body: any): Promise<any>;
    adminListAll(opts: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    myReports(user: any): Promise<any[]>;
    createCatalog(user: any, body: any): Promise<any>;
    updateCatalog(user: any, id: string, body: any): Promise<any>;
    deleteCatalog(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    adminForceState(user: any, id: string, targetState: RadiologyBookingState, note: string): Promise<any>;
}
