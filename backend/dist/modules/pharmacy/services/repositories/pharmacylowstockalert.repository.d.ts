import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { PharmacyLowStockAlert } from '../../schemas/pharmacy.schema';
export declare class PharmacyLowStockAlertRepository extends MongoRepository<PharmacyLowStockAlert> {
    constructor(model: Model<PharmacyLowStockAlert>);
}
