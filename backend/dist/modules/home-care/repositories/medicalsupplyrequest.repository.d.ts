import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { MedicalSupplyRequest } from '../../../schemas/home-care.schema';
export declare class MedicalSupplyRequestRepository extends MongoRepository<MedicalSupplyRequest> {
    constructor(model: Model<MedicalSupplyRequest>);
}
