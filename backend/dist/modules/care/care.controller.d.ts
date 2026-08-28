import { CareService } from './care.service';
export declare class CareController {
    private svc;
    constructor(svc: CareService);
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
    degrees(): {
        slug: import("../../common/enums").AcademicDegree;
    }[];
    doctors(specialty?: string, service_type?: 'clinic' | 'video' | 'home', available_today?: string, q?: string, city?: string, facility_id?: string, degree?: string, insurance?: string, accepts_insurance?: string, lat?: string, lng?: string, sort?: 'rating' | 'price_asc' | 'price_desc' | 'experience' | 'distance_asc' | 'distance_desc', page?: string, limit?: string): Promise<{
        page: number;
        limit: number;
        total: any;
        total_is_exact: boolean;
        has_more: boolean;
        items: any[];
    }>;
    doctor(id: string): Promise<any>;
    slots(id: string, date: string, service_type: 'clinic' | 'video' | 'home'): Promise<{
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
    search(q: string): Promise<any>;
    facilities(city?: string, type?: string, specialty?: string, q?: string, limit?: string): Promise<any>;
    facility(id: string): Promise<any>;
}
export declare class PublicSpecialtiesController {
    private svc;
    constructor(svc: CareService);
    specialties(): Promise<{
        slug: string;
        specialty: string;
        name_ar: string;
        name_en: string;
        count: number;
        published_provider_count: number;
    }[]>;
}
