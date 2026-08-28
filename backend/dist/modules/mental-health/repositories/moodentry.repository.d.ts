import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { MoodEntryDocument } from '../../../schemas/mental-health.schema';
export declare class MoodEntryRepository extends MongoRepository<MoodEntryDocument> {
    constructor(model: Model<MoodEntryDocument>);
}
