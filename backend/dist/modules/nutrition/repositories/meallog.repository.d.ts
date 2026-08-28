import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { MealLogDocument } from '../../../schemas/nutrition.schema';
export declare class MealLogRepository extends MongoRepository<MealLogDocument> {
    constructor(model: Model<MealLogDocument>);
}
