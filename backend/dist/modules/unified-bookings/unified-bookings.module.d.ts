import { Model } from 'mongoose';
import { OrderDocument } from '../../schemas/order.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { HomeCareBooking } from '../../schemas/home-care.schema';
import { ServiceState, ServiceDomain } from '../../common/enums';
import { EventBusService } from '../events/event-bus.service';
import { LabsService } from '../labs/labs.service';
import { RadiologyOpsService } from '../radiology/radiology.service';
import { HomeCareSvc } from '../home-care/home-care.service';
import { AppointmentsService } from '../care/appointments.service';
import { SlotService } from '../care/slot.service';
import { OrdersService } from '../orders/orders.service';
import { CartService } from '../cart/cart.module';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { LiveKitService } from '../livekit/livekit.service';
export declare class UnifiedBookingsService {
    private orders;
    private pharmacyOrders;
    private labs;
    private rads;
    private home;
    private appts;
    private providers;
    private bus;
    private labsSvc;
    private radSvc;
    private homeSvc;
    private apptSvc;
    private slots;
    private ordersSvc;
    private cart;
    private engine;
    private livekit;
    constructor(orders: Model<OrderDocument>, pharmacyOrders: Model<any>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, home: Model<HomeCareBooking>, appts: Model<any>, providers: Model<any>, bus: EventBusService, labsSvc: LabsService, radSvc: RadiologyOpsService, homeSvc: HomeCareSvc, apptSvc: AppointmentsService, slots: SlotService, ordersSvc: OrdersService, cart: CartService, engine: WorkflowEngineService, livekit: LiveKitService);
    private kindMap;
    myTimeline(user: any, filter?: {
        state?: string;
        kind?: string;
    }): Promise<{
        kind: ServiceDomain;
        id: any;
        tracking_id: any;
        domain_state: string;
        universal_state: ServiceState;
        total: any;
        title_ar: any;
        payment_method: any;
        insurance_status: any;
        scheduled_at: any;
        location_type: any;
        account_id: any;
        createdAt: any;
        updatedAt: any;
        can_cancel: boolean;
        can_reschedule: boolean;
    }[]>;
    getOne(user: any, kind: string, id: string): Promise<any>;
    cancelBooking(user: any, kind: string, id: string, reason: string): Promise<any>;
    rescheduleBooking(user: any, kind: string, id: string, new_scheduled_at: string, reason?: string): Promise<any>;
    private resolveConsultationSlot;
    createConsultationContract(user: any, body: {
        doctor_id?: string;
        slot_id?: string;
        type?: 'clinic' | 'video' | 'home';
        notes?: string;
        payment_method_id?: string;
    }): Promise<{
        booking_id: any;
        status: string;
    }>;
    cancelConsultationContract(user: any, id: string, reason?: string): Promise<{
        booking_id: any;
        status: string;
    }>;
    rescheduleConsultationContract(user: any, id: string, newSlotId?: string): Promise<{
        booking_id: any;
        status: string;
    }>;
    consultationCallToken(user: any, id: string): Promise<{
        provider: string;
        token: string;
        room: string;
    }>;
    smartMatch(user: any, body: {
        kind: 'lab' | 'radiology' | 'nursing' | 'consultation' | 'pharmacy';
        service_ids?: string[];
        service_keys?: string[];
        specialty?: string;
        insurance?: string;
        home_visit?: boolean;
        city?: string;
        location?: {
            lat: number;
            lng: number;
        };
        max_results?: number;
    }): Promise<any[]>;
    nursingRadiusBroadcast(user: any, body: {
        service_keys: string[];
        service_id?: string;
        scheduled_at?: string;
        address?: any;
        city?: string;
        insurance?: string;
        location?: {
            lat: number;
            lng: number;
        };
        auto_book?: boolean;
    }): Promise<{
        radius_used: number;
        providers: any;
        booking: any;
    }>;
    checkoutFromCart(user: any, body: {
        provider_account_id?: string;
        address?: any;
        scheduled_at?: string;
        insurance?: any;
        location_type?: 'home' | 'facility';
        delivery_address?: any;
    }): Promise<{
        results: any[];
        remaining_cart: any;
        rolled_back: boolean;
    }>;
}
export declare class UnifiedBookingsController {
    private svc;
    constructor(svc: UnifiedBookingsService);
    mine(u: any, q: any): Promise<{
        kind: ServiceDomain;
        id: any;
        tracking_id: any;
        domain_state: string;
        universal_state: ServiceState;
        total: any;
        title_ar: any;
        payment_method: any;
        insurance_status: any;
        scheduled_at: any;
        location_type: any;
        account_id: any;
        createdAt: any;
        updatedAt: any;
        can_cancel: boolean;
        can_reschedule: boolean;
    }[]>;
    create(u: any, b: any): Promise<{
        booking_id: any;
        status: string;
    }>;
    cancelRoot(u: any, id: string, b: any): Promise<{
        booking_id: any;
        status: string;
    }>;
    rescheduleRoot(u: any, id: string, b: any): Promise<{
        booking_id: any;
        status: string;
    }>;
    callToken(u: any, id: string): Promise<{
        provider: string;
        token: string;
        room: string;
    }>;
    one(u: any, k: string, id: string): Promise<any>;
    cancel(u: any, k: string, id: string, b: any): Promise<any>;
    resched(u: any, k: string, id: string, b: any): Promise<any>;
    match(u: any, b: any): Promise<any[]>;
    nursing(u: any, b: any): Promise<{
        radius_used: number;
        providers: any;
        booking: any;
    }>;
    checkout(u: any, b: any): Promise<{
        results: any[];
        remaining_cart: any;
        rolled_back: boolean;
    }>;
}
export declare class UnifiedBookingsModule {
}
