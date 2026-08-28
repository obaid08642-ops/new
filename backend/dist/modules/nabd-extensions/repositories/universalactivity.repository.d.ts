import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { UniversalActivityDocument } from '../../../schemas/universal-activity.schema';
export declare class UniversalActivityRepository extends MongoRepository<UniversalActivityDocument> {
    constructor(model: Model<UniversalActivityDocument>);
}
