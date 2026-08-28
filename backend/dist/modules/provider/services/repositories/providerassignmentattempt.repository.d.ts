import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderAssignmentAttempt } from '../../schemas';
export declare class ProviderAssignmentAttemptRepository extends MongoRepository<ProviderAssignmentAttempt> {
    constructor(model: Model<ProviderAssignmentAttempt>);
}
