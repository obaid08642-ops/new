import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderAvailability } from '../../schemas/requests.schema';
type ProviderAvailabilityDocument = ProviderAvailability & import('mongoose').Document;
export declare class ProviderAvailabilityRepository extends MongoRepository<ProviderAvailabilityDocument> {
    constructor(model: Model<ProviderAvailabilityDocument>);
}
export {};
