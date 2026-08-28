import { PharmacyOpsService } from './pharmacy_ops.service';
import { OrdersService } from '../orders/orders.service';
export declare class PharmacyOpsController {
    private svc;
    private ordersSvc;
    constructor(svc: PharmacyOpsService, ordersSvc: OrdersService);
    byRxNumber(): never;
    eod(): never;
    incoming(): never;
    preparing(): never;
    ready(): never;
    completed(): never;
    basketReview(): never;
    awaitingApproval(): never;
    refills(): never;
    accept(): never;
    reject(): never;
    preparingAction(): never;
    readyAction(): never;
    partial(): never;
    inventory(): never;
    stock(): never;
    addMed(): never;
    orderDetail(): never;
    itemUnavailable(): never;
    itemRestore(): never;
    itemQty(): never;
    itemSub(): never;
    submitBasket(): never;
    setInsurance(u: any, id: string, b: {
        status: 'approved' | 'rejected' | 'pending';
        reason?: string;
    }): never;
}
export declare class ProviderPharmacyAliasController {
    private svc;
    private ordersSvc;
    constructor(svc: PharmacyOpsService, ordersSvc: OrdersService);
    accept(): never;
    submitBasket(): never;
    insurance(u: any, id: string, b: any): never;
    dispatch(): never;
}
