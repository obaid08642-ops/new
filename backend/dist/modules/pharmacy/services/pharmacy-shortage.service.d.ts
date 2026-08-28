import { DrugShortageFlagRepository } from "./repositories/drugshortageflag.repository";
import { DrugRejectionLogRepository } from "./repositories/drugrejectionlog.repository";
import { MedicineRepository } from "./repositories/medicine.repository";
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
export declare class PharmacyShortageService {
    private flags;
    private rejections;
    private medicines;
    private orders;
    constructor(flags: DrugShortageFlagRepository, rejections: DrugRejectionLogRepository, medicines: MedicineRepository, orders: PharmacyOrderRepository);
    private toObj;
    reportByPharmacy(user: any, body: {
        sku?: string;
        generic_name?: string;
        name_ar?: string;
        dosage?: string;
        form?: string;
        reason?: string;
    }): Promise<any>;
    createByAdmin(user: any, body: {
        sku?: string;
        generic_name?: string;
        name_ar?: string;
        dosage?: string;
        form?: string;
        reason?: string;
    }): Promise<any>;
    approve(user: any, id: string): Promise<any>;
    reject(user: any, id: string, reason?: string): Promise<any>;
    resolve(user: any, id: string): Promise<any>;
    list(user: any, status?: string): Promise<any>;
    lookupForPatient(sku?: string, generic_name?: string): Promise<any>;
    logRejection(medicineId: string, orderId: string, pharmacyId: string): Promise<void>;
    logAcceptance(medicineId: string, orderId: string, pharmacyId: string): Promise<void>;
    adminMarkShortage(user: any, medicineId: string, body: {
        status: 'none' | 'availability_may_be_limited' | 'admin_flagged_shortage';
        notes?: string;
    }): Promise<any>;
    getShortageDashboard(user: any): Promise<any>;
}
