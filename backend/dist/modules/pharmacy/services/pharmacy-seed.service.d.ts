import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";
export declare class PharmacySeedService {
    private orders;
    private inv;
    private accounts;
    private profiles;
    private avails;
    constructor(orders: PharmacyOrderRepository, inv: PharmacyInventoryItemRepository, accounts: ProviderAccountRepository, profiles: ProviderAccountProfileRepository, avails: ProviderAvailabilityRepository);
    private assertTestSeedAllowed;
    seed(user: any): Promise<{
        ok: boolean;
        pharmacies: any[];
    }>;
    seedSampleOrder(patient_account_id: string): Promise<any>;
}
