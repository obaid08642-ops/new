import { Model } from 'mongoose';
import { OrderDocument } from '../../schemas/order.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBooking } from '../../schemas/home-care.schema';
import { UserDocument } from '../../schemas/user.schema';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
export declare class ConsistencyService {
    private orders;
    private labs;
    private rads;
    private home;
    private appts;
    private events;
    private users;
    private engine;
    constructor(orders: Model<OrderDocument>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, home: Model<HomeCareBooking>, appts: Model<any>, events: Model<any>, users: Model<UserDocument>, engine: WorkflowEngineService);
    audit(): Promise<any>;
    reconcile(): Promise<{
        reconciled_birth_events: number;
        total_missing: any;
    }>;
    fixOrphans(dryRun?: boolean): Promise<{
        dry_run: boolean;
        processed: number;
        results: any[];
    }>;
}
export declare class ConsistencyController {
    private svc;
    constructor(svc: ConsistencyService);
    audit(): Promise<any>;
    reconcile(): Promise<{
        reconciled_birth_events: number;
        total_missing: any;
    }>;
    fixOrphans(dry?: string): Promise<{
        dry_run: boolean;
        processed: number;
        results: any[];
    }>;
}
export declare class ConsistencyModule {
}
