import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { PharmacyChatThread } from '../../schemas/pharmacy.schema';
export declare class PharmacyChatThreadRepository extends MongoRepository<PharmacyChatThread> {
    constructor(model: Model<PharmacyChatThread>);
}
