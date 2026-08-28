import { Connection, Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AmbulanceVehicleDocument } from '../../schemas/ambulance-vehicle.schema';
import { EmergencyState } from '../../common/enums';
import { EmergencyRequestRepository } from "./repositories/emergencyrequest.repository";
export declare class EmergencyService {
    private model;
    private vehicles;
    private readonly conn;
    private events;
    constructor(model: EmergencyRequestRepository, vehicles: Model<AmbulanceVehicleDocument>, conn: Connection, events: EventEmitter2);
    private patientView;
    autoDispatch(id: string, by?: any): Promise<{
        ok: boolean;
        reason: string;
        id?: undefined;
        vehicle_id?: undefined;
        score?: undefined;
    } | {
        ok: boolean;
        id: string;
        vehicle_id: any;
        score: number;
        reason?: undefined;
    }>;
    trigger(patient: any, data: {
        location?: any;
        symptoms?: string;
        severity?: string;
    }): Promise<{
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
    transition(id: string, to: EmergencyState, by: any): Promise<any>;
    assign(id: string, hospital_id: string, by: any): Promise<any>;
    resolve(id: string, by: any, notes?: string): Promise<any>;
    active(): Promise<any>;
    cancelOwn(id: string, patientId: string): Promise<any>;
    myActive(patientId: string): Promise<{
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
    driverMissions(providerId: string): Promise<any>;
    claim(id: string, providerId: string, vehicleId?: string): Promise<{
        ok: boolean;
        id: string;
        vehicle_id: any;
        state: EmergencyState;
    }>;
    getById(id: string): Promise<any>;
    private haversineKm;
    tracking(patientId: string): Promise<{
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
    updateUnitLocation(id: string, providerId: string, body: {
        lat?: number;
        lng?: number;
        vehicle_id?: string;
    }): Promise<{
        ok: boolean;
    }>;
}
