import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { DrugRejectionLogDocument } from '../../../../schemas/drug-rejection-log.schema';
export declare class DrugRejectionLogRepository extends MongoRepository<DrugRejectionLogDocument> {
    constructor(model: Model<DrugRejectionLogDocument>);
}
