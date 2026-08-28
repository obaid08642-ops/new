import { Document } from 'mongoose';
export declare class ProfileImageMetadata extends Document {
    owner_id: string;
    owner_type: string;
    originalImageUrl: string;
    processedImageUrl?: string;
    mediumImageUrl?: string;
    thumbnailImageUrl?: string;
    hasTransparentBackground: boolean;
    processingStatus: string;
    processingProvider: string;
    lastProcessedAt?: Date;
    error?: string;
}
export type ProfileImageMetadataDocument = ProfileImageMetadata & Document;
export declare const ProfileImageMetadataSchema: import("mongoose").Schema<ProfileImageMetadata, import("mongoose").Model<ProfileImageMetadata, any, any, any, Document<unknown, any, ProfileImageMetadata, any, {}> & ProfileImageMetadata & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProfileImageMetadata, Document<unknown, {}, import("mongoose").FlatRecord<ProfileImageMetadata>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ProfileImageMetadata> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
