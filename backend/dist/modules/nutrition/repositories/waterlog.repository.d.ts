import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { WaterLogDocument } from '../../../schemas/nutrition.schema';
export declare class WaterLogRepository extends MongoRepository<WaterLogDocument> {
    constructor(model: Model<WaterLogDocument>);
}
