import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { PharmacyChatMessage } from '../../schemas/pharmacy.schema';
export declare class PharmacyChatMessageRepository extends MongoRepository<PharmacyChatMessage> {
    constructor(model: Model<PharmacyChatMessage>);
}
