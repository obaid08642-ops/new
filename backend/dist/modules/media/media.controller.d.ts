import { Connection, Model } from 'mongoose';
import { MediaService } from './media.service';
import { MediaAssetDocument, MediaPurpose } from './media.schema';
export declare class MediaController {
    private readonly mediaService;
    private readonly assets;
    private readonly connection;
    constructor(mediaService: MediaService, assets: Model<MediaAssetDocument>, connection: Connection);
    uploadFile(user: any, file: Express.Multer.File, purpose: MediaPurpose, threadId?: string): Promise<{
        id: any;
        purpose: any;
        thread_id: any;
    }>;
    getPresignedUrl(user: any, filename: string, mimetype: string, purpose: MediaPurpose, threadId?: string): Promise<{
        id: any;
        upload_url: string;
        expires_in: number;
    }>;
    signedUrl(user: any, id: string): Promise<{
        url: string;
        expires_in: number;
    }>;
    private assertUploadAllowed;
    private canReadAsset;
    private verifyChatUploadAllowed;
    deleteFile(key: string | string[]): Promise<{
        success: boolean;
    }>;
}
