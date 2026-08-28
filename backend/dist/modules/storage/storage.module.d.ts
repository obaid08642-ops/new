import { Document } from 'mongoose';
import { Model } from 'mongoose';
export declare enum StorageBackend {
    BASE64 = "base64",
    S3 = "s3",
    CLOUDINARY = "cloudinary",
    SUPABASE = "supabase"
}
export declare class StorageObject extends Document {
    id: string;
    backend: StorageBackend;
    mime: string;
    original_name: string;
    size_bytes: number;
    checksum_sha256?: string;
    data_base64?: string;
    external_url?: string;
    external_key?: string;
    owner_account_id: string;
    owner_kind: string;
    visibility: string;
    expires_at?: Date;
    cloudinary?: {
        publicId: string;
        secureUrl: string;
        thumbnailUrl: string;
        width: number;
        height: number;
        size: number;
        format: string;
        version: number;
        createdAt: string;
    };
    deleted: boolean;
}
export declare const StorageObjectSchema: import("mongoose").Schema<StorageObject, Model<StorageObject, any, any, any, Document<unknown, any, StorageObject, any, {}> & StorageObject & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, StorageObject, Document<unknown, {}, import("mongoose").FlatRecord<StorageObject>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<StorageObject> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export interface StorageAdapter {
    put(payload: {
        mime: string;
        data_base64?: string;
        original_name: string;
        customKey?: string;
    }): Promise<{
        backend: StorageBackend;
        external_url?: string;
        external_key?: string;
        data_base64?: string;
    }>;
    get(obj: StorageObject): Promise<{
        mime: string;
        data_base64?: string;
        external_url?: string;
    }>;
    delete(obj: StorageObject): Promise<void>;
}
export declare class StorageService {
    private readonly model;
    private readonly logger;
    private adapter;
    constructor(model: Model<StorageObject>);
    handleDeleteByUrl(payload: {
        url?: string;
    }): Promise<void>;
    upload(input: {
        owner_account_id: string;
        owner_kind?: string;
        mime: string;
        data_base64: string;
        original_name?: string;
        visibility?: 'private' | 'public_read';
        customKey?: string;
        target?: 'r2' | 'cloudinary';
    }): Promise<{
        id: any;
        mime: string;
        size_bytes: number;
        url: string;
        meta: {
            publicId: any;
            secureUrl: any;
            thumbnailUrl: any;
            width: any;
            height: any;
            size: any;
            format: any;
            version: any;
            createdAt: any;
        };
    } | {
        id: any;
        mime: string;
        size_bytes: number;
        url: string;
    }>;
    read(id: string, requester: {
        id: string;
        role?: string;
    }): Promise<{
        mime: string;
        data_base64?: string;
        external_url?: string;
        id: any;
        original_name: string;
        size_bytes: number;
    }>;
    signedUrl(id: string, requester: {
        id: string;
        role?: string;
    }): Promise<{
        url: any;
        expires_in: number;
        kind: string;
    }>;
    private cloudinaryConfigured;
    uploadCloudinary(input: {
        owner_account_id: string;
        owner_kind?: string;
        mime: string;
        data_base64: string;
        original_name?: string;
        visibility?: 'private' | 'public_read';
        customKey?: string;
    }): Promise<{
        id: any;
        mime: string;
        size_bytes: number;
        url: string;
        meta: {
            publicId: any;
            secureUrl: any;
            thumbnailUrl: any;
            width: any;
            height: any;
            size: any;
            format: any;
            version: any;
            createdAt: any;
        };
    }>;
}
export declare class StorageController {
    private readonly svc;
    constructor(svc: StorageService);
    upload(body: any, user: any): Promise<{
        id: any;
        mime: string;
        size_bytes: number;
        url: string;
        meta: {
            publicId: any;
            secureUrl: any;
            thumbnailUrl: any;
            width: any;
            height: any;
            size: any;
            format: any;
            version: any;
            createdAt: any;
        };
    } | {
        id: any;
        mime: string;
        size_bytes: number;
        url: string;
    }>;
    get(id: string, user: any): Promise<{
        mime: string;
        data_base64?: string;
        external_url?: string;
        id: any;
        original_name: string;
        size_bytes: number;
    }>;
    signedUrl(id: string, user: any): Promise<{
        url: any;
        expires_in: number;
        kind: string;
    }>;
    uploadSuggestionImage(body: any, user: any): Promise<{
        id: any;
        mime: string;
        size_bytes: number;
        url: string;
        meta: {
            publicId: any;
            secureUrl: any;
            thumbnailUrl: any;
            width: any;
            height: any;
            size: any;
            format: any;
            version: any;
            createdAt: any;
        };
    } | {
        id: any;
        mime: string;
        size_bytes: number;
        url: string;
    }>;
    uploadCloudinary(): void;
}
export declare class StorageModule {
}
