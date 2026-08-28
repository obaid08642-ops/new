import { EventEmitter2 } from '@nestjs/event-emitter';
import { RealtimeService } from '../realtime/realtime.service';
import { UserRepository } from "./repositories/user.repository";
import { DriverShiftRepository } from "./repositories/drivershift.repository";
import { OrderRepository } from "./repositories/order.repository";
import { DeliveryRepository } from "./repositories/delivery.repository";
export declare class DriversService {
    private userModel;
    private shiftModel;
    private orderModel;
    private delModel;
    private events;
    private realtime;
    constructor(userModel: UserRepository, shiftModel: DriverShiftRepository, orderModel: OrderRepository, delModel: DeliveryRepository, events: EventEmitter2, realtime: RealtimeService);
    goOnline(driver: any, location?: {
        lat: number;
        lng: number;
    }): Promise<any>;
    goOffline(driver: any): Promise<any>;
    getCurrentShift(driver_id: string): Promise<any>;
    getDriverLocation(driverId: string): Promise<any>;
    updateLocation(driver: any, loc: {
        lat: number;
        lng: number;
        heading?: number;
        speed?: number;
    }): Promise<{
        ok: boolean;
    }>;
    availableOrders(driver: any): Promise<any>;
    myActive(driver: any): Promise<any>;
    myHistory(driver: any, limit?: number): Promise<any>;
    acceptOrder(driver: any, order_id: string): Promise<any>;
    pickupOrder(driver: any, order_id: string): Promise<any>;
    deliverOrder(driver: any, order_id: string, proof?: {
        signature?: string;
        photo?: string;
    }): Promise<any>;
    allOnline(): Promise<any>;
}
