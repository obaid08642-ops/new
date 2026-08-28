import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { ExerciseLogDocument } from '../../../schemas/nutrition.schema';
export declare class ExerciseLogRepository extends MongoRepository<ExerciseLogDocument> {
    constructor(model: Model<ExerciseLogDocument>);
}
