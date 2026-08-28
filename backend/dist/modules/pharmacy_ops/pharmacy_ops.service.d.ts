export declare class PharmacyOpsService {
    private unavailable;
    incoming(_pharmacy: any): never;
    preparing(_pharmacy: any): never;
    ready(_pharmacy: any): never;
    completed(_pharmacy: any): never;
    refillOrders(_pharmacy: any): never;
    basketReview(_pharmacy: any): never;
    awaitingApproval(_pharmacy: any): never;
    getInventory(_pharmacy: any): never;
    updateStock(_pharmacy: any, _medicineId: string, _stockQty: number, _available?: boolean): never;
    addMedicineToInventory(_pharmacy: any, _body: any): never;
    orderDetail(_pharmacy: any, _id: string): never;
    markItemUnavailable(_pharmacy: any, _id: string, _idx: number): never;
    restoreItem(_pharmacy: any, _id: string, _idx: number): never;
    updateItemQty(_pharmacy: any, _id: string, _idx: number, _qty: number): never;
    substituteItem(_pharmacy: any, _id: string, _idx: number, _body: any): never;
    submitBasket(_pharmacy: any, _id: string, _note?: string): never;
    patientApproveBasket(_patient: any, _id: string): never;
    patientRejectBasket(_patient: any, _id: string, _reason?: string): never;
    setInsuranceStatus(_pharmacy: any, _id: string, _status: any, _reason?: string): never;
}
