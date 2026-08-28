import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { ProviderProfileDocument } from '../../../schemas/provider-profile.schema';
export declare class ProviderProfileRepository extends MongoRepository<ProviderProfileDocument> {
    constructor(model: Model<ProviderProfileDocument>);
}
