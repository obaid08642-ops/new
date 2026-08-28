import { AllocationItemAction } from '../schemas/pharmacy.schema';
import { SmartSplitService } from './smart-split.service';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { EventBusService } from '../../events/event-bus.service';
import { WorkflowEngineService } from '../../workflow-engine/workflow-engine.module';
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
export declare class PharmacyAllocationService {
    private allocs;
    private orders;
    private inv;
    private split;
    private notif;
    private bus;
    private engine;
    constructor(allocs: PharmacyAllocationRepository, orders: PharmacyOrderRepository, inv: PharmacyInventoryItemRepository, split: SmartSplitService, notif: PharmacyNotificationService, bus: EventBusService, engine: WorkflowEngineService);
    listForProvider(user: any, status?: string): Promise<any>;
    findByOrderForProvider(user: any, orderId: string): Promise<any>;
    detail(user: any, id: string): Promise<any>;
    itemAction(user: any, allocId: string, allocItemId: string, body: {
        action: AllocationItemAction;
        substitute_sku?: string;
        substitute_reason?: string;
        qty_offered?: number;
        notes?: string;
    }): Promise<any>;
    private transition;
    private assertFulfillmentAuthorized;
    confirm(user: any, id: string): Promise<any>;
    preparing(user: any, id: string): Promise<any>;
    ready(user: any, id: string): Promise<any>;
    outForDelivery(user: any, id: string, body?: {
        courier_name?: string;
        courier_phone?: string;
        eta?: Date;
    }): Promise<any>;
    delivered(user: any, id: string, body?: {
        collection?: {
            method: 'cash' | 'card_terminal';
            amount_collected: number;
        };
    }): Promise<any>;
    private settleDeliveredAllocation;
    private advance;
    cancel(user: any, id: string, reason: string): Promise<any>;
    private refreshOrderAfterAllocationChange;
    expireStale(): Promise<{
        expired: number;
        scanned: any;
    }>;
    updateInsurance(): void;
}
