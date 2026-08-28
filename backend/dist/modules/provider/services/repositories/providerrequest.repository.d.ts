import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderRequest } from '../../schemas';
export declare class ProviderRequestRepository extends MongoRepository<ProviderRequest> {
    constructor(model: Model<ProviderRequest>);
}
