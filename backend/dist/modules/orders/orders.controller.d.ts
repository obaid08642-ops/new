import { OrdersService } from './orders.service';
import { OrderState, DeliveryState } from '../../common/enums';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersController {
    private svc;
    constructor(svc: OrdersService);
    create(body: CreateOrderDto, user: any): Promise<void>;
    mine(id: string, type?: string): Promise<any>;
    reorder(id: string, user: any): Promise<void>;
    reorderPartial(id: string, user: any, body: any): Promise<void>;
    cancel(id: string, user: any, body: any): Promise<any>;
    approveBasket(id: string, user: any): Promise<any>;
    rejectBasket(id: string, user: any, body: any): Promise<any>;
    pharmacyQueue(id: string, state: OrderState): Promise<any>;
    one(id: string, user: any): Promise<any>;
    getReportPdf(id: string, user: any, res: any): Promise<void>;
    getTracking(id: string, user: any): Promise<{
        order_id: any;
        state: any;
        updated_at: any;
        delivery_mode: any;
        total: any;
        pharmacy_name: any;
        delivery: any;
    }>;
    optInCash(id: string, itemId: string, body: any, user: any): Promise<any>;
    updateInsuranceApproval(id: string, body: any, user: any): Promise<any>;
    accept(id: string, user: any): Promise<any>;
    reject(id: string, user: any, body: any): Promise<any>;
    preparing(id: string, user: any): Promise<any>;
    ready(id: string, user: any): Promise<any>;
    partial(id: string, user: any, body: any): Promise<any>;
    assign(id: string, user: any, body: {
        driver_id: string;
    }): Promise<any>;
    deliveryUpdate(id: string, body: {
        state: DeliveryState;
        location?: any;
    }): Promise<any>;
    dispatch(id: string, user: any): Promise<any>;
    delivered(id: string, user: any): Promise<any>;
    list(state: OrderState, search: string): Promise<any>;
    escalated(): Promise<any>;
    adminTransition(id: string, user: any, body: {
        to: OrderState;
        reason?: string;
    }): Promise<any>;
    placeBid(user: any, b: any): Promise<never>;
    acceptBid(id: string, user: any): Promise<never>;
    listBids(id: string, user: any): Promise<never>;
    listPharmacyBids(user: any): Promise<never>;
}
