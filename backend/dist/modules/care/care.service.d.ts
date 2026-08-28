import { SlotService } from './slot.service';
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { UserRepository } from "./repositories/user.repository";
import { FacilityRepository } from "./repositories/facility.repository";
export declare class CareService {
    private providerModel;
    private userModel;
    private facilityModel;
    private slots;
    constructor(providerModel: ProviderProfileRepository, userModel: UserRepository, facilityModel: FacilityRepository, slots: SlotService);
    specialties(): Promise<{
        slug: string;
        specialty: string;
        name_ar: string;
        name_en: string;
        count: number;
        published_provider_count: number;
    }[]>;
    insuranceCompanies(): {
        slug: string;
    }[];
    academicDegrees(): {
        slug: import("../../common/enums").AcademicDegree;
    }[];
    listDoctors(opts?: {
        specialty?: string;
        service_type?: 'clinic' | 'video' | 'home';
        available_today?: boolean;
        q?: string;
        city?: string;
        facility_id?: string;
        degree?: string;
        insurance?: string;
        accepts_insurance?: boolean;
        lat?: number;
        lng?: number;
        sort?: 'rating' | 'price_asc' | 'price_desc' | 'experience' | 'distance_asc' | 'distance_desc';
        page?: number;
        limit?: number;
    }): Promise<{
        page: number;
        limit: number;
        total: any;
        total_is_exact: boolean;
        has_more: boolean;
        items: any[];
    }>;
    doctorById(id: string): Promise<any>;
    doctorSlots(id: string, date: string, service_type: 'clinic' | 'video' | 'home'): Promise<{
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
    smartSearch(q: string): Promise<any>;
    listFacilities(opts?: {
        city?: string;
        type?: string;
        specialty?: string;
        q?: string;
        limit?: number;
    }): Promise<any>;
    facilityById(id: string): Promise<any>;
    private toPublicDoctor;
    private toPublicFacility;
}
