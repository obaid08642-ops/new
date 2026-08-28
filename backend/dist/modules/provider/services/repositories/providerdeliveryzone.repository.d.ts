import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderDeliveryZone } from '../../schemas';
export declare class ProviderDeliveryZoneRepository extends MongoRepository<ProviderDeliveryZone> {
    constructor(model: Model<ProviderDeliveryZone>);
}
