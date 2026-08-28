import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { NutritionProfileDocument } from '../../../schemas/nutrition.schema';
export declare class NutritionProfileRepository extends MongoRepository<NutritionProfileDocument> {
    constructor(model: Model<NutritionProfileDocument>);
}
