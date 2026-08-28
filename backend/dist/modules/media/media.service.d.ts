export declare class MediaService {
    private readonly logger;
    private s3Client;
    private bucketName;
    private configured;
    constructor();
    private assertConfigured;
    uploadBuffer(buffer: Buffer, originalName: string, mimeType: string, folder?: string): Promise<{
        key: string;
    }>;
    generatePresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
    generatePresignedUploadUrl(originalName: string, mimeType: string, folder?: string, expiresIn?: number): Promise<{
        uploadUrl: string;
        key: string;
    }>;
    deleteFile(key: string): Promise<void>;
}
