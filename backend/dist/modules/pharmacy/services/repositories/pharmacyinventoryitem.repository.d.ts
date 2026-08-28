import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { PharmacyInventoryItem } from '../../../provider/schemas/capabilities.schema';
export declare class PharmacyInventoryItemRepository extends MongoRepository<PharmacyInventoryItem> {
    constructor(model: Model<PharmacyInventoryItem>);
}
