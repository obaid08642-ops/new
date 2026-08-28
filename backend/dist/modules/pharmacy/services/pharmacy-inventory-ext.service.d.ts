import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { PharmacyLowStockAlertRepository } from "./repositories/pharmacylowstockalert.repository";
export declare class PharmacyInventoryExtService {
    private inv;
    private alerts;
    constructor(inv: PharmacyInventoryItemRepository, alerts: PharmacyLowStockAlertRepository);
    search(user: any, q?: string, barcode?: string): Promise<any>;
    restock(user: any, id: string, qty: number): Promise<any>;
    listLowStockAlerts(user: any): Promise<any>;
    acknowledgeAlert(user: any, id: string): Promise<any>;
    private refreshAlerts;
}
