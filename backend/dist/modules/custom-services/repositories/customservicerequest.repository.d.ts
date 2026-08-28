import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { CustomServiceRequest } from '../../../schemas/custom-service.schema';
export declare class CustomServiceRequestRepository extends MongoRepository<CustomServiceRequest> {
    constructor(model: Model<CustomServiceRequest>);
}
