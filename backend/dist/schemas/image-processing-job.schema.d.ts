import { Document } from 'mongoose';
export declare class ImageProcessingJob extends Document {
    owner_id: string;
    owner_type: string;
    data_base64: string;
    mime: string;
    original_name: string;
    status: string;
    attempts: number;
    error?: string;
    processedAt?: Date;
}
export type ImageProcessingJobDocument = ImageProcessingJob & Document;
export declare const ImageProcessingJobSchema: import("mongoose").Schema<ImageProcessingJob, import("mongoose").Model<ImageProcessingJob, any, any, any, Document<unknown, any, ImageProcessingJob, any, {}> & ImageProcessingJob & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ImageProcessingJob, Document<unknown, {}, import("mongoose").FlatRecord<ImageProcessingJob>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ImageProcessingJob> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
