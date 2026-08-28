import { Connection, Model } from 'mongoose';
export declare class PharmacyInsuranceDecisionService {
    private readonly connection;
    private readonly orders;
    private readonly offers;
    private readonly allocations;
    private readonly inventory;
    private readonly accounts;
    constructor(connection: Connection, orders: Model<any>, offers: Model<any>, allocations: Model<any>, inventory: Model<any>, accounts: Model<any>);
    private assertSelectedPharmacy;
    private modified;
    private withTransaction;
    private paymentMethod;
    decide(pharmacy: any, orderId: string, body: any): Promise<any>;
    cancelRejectedByPatient(patient: any, orderId: string, idempotencyKey: string): Promise<any>;
}
