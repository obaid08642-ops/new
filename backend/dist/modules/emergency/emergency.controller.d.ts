import { EmergencyService } from './emergency.service';
export declare class EmergencyController {
    private svc;
    constructor(svc: EmergencyService);
    trigger(body: any, user: any): Promise<{
        id: any;
        state: any;
        symptoms: any;
        severity: any;
        location: {
            lat: any;
            lng: any;
            address: any;
        };
        assigned: boolean;
        unit_label: any;
        paramedic_name: any;
        createdAt: any;
    }>;
    myActive(user: any): Promise<{
        id: any;
        state: any;
        symptoms: any;
        severity: any;
        location: {
            lat: any;
            lng: any;
            address: any;
        };
        assigned: boolean;
        unit_label: any;
        paramedic_name: any;
        createdAt: any;
    }>;
    cancel(id: string, user: any): Promise<any>;
    driverMissions(user: any): Promise<any>;
    claim(id: string, body: {
        vehicle_id?: string;
    }, user: any): Promise<{
        ok: boolean;
        id: string;
        vehicle_id: any;
        state: import("../../common/enums").EmergencyState;
    }>;
    tracking(user: any): Promise<{
        active: boolean;
        id?: undefined;
        state?: undefined;
        unit_label?: undefined;
        paramedic_name?: undefined;
        claimed_at?: undefined;
        unit_location?: undefined;
        eta_minutes?: undefined;
        distance_km?: undefined;
        steps?: undefined;
    } | {
        active: boolean;
        id: any;
        state: any;
        unit_label: any;
        paramedic_name: any;
        claimed_at: any;
        unit_location: {
            lat: any;
            lng: any;
            updated_at: any;
        };
        eta_minutes: number;
        distance_km: number;
        steps: ({
            key: string;
            title_ar: string;
            done: boolean;
            current?: undefined;
        } | {
            key: string;
            title_ar: string;
            done: boolean;
            current: boolean;
        })[];
    }>;
    track(id: string, body: any, user: any): Promise<{
        ok: boolean;
    }>;
    active(): void;
    one(id: string): void;
    assign(id: string, body: {
        hospital_id: string;
    }, user: any): void;
    autoDispatch(id: string, user: any): void;
    resolve(id: string, user: any, body: any): void;
}
