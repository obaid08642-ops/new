export declare const SEED_FACILITIES: ({
    slug: string;
    name_ar: string;
    name_en: string;
    type: string;
    description_ar: string;
    city: string;
    district: string;
    address: string;
    location: {
        lat: number;
        lng: number;
    };
    logo_url: string;
    images: string[];
    phone: string;
    website: string;
    departments: string[];
    accepts_insurance: boolean;
    accepted_insurance: string[];
    working_hours: {
        day: string;
        open: string;
        close: string;
    }[];
    rating: number;
    reviews_count: number;
} | {
    slug: string;
    name_ar: string;
    name_en: string;
    type: string;
    description_ar: string;
    city: string;
    district: string;
    address: string;
    location: {
        lat: number;
        lng: number;
    };
    logo_url: string;
    images: string[];
    phone: string;
    departments: string[];
    accepts_insurance: boolean;
    accepted_insurance: string[];
    working_hours: ({
        day: string;
        open: string;
        close: string;
        closed?: undefined;
    } | {
        day: string;
        open: string;
        close: string;
        closed: boolean;
    })[];
    rating: number;
    reviews_count: number;
    website?: undefined;
})[];
