import { Connection } from 'mongoose';
import { MedicineRepository } from "./repositories/medicine.repository";
import { LabServiceRepository } from "./repositories/labservice.repository";
import { HomeCareServiceRepository } from "./repositories/homecareservice.repository";
import { FacilityRepository } from "./repositories/facility.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
export type EntityType = 'medicine' | 'doctor' | 'lab-service' | 'home-care-service' | 'facility' | 'article';
export declare class SeoService {
    private medM;
    private labSvcM;
    private hcSvcM;
    private facilityM;
    private providerM;
    private articleM;
    private readonly conn;
    constructor(medM: MedicineRepository, labSvcM: LabServiceRepository, hcSvcM: HomeCareServiceRepository, facilityM: FacilityRepository, providerM: ProviderProfileRepository, articleM: any, conn: Connection);
    private controlsCache;
    private loadControls;
    invalidateControlsCache(): void;
    private modelFor;
    private publicQuery;
    resolve(type: string, slug: string): Promise<any>;
    meta(type: string, slug: string): Promise<{
        found: boolean;
        title: string;
        description: string;
        type?: undefined;
        id?: undefined;
        slug?: undefined;
        image?: undefined;
        canonical?: undefined;
        og?: undefined;
        twitter?: undefined;
        structured?: undefined;
        entity?: undefined;
    } | {
        found: boolean;
        type: string;
        id: any;
        slug: string;
        title: string;
        description: string;
        image: any;
        canonical: string;
        og: {
            type: string;
            title: any;
            description: string;
            url: string;
            image: any;
            locale: string;
            site_name: string;
        };
        twitter: {
            card: string;
            title: any;
            description: string;
            image: any;
        };
        structured: any;
        entity: any;
    }>;
    buildShareLink(type: string, id: string): Promise<{
        ok: boolean;
        reason: string;
        url?: undefined;
        slug?: undefined;
        deep_link?: undefined;
    } | {
        ok: boolean;
        url: string;
        slug: string;
        deep_link: string;
        reason?: undefined;
    }>;
    private buildShareUrl;
    private composeDescription;
    private structuredData;
    sitemap(): Promise<string>;
    robots(): Promise<string>;
    llmsTxt(): Promise<string>;
    pingIndexNow(type: string, id: string): Promise<{
        ok: boolean;
    }>;
}
