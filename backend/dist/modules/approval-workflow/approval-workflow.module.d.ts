import { Model } from 'mongoose';
import { CatalogPublicationService } from '../events/catalog-publication.service';
export declare class ApprovalWorkflowService {
    private reqModel;
    private medicineModel;
    private providerModel;
    private facilityModel;
    private labModel;
    private radiologyModel;
    private homeCareModel;
    private readonly publication;
    constructor(reqModel: Model<any>, medicineModel: Model<any>, providerModel: Model<any>, facilityModel: Model<any>, labModel: Model<any>, radiologyModel: Model<any>, homeCareModel: Model<any>, publication: CatalogPublicationService);
    createRequest(userId: string, dto: {
        entity_type: 'medicine' | 'provider' | 'facility' | 'service';
        entity_id?: string;
        change_data: Record<string, any>;
    }): Promise<any>;
    listPending(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    listMyRequests(userId: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getRequestDetails(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    decide(adminUserId: string, requestId: string, dto: {
        decision: 'approved' | 'rejected';
        notes?: string;
        edit_data?: any;
    }): Promise<any>;
}
export declare class ApprovalWorkflowController {
    private svc;
    constructor(svc: ApprovalWorkflowService);
    create(u: any, b: any): Promise<any>;
    myRequests(u: any): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    pending(): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    details(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[] | (import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })>;
    decide(u: any, id: string, b: any): Promise<any>;
}
export declare class ApprovalWorkflowModule {
}
