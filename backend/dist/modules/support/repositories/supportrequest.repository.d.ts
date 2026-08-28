import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { SupportRequest } from '../../../schemas/support.schema';
export declare class SupportRequestRepository extends MongoRepository<SupportRequest> {
    constructor(model: Model<SupportRequest>);
}
