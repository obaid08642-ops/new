import { Model } from 'mongoose';
import { LeaveRequestDocument } from '../../schemas/leave-request.schema';
export declare class LeaveRequestsController {
    private readonly leaveModel;
    constructor(leaveModel: Model<LeaveRequestDocument>);
    getLeaveRequests(facility: any, _: any): Promise<(import("mongoose").FlattenMaps<LeaveRequestDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    createLeaveRequest(user: any, body: {
        facility_id?: string;
        type?: string;
        start_date: string;
        end_date: string;
        reason?: string;
        provider_name?: string;
        provider_type?: string;
    }): Promise<import("../../schemas/leave-request.schema").LeaveRequest & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateLeaveRequest(facility: any, body: {
        id: string;
        action: 'approved' | 'rejected';
        note?: string;
    }): Promise<{
        success: boolean;
        id: any;
        status: string;
    }>;
}
