import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProfileImageAuditLogDocument } from '../../../../schemas/profile-image-audit-log.schema';
export declare class ProfileImageAuditLogRepository extends MongoRepository<ProfileImageAuditLogDocument> {
    constructor(model: Model<ProfileImageAuditLogDocument>);
}
