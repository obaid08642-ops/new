import { Document } from 'mongoose';
export declare const MEDIA_PURPOSES: readonly ["order_prescription", "chat", "avatar", "report"];
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];
export declare class MediaAsset {
    id: string;
    key: string;
    owner_id: string;
    purpose: MediaPurpose;
    thread_id?: string;
    original_name?: string;
    mime_type?: string;
    size_bytes?: number;
}
export type MediaAssetDocument = MediaAsset & Document;
export declare const MediaAssetSchema: import("mongoose").Schema<MediaAsset, import("mongoose").Model<MediaAsset, any, any, any, Document<unknown, any, MediaAsset, any, {}> & MediaAsset & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MediaAsset, Document<unknown, {}, import("mongoose").FlatRecord<MediaAsset>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MediaAsset> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
