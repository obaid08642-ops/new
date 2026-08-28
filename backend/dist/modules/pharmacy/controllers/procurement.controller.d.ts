import { Model, Types } from 'mongoose';
import { ProcurementRequest } from '../schemas/procurement-request.schema';
import { ProcurementService } from '../services/procurement.service';
import { AiGatewayService } from '../../ai/ai-gateway.service';
import { Medicine } from '../../../schemas/medicine.schema';
export declare class ProcurementController {
    private procurementModel;
    private medicineModel;
    private readonly procurementService;
    private readonly ai;
    constructor(procurementModel: Model<ProcurementRequest>, medicineModel: Model<Medicine>, procurementService: ProcurementService, ai: AiGatewayService);
    createProcurementRequest(user: any, dto: any): Promise<{
        success: boolean;
        procurement_id: Types.ObjectId;
        message: string;
    }>;
    listRequests(user: any): Promise<{
        success: boolean;
        data: (import("mongoose").Document<unknown, {}, ProcurementRequest, {}, {}> & ProcurementRequest & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
    feedback(user: any, id: string, dto: any): Promise<any>;
    analyzeFile(user: any, body: {
        file_base64?: string;
        mime_type?: string;
        text?: string;
    }): Promise<{
        ok: boolean;
        provider: import("../../ai/ai-gateway.service").AiProviderName;
        model: string;
        items: {
            raw_name_string: string;
            requested_quantity: number;
            matched: boolean;
            medicine_id: any;
            medicine_name: any;
            category_group: string;
        }[];
        counts: {
            total: number;
            matched: number;
            medical: number;
            non_medical: number;
        };
    }>;
}
