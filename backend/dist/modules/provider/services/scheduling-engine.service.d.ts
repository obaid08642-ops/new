import { ProviderScheduleSlotRepository } from "./repositories/providerscheduleslot.repository";
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
export declare class SchedulingEngineService {
    private slots;
    private requests;
    constructor(slots: ProviderScheduleSlotRepository, requests: ProviderRequestRepository);
    listSlots(user: any): Promise<any>;
    upsertSlot(user: any, body: any): Promise<any>;
    deleteSlot(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    checkAvailability(provider_account_id: string, desiredAt: Date, duration_minutes?: number): Promise<{
        available: boolean;
        reason: string;
        day_of_week: number;
        slot?: undefined;
        current_load?: undefined;
        capacity?: undefined;
    } | {
        available: boolean;
        reason: string;
        slot: any;
        day_of_week?: undefined;
        current_load?: undefined;
        capacity?: undefined;
    } | {
        available: boolean;
        reason: string;
        current_load: any;
        capacity: any;
        day_of_week?: undefined;
        slot?: undefined;
    } | {
        available: boolean;
        slot: any;
        current_load: any;
        capacity: any;
        reason?: undefined;
        day_of_week?: undefined;
    }>;
    getWorkload(provider_account_id: string): Promise<number>;
    isOnDuty(provider_account_id: string, at?: Date): Promise<boolean>;
}
