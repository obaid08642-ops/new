import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { PharmacyOrder } from '../../schemas/pharmacy.schema';
export declare class PharmacyOrderRepository extends MongoRepository<PharmacyOrder> {
    constructor(model: Model<PharmacyOrder>);
}
