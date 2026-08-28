import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { LabTestCatalogItemRepository } from "./repositories/labtestcatalogitem.repository";
import { RadiologyServiceCatalogItemRepository } from "./repositories/radiologyservicecatalogitem.repository";
import { DoctorSessionTypeRepository } from "./repositories/doctorsessiontype.repository";
import { HomeCareServiceCatalogItemRepository } from "./repositories/homecareservicecatalogitem.repository";
import { ProviderDeliveryZoneRepository } from "./repositories/providerdeliveryzone.repository";
export declare class ServiceCapabilityService {
    private pharma;
    private lab;
    private rad;
    private doc;
    private hc;
    private zones;
    constructor(pharma: PharmacyInventoryItemRepository, lab: LabTestCatalogItemRepository, rad: RadiologyServiceCatalogItemRepository, doc: DoctorSessionTypeRepository, hc: HomeCareServiceCatalogItemRepository, zones: ProviderDeliveryZoneRepository);
    listPharmacy(user: any): Promise<any>;
    upsertPharmacy(user: any, body: any): Promise<any>;
    deletePharmacy(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    listLab(user: any): Promise<any>;
    upsertLab(user: any, body: any): Promise<any>;
    deleteLab(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    listRadiology(user: any): Promise<any>;
    upsertRadiology(user: any, body: any): Promise<any>;
    deleteRadiology(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    listDoctorSessions(user: any): Promise<any>;
    upsertDoctorSession(user: any, body: any): Promise<any>;
    deleteDoctorSession(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    listHomeCare(user: any): Promise<any>;
    upsertHomeCare(user: any, body: any): Promise<any>;
    deleteHomeCare(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    listZones(user: any): Promise<any>;
    upsertZone(user: any, body: any): Promise<any>;
    deleteZone(user: any, id: string): Promise<{
        ok: boolean;
    }>;
    hasCapabilityFor(provider_account_id: string, requestType: string, payload: any): Promise<{
        ok: boolean;
        matched_items?: any[];
        price?: number;
    }>;
    getZonesFor(provider_account_id: string): Promise<any>;
}
