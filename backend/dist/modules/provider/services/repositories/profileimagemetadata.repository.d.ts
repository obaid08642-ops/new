import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProfileImageMetadataDocument } from '../../../../schemas/profile-image-metadata.schema';
export declare class ProfileImageMetadataRepository extends MongoRepository<ProfileImageMetadataDocument> {
    constructor(model: Model<ProfileImageMetadataDocument>);
}
