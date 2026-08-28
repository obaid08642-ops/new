import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { DeliveryDocument } from '../../../schemas/delivery.schema';
export declare class DeliveryRepository extends MongoRepository<DeliveryDocument> {
    constructor(model: Model<DeliveryDocument>);
}
