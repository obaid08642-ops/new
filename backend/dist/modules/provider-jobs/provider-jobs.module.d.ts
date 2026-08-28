import { Model } from 'mongoose';
import { OrderDocument } from '../../schemas/order.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBooking } from '../../schemas/home-care.schema';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
type JobStatus = 'incoming' | 'active' | 'completed';
export declare class ProviderJobsService {
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private providers;
    private users;
    private attachments;
    private engine;
    constructor(orders: Model<OrderDocument>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, home: Model<HomeCareBooking>, appts: Model<any>, providers: Model<any>, users: Model<any>, attachments: Model<any>, engine: WorkflowEngineService);
    private kindAliases;
    private bucket;
    private allowedKindsFor;
    queue(user: any, status?: JobStatus, kindFilter?: string): Promise<any[]>;
    private findEntity;
    private act;
    accept(user: any, type: string, id: string, reason?: string): Promise<any>;
    reject(user: any, type: string, id: string, reason?: string): Promise<any>;
    start(user: any, type: string, id: string, reason?: string): Promise<any>;
    complete(user: any, type: string, id: string, reason?: string): Promise<any>;
    updateInsurance(user: any, type: string, id: string, insuranceDetails: any): Promise<any>;
}
export declare class ProviderJobsController {
    private svc;
    constructor(svc: ProviderJobsService);
    queue(u: any, q: any): Promise<any[]>;
    myCaps(u: any): Promise<{
        role: any;
        capabilities: unknown[];
    }>;
    accept(u: any, t: string, id: string, b: any): Promise<any>;
    reject(u: any, t: string, id: string, b: any): Promise<any>;
    start(u: any, t: string, id: string, b: any): Promise<any>;
    complete(u: any, t: string, id: string, b: any): Promise<any>;
    insurance(u: any, t: string, id: string, b: any): Promise<any>;
}
export declare class ProviderJobsModule {
}
export {};
