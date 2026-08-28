import { StorageService } from '../../storage/storage.module';
import { ProfileImageMetadataRepository } from "./repositories/profileimagemetadata.repository";
import { ImageProcessingJobRepository } from "./repositories/imageprocessingjob.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProfileImageAuditLogRepository } from "./repositories/profileimageauditlog.repository";
export declare class ProviderImageProcessorService {
    private readonly metadataModel;
    private readonly jobModel;
    private readonly profileModel;
    private readonly auditLogModel;
    private readonly storage;
    private readonly logger;
    constructor(metadataModel: ProfileImageMetadataRepository, jobModel: ImageProcessingJobRepository, profileModel: ProviderAccountProfileRepository, auditLogModel: ProfileImageAuditLogRepository, storage: StorageService);
    enqueueJob(input: {
        owner_id: string;
        owner_type: 'doctor' | 'nurse';
        data_base64: string;
        mime: string;
        original_name: string;
    }): Promise<{
        ok: boolean;
        jobId: any;
        status: string;
    }>;
    getStatus(ownerId: string): Promise<{
        owner_id: any;
        owner_type: any;
        originalImageUrl: any;
        processedImageUrl: any;
        mediumImageUrl: any;
        thumbnailImageUrl: any;
        hasTransparentBackground: any;
        processingStatus: any;
        processingProvider: any;
        lastProcessedAt: any;
        error: any;
    }>;
    processPendingJobs(): Promise<void>;
    private processImage;
    reprocessImage(ownerId: string): Promise<{
        ok: boolean;
        status: string;
    }>;
    replaceImage(ownerId: string, base64: string, mime: string): Promise<{
        ok: boolean;
        status: string;
    }>;
    retryFailedJobs(ownerId: string): Promise<{
        ok: boolean;
        retriedCount: any;
    }>;
    getImageLogs(ownerId: string): Promise<any>;
}
