export declare const SEED_USERS: {
    kind: string;
    full_name: string;
    phone: string;
    password: string;
    city: string;
    district: string;
}[];
export declare const SEED_PHARMACIES: {
    full_name: string;
    phone: string;
    password: string;
    name_ar: string;
    name_en: string;
    pharmacy_chain: string;
    city: string;
    district: string;
    location: {
        lat: number;
        lng: number;
    };
    has_own_drivers: boolean;
    delivery_radius_km: number;
    rating: number;
    working_hours: {
        day: string;
        open: string;
        close: string;
    }[];
}[];
export declare const SEED_DOCTORS: ({
    full_name: string;
    phone: string;
    password: string;
    name_ar: string;
    name_en: string;
    specialty: string;
    title: string;
    license_number: string;
    years_experience: number;
    academic_degree: string;
    facility_slug: string;
    city: string;
    district: string;
    hospital: string;
    location: {
        lat: number;
        lng: number;
    };
    consultation_modes: string[];
    price_clinic: number;
    price_online: number;
    price_home: number;
    rating: number;
    working_hours: {
        day: string;
        open: string;
        close: string;
    }[];
    bio: string;
    languages: string[];
    accepts_insurance: boolean;
    accepted_insurance: string[];
} | {
    full_name: string;
    phone: string;
    password: string;
    name_ar: string;
    name_en: string;
    specialty: string;
    title: string;
    license_number: string;
    years_experience: number;
    academic_degree: string;
    facility_slug: string;
    city: string;
    district: string;
    hospital: string;
    location: {
        lat: number;
        lng: number;
    };
    consultation_modes: string[];
    price_clinic: number;
    price_online: number;
    rating: number;
    working_hours: {
        day: string;
        open: string;
        close: string;
    }[];
    bio: string;
    languages: string[];
    accepts_insurance: boolean;
    accepted_insurance: string[];
    price_home?: undefined;
} | {
    full_name: string;
    phone: string;
    password: string;
    name_ar: string;
    name_en: string;
    specialty: string;
    title: string;
    license_number: string;
    years_experience: number;
    academic_degree: string;
    facility_slug: string;
    city: string;
    district: string;
    hospital: string;
    location: {
        lat: number;
        lng: number;
    };
    consultation_modes: string[];
    price_clinic: number;
    price_home: number;
    rating: number;
    working_hours: {
        day: string;
        open: string;
        close: string;
    }[];
    bio: string;
    languages: string[];
    accepts_insurance: boolean;
    accepted_insurance: string[];
    price_online?: undefined;
} | {
    full_name: string;
    phone: string;
    password: string;
    name_ar: string;
    name_en: string;
    specialty: string;
    title: string;
    license_number: string;
    years_experience: number;
    academic_degree: string;
    facility_slug: string;
    city: string;
    district: string;
    hospital: string;
    location: {
        lat: number;
        lng: number;
    };
    consultation_modes: string[];
    price_clinic: number;
    rating: number;
    working_hours: {
        day: string;
        open: string;
        close: string;
    }[];
    bio: string;
    languages: string[];
    accepts_insurance: boolean;
    accepted_insurance: string[];
    price_online?: undefined;
    price_home?: undefined;
} | {
    full_name: string;
    phone: string;
    password: string;
    name_ar: string;
    name_en: string;
    specialty: string;
    title: string;
    license_number: string;
    years_experience: number;
    academic_degree: string;
    facility_slug: string;
    city: string;
    district: string;
    hospital: string;
    location: {
        lat: number;
        lng: number;
    };
    consultation_modes: string[];
    price_online: number;
    price_home: number;
    rating: number;
    working_hours: {
        day: string;
        open: string;
        close: string;
    }[];
    bio: string;
    languages: string[];
    accepts_insurance: boolean;
    accepted_insurance: any[];
    price_clinic?: undefined;
})[];
export declare const SEED_DELIVERY: {
    full_name: string;
    phone: string;
    password: string;
    city: string;
}[];
export declare const SEED_MEDICINES: any[];
