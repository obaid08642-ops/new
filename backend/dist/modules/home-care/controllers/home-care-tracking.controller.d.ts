import { Connection, Model, Types } from 'mongoose';
import { HomeCareBooking } from '../../../schemas/home-care.schema';
import { MedicalSupplyRequest } from '../schemas/medical-supply-request.schema';
export declare class HomeCareTrackingController {
    private supplyModel;
    private bookingModel;
    private connection;
    constructor(supplyModel: Model<MedicalSupplyRequest>, bookingModel: Model<HomeCareBooking>, connection: Connection);
    private isAdmin;
    private userDocumentId;
    private assignedBooking;
    verifyAttendance(bookingId: string, body: {
        nurseLat: number;
        nurseLng: number;
    }, user: any): Promise<{
        success: boolean;
        distance_meters: number;
        message: string;
    }>;
    requestSupplies(dto: any, user: any): Promise<{
        success: boolean;
        request_id: Types.ObjectId;
        message: string;
    }>;
}
