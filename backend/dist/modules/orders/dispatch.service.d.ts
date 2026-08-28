import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { PharmacyInventoryRepository } from "./repositories/pharmacyinventory.repository";
export declare class DispatchService {
    private providerModel;
    private invModel;
    private events;
    private logger;
    readonly RADIUS_LADDER: number[];
    constructor(providerModel: ProviderProfileRepository, invModel: PharmacyInventoryRepository, events: EventEmitter2);
    private haversine;
    findNearbyPharmacies(origin: {
        lat: number;
        lng: number;
    }, radius_km: number): Promise<any>;
    getInventoryFor(pharmacy_user_id: string, medicine_ids: string[]): Promise<Record<string, number>>;
    dispatch(origin: {
        lat: number;
        lng: number;
    }, items: {
        medicine_id: string;
        qty: number;
    }[]): Promise<{
        ok: boolean;
        selected_pharmacy_id: any;
        radius_used: number;
        fulfilled_items: any[];
        missing_items: any[];
        candidates: any[];
        attempts: any[];
        best_candidate: {
            pharmacy_id: string;
            distance_km: number;
            available_count: number;
            total_requested: number;
            score: number;
            status: string;
        };
    }>;
    dispatchSplit(origin: {
        lat: number;
        lng: number;
    }, items: {
        medicine_id: string;
        qty: number;
    }[], excludePharmacyIds: string[]): Promise<{
        ok: boolean;
        selected_pharmacy_id: any;
        radius_used: number;
        fulfilled_items: any[];
        missing_items: any[];
    }>;
    deductStock(pharmacy_user_id: string, items: {
        medicine_id: string;
        qty: number;
    }[]): Promise<void>;
    restoreStock(pharmacy_user_id: string, items: {
        medicine_id: string;
        qty: number;
    }[]): Promise<void>;
}
