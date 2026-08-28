import { RedisService } from '../../redis/redis.service';
import { EventBusService } from '../../events/event-bus.service';
import { PharmacyAllocationService } from './pharmacy-allocation.service';
import { PharmacyOrderRepository } from './repositories/pharmacyorder.repository';
export declare class PharmacyOrdersProviderService {
    private redis;
    private bus;
    private orders;
    private allocs;
    constructor(redis: RedisService, bus: EventBusService, orders: PharmacyOrderRepository, allocs: PharmacyAllocationService);
    acceptOrder(user: any, orderId: string): Promise<{
        success: boolean;
        status: any;
        order_id: string;
        allocation_id: any;
    }>;
    submitBasket(user: any, orderId: string, payload: any): Promise<{
        success: boolean;
        status: string;
        order_id: string;
        subtotal: number;
    }>;
    evaluateInsurance(user: any, orderId: string, payload: any): Promise<{
        success: boolean;
        status: string;
        insurance_copay: number;
    }>;
    private selectedAllocationForProvider;
    orderPreparing(user: any, orderId: string): Promise<{
        success: boolean;
        status: any;
        order_id: string;
        allocation_id: any;
    }>;
    orderReady(user: any, orderId: string): Promise<{
        success: boolean;
        status: any;
        order_id: string;
        allocation_id: any;
    }>;
    orderDispatch(user: any, orderId: string, payload: any): Promise<any>;
}
