import { ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { AppointmentRepository } from "./repositories/appointment.repository";
export declare class SlotService {
    private apptModel;
    constructor(apptModel: AppointmentRepository);
    private readonly DAY_KEYS;
    slotsForDate(doctor: ProviderProfileDocument, dateStr: string, service_type: 'clinic' | 'video' | 'home', duration_minutes?: number): Promise<{
        date: string;
        service_type: "clinic" | "video" | "home";
        slots: any[];
        reason: string;
    } | {
        date: string;
        service_type: "clinic" | "video" | "home";
        slots: {
            id: string;
            start: string;
            end: string;
            label: string;
            available: boolean;
        }[];
        reason?: undefined;
    }>;
    hasSlotsToday(doctor: ProviderProfileDocument): Promise<boolean>;
    nextAvailable(doctor: ProviderProfileDocument): Promise<string | null>;
}
