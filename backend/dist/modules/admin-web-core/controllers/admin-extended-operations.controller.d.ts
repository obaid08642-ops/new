import { Model, Types } from 'mongoose';
import { ProcurementRequest } from '../schemas/procurement-request.schema';
export declare class AdminExtendedOperationsController {
    private procurementModel;
    constructor(procurementModel: Model<ProcurementRequest>);
    getPendingProcurement(): Promise<{
        data: (import("mongoose").Document<unknown, {}, ProcurementRequest, {}, {}> & ProcurementRequest & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
    issueWarehouseQuotation(procurementId: string, body: {
        pricingItems: any[];
        totalPrice: number;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
