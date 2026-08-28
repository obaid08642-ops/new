import { ProviderRequestEngineService } from './provider-request-engine.service';
import { ProviderScoringService } from './provider-scoring.service';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderNotificationRepository } from "./repositories/providernotification.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { LabTestCatalogItemRepository } from "./repositories/labtestcatalogitem.repository";
import { RadiologyServiceCatalogItemRepository } from "./repositories/radiologyservicecatalogitem.repository";
import { DoctorSessionTypeRepository } from "./repositories/doctorsessiontype.repository";
import { HomeCareServiceCatalogItemRepository } from "./repositories/homecareservicecatalogitem.repository";
import { ProviderDeliveryZoneRepository } from "./repositories/providerdeliveryzone.repository";
import { ProviderScheduleSlotRepository } from "./repositories/providerscheduleslot.repository";
export declare class ProviderSeedService {
    private readonly engine;
    private readonly scoring;
    private requests;
    private notifs;
    private profiles;
    private avails;
    private pharma;
    private lab;
    private rad;
    private doc;
    private hc;
    private zones;
    private slots;
    constructor(engine: ProviderRequestEngineService, scoring: ProviderScoringService, requests: ProviderRequestRepository, notifs: ProviderNotificationRepository, profiles: ProviderAccountProfileRepository, avails: ProviderAvailabilityRepository, pharma: PharmacyInventoryItemRepository, lab: LabTestCatalogItemRepository, rad: RadiologyServiceCatalogItemRepository, doc: DoctorSessionTypeRepository, hc: HomeCareServiceCatalogItemRepository, zones: ProviderDeliveryZoneRepository, slots: ProviderScheduleSlotRepository);
    seed(user: any): Promise<{
        seeded: boolean;
        provider_account_id: any;
        capabilities: {
            pharmacy: number;
            lab: number;
            radiology: number;
            doctor_sessions: number;
            home_care: number;
        };
        zones: number;
        schedule_slots: number;
        requests: number;
        message: string;
    }>;
    resetSeed(user: any): Promise<{
        ok: boolean;
        removed: any;
    }>;
}
