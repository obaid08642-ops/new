import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { CallMetricDocument } from '../../../schemas/callmetric.schema';
export declare class CallMetricRepository extends MongoRepository<CallMetricDocument> {
    constructor(model: Model<CallMetricDocument>);
}
