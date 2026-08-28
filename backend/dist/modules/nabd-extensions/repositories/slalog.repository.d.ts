import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { SlaLogDocument } from '../../../schemas/sla-log.schema';
export declare class SlaLogRepository extends MongoRepository<SlaLogDocument> {
    constructor(model: Model<SlaLogDocument>);
}
