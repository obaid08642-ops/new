import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { PharmacyAllocation } from '../../schemas/pharmacy.schema';
export declare class PharmacyAllocationRepository extends MongoRepository<PharmacyAllocation> {
    constructor(model: Model<PharmacyAllocation>);
}
