import { Model } from 'mongoose';
import { ProviderSession } from '../../schemas';
import { MongoRepository } from '../../../../common/database/mongo.repository';
export declare class ProviderSessionRepository extends MongoRepository<ProviderSession> {
    constructor(model: Model<ProviderSession>);
}
