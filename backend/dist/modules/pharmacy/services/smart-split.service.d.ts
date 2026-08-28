import { GeoEngineService } from '../../provider/services/geo-engine.service';
import { PharmacyAllocation, PharmacyOrder } from '../schemas/pharmacy.schema';
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";
import { ProviderScoreSnapshotRepository } from "./repositories/providerscoresnapshot.repository";
export declare class SmartSplitService {
    private orders;
    private allocs;
    private inv;
    private profiles;
    private avails;
    private scores;
    private geo;
    private logger;
    constructor(orders: PharmacyOrderRepository, allocs: PharmacyAllocationRepository, inv: PharmacyInventoryItemRepository, profiles: ProviderAccountProfileRepository, avails: ProviderAvailabilityRepository, scores: ProviderScoreSnapshotRepository, geo: GeoEngineService);
    runForOrder(orderId: string): Promise<PharmacyOrder>;
    private findCandidatePharmacies;
    private buildCoverageMatrix;
    private findBestMatch;
    private scoreCandidates;
    private greedyCover;
    runWithMatrix(orderId: string): Promise<PharmacyOrder>;
    private reserveStock;
    releaseStockForAllocation(alloc: PharmacyAllocation): Promise<void>;
    private releasePreviousAllocations;
}
