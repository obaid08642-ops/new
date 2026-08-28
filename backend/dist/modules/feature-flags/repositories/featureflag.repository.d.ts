import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { FeatureFlagDocument } from '../../../schemas/feature-flag.schema';
export declare class FeatureFlagRepository extends MongoRepository<FeatureFlagDocument> {
    constructor(model: Model<FeatureFlagDocument>);
}
