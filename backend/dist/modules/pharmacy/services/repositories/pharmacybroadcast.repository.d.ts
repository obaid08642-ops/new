import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { PharmacyBroadcast } from '../../schemas/pharmacy.schema';
export declare class PharmacyBroadcastRepository extends MongoRepository<PharmacyBroadcast> {
    constructor(model: Model<PharmacyBroadcast>);
}
