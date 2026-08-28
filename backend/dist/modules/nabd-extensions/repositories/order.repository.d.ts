import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { OrderDocument } from '../../../schemas/order.schema';
export declare class OrderRepository extends MongoRepository<OrderDocument> {
    constructor(model: Model<OrderDocument>);
}
