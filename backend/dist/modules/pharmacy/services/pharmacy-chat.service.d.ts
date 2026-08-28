import { PharmacyChatThread } from '../schemas/pharmacy.schema';
import { EventBusService } from '../../events/event-bus.service';
import { PharmacyChatThreadRepository } from "./repositories/pharmacychatthread.repository";
import { PharmacyChatMessageRepository } from "./repositories/pharmacychatmessage.repository";
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
export declare class PharmacyChatService {
    private threads;
    private messages;
    private orders;
    private allocs;
    private bus;
    constructor(threads: PharmacyChatThreadRepository, messages: PharmacyChatMessageRepository, orders: PharmacyOrderRepository, allocs: PharmacyAllocationRepository, bus: EventBusService);
    openOrGetThread(order_id: string, order_item_id: string, pharmacy_account_id: string): Promise<PharmacyChatThread>;
    listThreads(user: any, order_id?: string): Promise<any>;
    listMessages(user: any, thread_id: string): Promise<any>;
    postMessage(user: any, thread_id: string, body: {
        text?: string;
        image_uri?: string;
        substitute_offer?: any;
    }): Promise<any>;
    acceptSubstitute(user: any, thread_id: string, message_id: string): Promise<any>;
    rejectOrRemove(user: any, thread_id: string, action: 'rejected' | 'removed'): Promise<any>;
    sweepAutoClose(): Promise<any>;
}
