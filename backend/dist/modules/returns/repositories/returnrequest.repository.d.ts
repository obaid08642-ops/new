import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { ReturnRequest } from '../../../schemas/returns.schema';
export declare class ReturnRequestRepository extends MongoRepository<ReturnRequest> {
    constructor(model: Model<ReturnRequest>);
}
