import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { MeditationSessionDocument } from '../../../schemas/mental-health.schema';
export declare class MeditationSessionRepository extends MongoRepository<MeditationSessionDocument> {
    constructor(model: Model<MeditationSessionDocument>);
}
