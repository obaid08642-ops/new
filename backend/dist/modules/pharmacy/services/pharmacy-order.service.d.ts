import { SmartSplitService } from './smart-split.service';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { PharmacyBroadcastService } from './pharmacy-broadcast.service';
import { EventBusService } from '../../events/event-bus.service';
import { WorkflowEngineService } from '../../workflow-engine/workflow-engine.module';
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
export declare class PharmacyOrderService {
    private orders;
    private allocs;
    private split;
    private notif;
    private broadcast;
    private bus;
    private engine;
    constructor(orders: PharmacyOrderRepository, allocs: PharmacyAllocationRepository, split: SmartSplitService, notif: PharmacyNotificationService, broadcast: PharmacyBroadcastService, bus: EventBusService, engine: WorkflowEngineService);
    create(user: any, body: any): Promise<any>;
    list(user: any, status?: string): Promise<any>;
    detail(user: any, id: string): Promise<any>;
    update(user: any, id: string, body: any): Promise<any>;
    submit(user: any, id: string): Promise<any>;
    cancel(user: any, id: string, reason: string): Promise<{
        ok: boolean;
    }>;
}
