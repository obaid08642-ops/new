import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { PharmacyInventoryDocument } from '../../../schemas/inventory.schema';
export declare class PharmacyInventoryRepository extends MongoRepository<PharmacyInventoryDocument> {
    constructor(model: Model<PharmacyInventoryDocument>);
}
