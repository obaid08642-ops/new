import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderState, DeliveryState } from '../../common/enums';
import { DispatchService } from './dispatch.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { OrderRepository } from "./repositories/order.repository";
import { MedicineRepository } from "./repositories/medicine.repository";
import { DeliveryRepository } from "./repositories/delivery.repository";
import { PharmacyBidRepository } from "./repositories/pharmacybid.repository";
import { CouponService, LoyaltyRedeemService, RefundExecutor, CancellationPolicy } from '../finance-engine/finance-engine.module';
export declare class OrdersService {
    private orderModel;
    private medModel;
    private delModel;
    private bidModel;
    private events;
    private dispatchSvc;
    private engine;
    private readonly conn;
    private readonly coupons;
    private readonly loyaltyRedeem;
    private readonly refundExec;
    private readonly cancelPolicy;
    constructor(orderModel: OrderRepository, medModel: MedicineRepository, delModel: DeliveryRepository, bidModel: PharmacyBidRepository, events: EventEmitter2, dispatchSvc: DispatchService, engine: WorkflowEngineService, conn: Connection, coupons: CouponService, loyaltyRedeem: LoyaltyRedeemService, refundExec: RefundExecutor, cancelPolicy: CancellationPolicy);
    private assertNotCanonicalPharmacyOrder;
    create(patient: any, data: any): Promise<void>;
    transition(orderId: string, to: OrderState, by: any, reason?: string): Promise<any>;
    private assertOrderAccess;
    getById(id: string, user?: any): Promise<any>;
    listMine(patient_id: string, type?: string): Promise<any>;
    listForPharmacy(pharmacy_id: string, state?: OrderState): Promise<any>;
    listAll(state?: OrderState, search?: string): Promise<any>;
    listEscalated(): Promise<any>;
    accept(orderId: string, by: any): Promise<any>;
    reject(orderId: string, by: any, reason: string): Promise<any>;
    markPreparing(orderId: string, by: any): Promise<any>;
    markReady(orderId: string, by: any): Promise<any>;
    markPartial(orderId: string, by: any, unavailableMedicineIds: string[]): Promise<any>;
    cancel(orderId: string, by: any, reason: string): Promise<any>;
    generatePdf(orderId: string, user?: any): Promise<Buffer>;
    assignDelivery(orderId: string, driver_id: string, by: any): Promise<any>;
    updateDelivery(orderId: string, state: DeliveryState, location?: any): Promise<any>;
    reorder(orderId: string, patient: any): Promise<void>;
    reorderPartial(orderId: string, patient: any, body: {
        items: any[];
        delivery_address?: any;
        notes?: string;
    }): Promise<void>;
    patientApproveBasket(patient: any, id: string): Promise<any>;
    patientRejectBasket(patient: any, id: string, reason?: string): Promise<any>;
    placeBid(_user: any, _body: {
        prescription_request_id: string;
        items: any[];
        total_price: number;
        expires_in_mins?: number;
    }): Promise<never>;
    acceptBid(_user: any, _bidId: string): Promise<never>;
    listBids(_user: any, _prescriptionRequestId: string): Promise<never>;
    listPharmacyBids(_user: any): Promise<never>;
    getTracking(id: string, user: any): Promise<{
        order_id: any;
        state: any;
        updated_at: any;
        delivery_mode: any;
        total: any;
        pharmacy_name: any;
        delivery: any;
    }>;
    updateInsuranceApproval(id: string, payload: {
        status?: string;
        totalCopay?: number;
        items?: any[];
    }, user: any): Promise<any>;
    optInCash(id: string, itemId: string, payload: {
        optInCash?: boolean;
    }, user: any): Promise<any>;
}
