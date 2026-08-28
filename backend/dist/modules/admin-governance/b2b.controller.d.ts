import { Model } from 'mongoose';
import { B2BRequestDocument } from '../../schemas/b2b-request.schema';
export declare class B2BController {
    private readonly b2bModel;
    constructor(b2bModel: Model<B2BRequestDocument>);
    list(): Promise<(import("mongoose").FlattenMaps<B2BRequestDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    approve(id: string, body?: {
        note?: string;
    }): Promise<import("../../schemas/b2b-request.schema").B2BRequest & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    reject(id: string, body?: {
        note?: string;
    }): Promise<import("../../schemas/b2b-request.schema").B2BRequest & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
