import { DriversService } from './drivers.service';
export declare class DriversController {
    private svc;
    constructor(svc: DriversService);
    online(driver: any, body: {
        location?: {
            lat: number;
            lng: number;
        };
    }): Promise<any>;
    offline(driver: any): Promise<any>;
    shift(id: string): Promise<any>;
    location(driver: any, body: {
        lat: number;
        lng: number;
        heading?: number;
        speed?: number;
    }): Promise<{
        ok: boolean;
    }>;
    getDriverLocation(driverId: string): Promise<any>;
    available(driver: any): Promise<any>;
    active(driver: any): Promise<any>;
    history(driver: any): Promise<any>;
    accept(driver: any, id: string): Promise<any>;
    pickup(driver: any, id: string): Promise<any>;
    deliver(driver: any, id: string, body: {
        signature?: string;
        photo?: string;
    }): Promise<any>;
    allOnline(): Promise<any>;
    listAvailable(): Promise<any>;
}
